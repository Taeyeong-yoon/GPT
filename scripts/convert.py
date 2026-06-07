"""
convert.py — 네코짱 JSON → NekoMaster 형식 변환
실행: python scripts/convert.py
출력: src/data/jlpt/n5.json ~ n1.json
"""
import json
import os
import random
from datetime import date
from collections import defaultdict, Counter

# ── 경로 상수 ─────────────────────────────────────────────────────
BASE = r"C:\Users\User7\Desktop\JLPT\jlpt_app\assets\content"
OUT  = r"C:\Users\User7\Desktop\nekomaster\src\data\jlpt"

PROBLEMS_DIR = os.path.join(BASE, "problems")
LISTENING_FILE = os.path.join(BASE, "listening", "listening_problems.json")

# ── subType → section 매핑 ───────────────────────────────────────
VOCAB_SUBTYPES = {
    "vocab_n5_meaning", "vocab_n4_meaning", "vocab_n3_meaning",
    "vocab_n2_meaning", "vocab_n1_meaning",
    "vocab_n5_context", "vocab_n4_context", "vocab_n3_context",
    "vocab_n2_context", "vocab_n1_context",
    "kanji_n5_reading", "kanji_n4_reading", "kanji_n3_reading",
    "kanji_n2_reading", "kanji_n1_reading",
    "hiragana_reading",
}
GRAMMAR_SUBTYPES = {
    "grammar_pattern", "tense_basic", "particles_basic", "particles_advanced",
}
LISTENING_SUBTYPES = {
    "listening_n5_basic", "listening_conversation", "listening_task",
    "listening_n3_monologue", "listening_n3_instant",
    "listening_n2_task", "listening_n2_monologue", "listening_n2_instant",
    "listening_n1_task", "listening_n1_monologue", "listening_n1_instant",
}

LEVELS = ["N5", "N4", "N3", "N2", "N1"]

# ── 출력 스키마 변환 ──────────────────────────────────────────────
def to_item(raw, section):
    return {
        "id":          raw["id"],
        "section":     section,
        "subType":     raw.get("subType", ""),
        "question":    raw.get("question", ""),
        "ttsText":     raw.get("ttsText") if section == "listening" else None,
        "choices":     raw.get("choices", []),
        "correctIndex": raw.get("correctIndex", 0),
        "explanation": raw.get("explanation", ""),
    }

# ── 파일 로드 헬퍼 ───────────────────────────────────────────────
def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"  ⚠️  로드 실패 ({os.path.basename(path)}): {e}")
        return []

# ── 전체 문제 수집 ───────────────────────────────────────────────
def collect_all_problems():
    all_items = defaultdict(lambda: defaultdict(list))  # [level][section]
    warn_count = 0

    # problems/ 폴더
    for fname in sorted(os.listdir(PROBLEMS_DIR)):
        if not fname.endswith(".json"):
            continue
        data = load_json(os.path.join(PROBLEMS_DIR, fname))
        for raw in data:
            if not raw.get("isActive", True):
                continue
            if len(raw.get("choices", [])) != 4:
                warn_count += 1
                continue

            level   = raw.get("level", "")
            subtype = raw.get("subType", "")

            if level not in LEVELS:
                warn_count += 1
                continue

            if subtype in VOCAB_SUBTYPES:
                all_items[level]["vocabulary"].append(to_item(raw, "vocabulary"))
            elif subtype in GRAMMAR_SUBTYPES:
                all_items[level]["grammar"].append(to_item(raw, "grammar"))
            # listening은 아래서 별도 처리

    # listening/ 파일
    listening_data = load_json(LISTENING_FILE)
    for raw in listening_data:
        if not raw.get("isActive", True):
            continue
        if not raw.get("ttsText"):
            continue
        if len(raw.get("choices", [])) != 4:
            warn_count += 1
            continue

        level   = raw.get("level", "")
        subtype = raw.get("subType", "")

        if level not in LEVELS:
            warn_count += 1
            continue

        if subtype in LISTENING_SUBTYPES or subtype in {"listening_conversation", "listening_task"}:
            all_items[level]["listening"].append(to_item(raw, "listening"))

    return all_items, warn_count

