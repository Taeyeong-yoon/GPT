"""
validate.py — NekoMaster JLPT 데이터 검증
실행: python scripts/validate.py
"""
import json
import os
import sys

OUT = r"C:\Users\User7\Desktop\nekomaster\src\data\jlpt"
LEVELS = ["N5", "N4", "N3", "N2", "N1"]
SECTIONS = ["vocabulary", "grammar", "reading", "listening"]

fatal_errors = 0
all_ids = set()

def check(cond, msg, level, item_id=""):
    global fatal_errors
    if not cond:
        fatal_errors += 1
        tag = f"[{level}] {item_id}" if item_id else f"[{level}]"
        print(f"  ❌ {tag}: {msg}")

print("=== NekoMaster JLPT 데이터 검증 ===\n")

for level in LEVELS:
    path = os.path.join(OUT, f"{level.lower()}.json")
    if not os.path.exists(path):
        print(f"[{level}] ❌ 파일 없음: {path}")
        fatal_errors += 1
        continue

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    sections = data.get("sections", {})
    warn = 0
    ok = 0

    for section in SECTIONS:
        items = sections.get(section, [])
        if len(items) == 0:
            print(f"  ⚠️  [{level}] {section}: 문항 0개")
            warn += 1
            continue

        for item in items:
            iid = item.get("id", "?")

            # id 중복 전체 레벨 간 확인
            if iid in all_ids:
                check(False, f"id 중복: {iid}", level, iid)
            else:
                all_ids.add(iid)

            # choices 4개
            choices = item.get("choices", [])
            check(len(choices) == 4, f"choices {len(choices)}개 (4개 필요)", level, iid)

            # correctIndex 범위
            ci = item.get("correctIndex", -1)
            check(0 <= ci <= 3, f"correctIndex={ci} 범위 오류", level, iid)

            # question 비어있으면 안 됨 (listening 제외하지 않음)
            q = item.get("question", "")
            check(bool(q.strip()), "question 비어있음", level, iid)

            # listening: ttsText 필수
            if section == "listening":
                tts = item.get("ttsText", "")
                check(bool(tts and tts.strip()), "listening ttsText 없음", level, iid)

            ok += 1

    meta = data.get("meta", {})
    total = sum(meta.get(f"{s}_count", 0) for s in SECTIONS)
    print(f"  [{level}] vocab={meta.get('vocabulary_count',0):>4} | "
          f"grammar={meta.get('grammar_count',0):>4} | "
          f"reading={meta.get('reading_count',0):>4} | "
          f"listening={meta.get('listening_count',0):>4} | "
          f"합계={total:>5} | 경고={warn}")

print()
print(f"=== 검증 결과: 치명적 오류 {fatal_errors}개 ===")
if fatal_errors > 0:
    print("❌ 오류 수정 후 convert.py 재실행 필요")
    sys.exit(1)
else:
    print("✅ 모든 검증 통과")
