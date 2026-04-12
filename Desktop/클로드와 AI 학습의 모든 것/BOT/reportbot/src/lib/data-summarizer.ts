/**
 * data-summarizer.ts
 *
 * 고객이 수만 줄 CSV를 올려도 전체 데이터를 분석한 리포트를 만들어주는 모듈.
 *
 * 전략:
 *  - 소규모(≤2,000행): 전체 행을 그대로 전송
 *  - 대규모(>2,000행): 계층별 대표 샘플링 (stratified sampling)
 *    → 각 카테고리/그룹에서 비율대로 샘플을 뽑아 전체 패턴 보존
 *    → 전체 통계(합계·평균·분포)는 100% 계산하여 함께 전달
 *  - 전송 포맷은 CSV 텍스트 (JSON 대비 토큰 ~5배 절약)
 *
 * 결과: Claude는 전체 50,000행의 패턴·통계를 기반으로 리포트를 작성
 */

type RawData = {
  headers: string[];
  rows: string[][];
};

type ColStats = {
  column: string;
  type: "numeric" | "category" | "date" | "text";
  // numeric
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  median?: number;
  // category
  uniqueCount?: number;
  distribution?: { value: string; count: number; pct: string }[];
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────

function parseNum(val: string): number | null {
  const c = val
    .replace(/[,，\s]/g, "")
    .replace(/[%％]/g, "")
    .replace(/[₩$€£¥]/g, "")
    .replace(/만원$/, "0000")
    .replace(/[원천억만]/g, "")
    .trim();
  const n = Number(c);
  return isNaN(n) || c === "" ? null : n;
}

function isNumericCol(sample: string[]): boolean {
  const nonEmpty = sample.filter((v) => v !== "");
  if (nonEmpty.length === 0) return false;
  return nonEmpty.filter((v) => parseNum(v) !== null).length / nonEmpty.length >= 0.6;
}

function isDateCol(sample: string[]): boolean {
  const dateRe = /^\d{4}[-./]\d{1,2}([-./]\d{1,2})?$/;
  const nonEmpty = sample.filter((v) => v !== "");
  return nonEmpty.filter((v) => dateRe.test(v.trim())).length / nonEmpty.length >= 0.7;
}

function isCategoryCol(uniqueCount: number, totalCount: number): boolean {
  const ratio = uniqueCount / totalCount;
  return ratio < 0.25 && uniqueCount <= 200;
}

function medianOf(sorted: number[]): number {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function fmt(n: number): string {
  return n % 1 === 0 ? n.toLocaleString() : (Math.round(n * 100) / 100).toLocaleString();
}

// ─── 전체 통계 계산 (100% 행 기반) ───────────────────────────────────────

function calcColStats(headers: string[], rows: string[]): ColStats[] {
  const totalRows = rows.length;
  // rows가 string[] (CSV lines) 형태로 왔다고 가정 — 실제는 string[][]
  return [];
}

function calcStats(headers: string[], rows: string[][]): ColStats[] {
  return headers.map((header, ci) => {
    const values = rows.map((r) => (r[ci] ?? "").trim());
    const nonEmpty = values.filter((v) => v !== "");

    if (isDateCol(nonEmpty.slice(0, 100))) {
      const uniqueDates = new Set(nonEmpty);
      return {
        column: header,
        type: "date" as const,
        uniqueCount: uniqueDates.size,
        distribution: [],
      };
    }

    if (isNumericCol(nonEmpty.slice(0, 200))) {
      const nums = nonEmpty.map(parseNum).filter((n): n is number => n !== null).sort((a, b) => a - b);
      if (nums.length === 0) return { column: header, type: "numeric" as const };
      const sum = nums.reduce((a, b) => a + b, 0);
      return {
        column: header,
        type: "numeric" as const,
        sum: Math.round(sum * 100) / 100,
        avg: Math.round((sum / nums.length) * 100) / 100,
        min: nums[0],
        max: nums[nums.length - 1],
        median: Math.round(medianOf(nums) * 100) / 100,
      };
    }

    const uniqueCount = new Set(nonEmpty).size;
    if (isCategoryCol(uniqueCount, nonEmpty.length)) {
      const freq = new Map<string, number>();
      nonEmpty.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
      const distribution = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([value, count]) => ({
          value,
          count,
          pct: ((count / nonEmpty.length) * 100).toFixed(1) + "%",
        }));
      return { column: header, type: "category" as const, uniqueCount, distribution };
    }

    return { column: header, type: "text" as const, uniqueCount: new Set(nonEmpty).size };
  });
}

// ─── 계층별 대표 샘플링 ────────────────────────────────────────────────────

/**
 * 카테고리 컬럼을 기준으로 각 그룹에서 비율대로 샘플링.
 * 특정 카테고리가 과소/과다 대표되지 않도록 보장.
 */
function stratifiedSample(
  headers: string[],
  rows: string[][],
  targetCount: number,
  stats: ColStats[],
): string[][] {
  // 첫 번째 카테고리 컬럼 찾기
  const catStatIdx = stats.findIndex((s) => s.type === "category" && (s.uniqueCount ?? 0) >= 2);

  if (catStatIdx === -1) {
    // 카테고리 컬럼 없으면 균등 간격 샘플링
    const step = Math.max(1, Math.floor(rows.length / targetCount));
    return rows.filter((_, i) => i % step === 0).slice(0, targetCount);
  }

  // 카테고리별로 그룹 분류
  const groupMap = new Map<string, string[][]>();
  rows.forEach((row) => {
    const key = (row[catStatIdx] ?? "").trim() || "(기타)";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  });

  const result: string[][] = [];
  const groups = Array.from(groupMap.entries());

  groups.forEach(([, groupRows]) => {
    // 각 그룹에서 비율에 맞게 샘플
    const quota = Math.max(1, Math.round((groupRows.length / rows.length) * targetCount));
    const step = Math.max(1, Math.floor(groupRows.length / quota));
    const sampled = groupRows.filter((_, i) => i % step === 0).slice(0, quota);
    result.push(...sampled);
  });

  // 목표 수보다 많으면 균등하게 다시 자르기
  if (result.length > targetCount * 1.1) {
    const step = Math.floor(result.length / targetCount);
    return result.filter((_, i) => i % step === 0).slice(0, targetCount);
  }

  return result;
}

// ─── CSV 텍스트 포맷 변환 (JSON보다 토큰 ~5배 절약) ──────────────────────

function toCsvText(headers: string[], rows: string[][]): string {
  const escape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return lines.join("\n");
}

// ─── 통계 요약 텍스트 (Claude 프롬프트에 추가) ───────────────────────────

function buildStatsSummary(headers: string[], rows: string[][], stats: ColStats[]): string {
  const lines: string[] = [`총 ${rows.length.toLocaleString()}행 × ${headers.length}컬럼`];

  const numStats = stats.filter((s) => s.type === "numeric" && s.sum !== undefined);
  if (numStats.length > 0) {
    lines.push("\n[수치 컬럼 전체 통계]");
    numStats.forEach((s) => {
      lines.push(`• ${s.column}: 합계 ${fmt(s.sum!)}, 평균 ${fmt(s.avg!)}, 최소 ${fmt(s.min!)}, 최대 ${fmt(s.max!)}, 중앙값 ${fmt(s.median!)}`);
    });
  }

  const catStats = stats.filter((s) => s.type === "category" && s.distribution?.length);
  if (catStats.length > 0) {
    lines.push("\n[카테고리 분포 — 전체 데이터 기준]");
    catStats.forEach((s) => {
      lines.push(`• ${s.column} (고유값 ${s.uniqueCount}개):`);
      s.distribution!.slice(0, 10).forEach((d) => {
        lines.push(`  - ${d.value}: ${d.count.toLocaleString()}건 (${d.pct})`);
      });
    });
  }

  return lines.join("\n");
}

// ─── 메인 export ──────────────────────────────────────────────────────────

const FULL_DATA_THRESHOLD = 2_000;   // 이하: 전체 행 전송
const SAMPLE_TARGET       = 800;     // 초과 시: 계층 샘플링 목표 행수

export type ClaudeDataPayload = {
  analysisNote: string;
  fullStatistics: string;
  columnStats: ColStats[];
  dataCsv: string;
};

export function buildClaudeDataPayload(data: {
  headers: string[];
  rows: string[][];
}): ClaudeDataPayload {
  const { headers, rows } = data;

  // 1. 전체 데이터 기반 100% 통계 계산
  const stats = calcStats(headers, rows);
  const fullStatistics = buildStatsSummary(headers, rows, stats);

  // 2. Claude에 전달할 행 결정
  let analysisRows: string[][];
  let analysisNote: string;

  if (rows.length <= FULL_DATA_THRESHOLD) {
    analysisRows = rows;
    analysisNote = `전체 ${rows.length.toLocaleString()}행 데이터를 분석합니다.`;
  } else {
    analysisRows = stratifiedSample(headers, rows, SAMPLE_TARGET, stats);
    analysisNote =
      `전체 ${rows.length.toLocaleString()}행 데이터에서 계층별 대표 샘플 ${analysisRows.length}행을 추출했습니다. ` +
      `위의 전체 통계(합계·평균·분포)는 ${rows.length.toLocaleString()}행 전체를 기준으로 계산된 값입니다. ` +
      `리포트는 전체 데이터 통계를 기반으로 작성하세요.`;
  }

  // 3. CSV 텍스트로 변환 (토큰 절약)
  const dataCsv = toCsvText(headers, analysisRows);

  return {
    analysisNote,
    fullStatistics,
    columnStats: stats,
    dataCsv,
  };
}