# ── reading 섹션 (grammar 고난이도 대체) ─────────────────────────
def make_reading_section(grammar_items, used_for_grammar_ids, target=50):
    """
    MVP: grammar_pattern difficulty>=3 문항을 reading으로 대체.
    grammar에 이미 쓰인 id와 중복되지 않도록 분리.
    """
    candidates = [
        item for item in grammar_items
        if item["subType"] == "grammar_pattern"
        and item["id"] not in used_for_grammar_ids
    ]
    # difficulty 높은 순 정렬 (원본에서 difficulty 정보 없으니 id 기준 섞기)
    random.seed(42)
    random.shuffle(candidates)
    reading = []
    for item in candidates[:target]:
        r = dict(item)
        r["section"] = "reading"
        reading.append(r)
    return reading

# ── 레벨별 JSON 생성 ─────────────────────────────────────────────
def build_level_json(level, items):
    vocab_all    = items.get("vocabulary", [])
    grammar_all  = items.get("grammar",    [])
    listening_all= items.get("listening",  [])

    random.seed(42)

    # grammar_pattern 과 나머지 분리
    grammar_non_gp = [i for i in grammar_all if i["subType"] != "grammar_pattern"]
    grammar_gp     = [i for i in grammar_all if i["subType"] == "grammar_pattern"]

    random.shuffle(grammar_gp)

    # grammar_pattern을 절반씩 grammar/reading으로 분배
    split = max(1, len(grammar_gp) // 2)
    gp_for_grammar = grammar_gp[:split]
    gp_for_reading = grammar_gp[split:]

    # grammar 섹션: tense/particles + grammar_pattern 절반
    grammar_section  = grammar_non_gp + gp_for_grammar
    grammar_used_ids = {i["id"] for i in grammar_section}

    # reading 섹션: grammar_pattern 나머지 절반
    reading_section = []
    for item in gp_for_reading:
        r = dict(item)
        r["section"] = "reading"
        reading_section.append(r)

    return {
        "level": level,
        "sections": {
            "vocabulary": vocab_all,
            "grammar":    grammar_section,
            "reading":    reading_section,
            "listening":  listening_all,
        },
        "meta": {
            "vocabulary_count": len(vocab_all),
            "grammar_count":    len(grammar_section),
            "reading_count":    len(reading_section),
            "listening_count":  len(listening_all),
            "generated_at":     str(date.today()),
            "reading_note":     "MVP: grammar_pattern(고난이도) 문항으로 대체. 추후 실제 독해 지문+질문으로 교체 예정."
        }
    }

# ── 메인 ─────────────────────────────────────────────────────────
def main():
    os.makedirs(OUT, exist_ok=True)

    print("=== 네코짱 → NekoMaster 데이터 변환 ===\n")
    print("📂 입력:", BASE)
    print("📂 출력:", OUT)
    print()

    all_items, warn_count = collect_all_problems()

    # 레벨별 JSON 저장
    print(f"{'레벨':>4} | {'vocab':>7} | {'grammar':>8} | {'reading':>8} | {'listening':>10} | {'합계':>6}")
    print("-" * 58)

    for level in LEVELS:
        items = all_items[level]
        result = build_level_json(level, items)

        out_path = os.path.join(OUT, f"{level.lower()}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        m = result["meta"]
        total = m["vocabulary_count"] + m["grammar_count"] + m["reading_count"] + m["listening_count"]
        print(f"  {level:>2} | {m['vocabulary_count']:>7} | {m['grammar_count']:>8} | {m['reading_count']:>8} | {m['listening_count']:>10} | {total:>6}")

    print("-" * 58)
    print(f"\n✅ 변환 완료. 경고 건수: {warn_count}개")
    print(f"📁 출력 파일: {OUT}")
    print("\n⚠️  reading 섹션 = grammar_pattern MVP 대체 (추후 실제 독해 지문으로 교체 필요)")

if __name__ == "__main__":
    main()
