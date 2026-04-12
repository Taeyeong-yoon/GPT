/**
 * data-summarizer.ts
 *
 * 수천 줄의 CSV를 Claude에 그대로 보내면 토큰 낭비 + 비용 폭발.
 * 이 모듈은 서버에서 먼저 데이터를 통계 요약으로 압축한 뒤 전달한다.
 *
 * 전략:
 *  1. 숫자 컬럼 → 합계·평균·최솟값·최댓값·중앙값 계산
 *  2. 카테고리 컬럼 → 상위 N개 그룹별 집계
 *  3. 대표 샘플 행 10개 (원본 느낌 전달용)
 *  4. 전체 통계 요약 텍스트 생성
 *
 * 결과: 수천 줄 → ~100줄 JSON으로 압축, 분석 품질은 유지·향상
 */

type RawData = {
  headers: string[];
  rows: string[][];
};

type NumericStats = {
  column: string;
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  nonNullCount: number;
};

type CategoryGroup = {
  value: string;
  count: number;
  numericTotals: Record<string, number>;
};

type CategoryStats = {
  column: string;
  uniqueCount: number;
  topGroups: CategoryGroup[];
};

export type DataSummary = {
  totalRows: number;
  totalColumns: number;
  headers: string[];
  numericStats: NumericStats[];
  categoryStats: CategoryStats[];
  sampleRows: string[][];
  summaryText: string;
};

// 숫자처럼 생긴 문자열 파싱 (쉼표 제거, % 제거, 원/$ 제거)
function parseNumber(val: string): number | null {
  const cleaned = val
    .replace(/[,，]/g, "")
    .replace(/[%％]/g, "")
    .replace(/[₩$€£¥]/g, "")
    .replace(/[원만억천]/g, "")
    .trim();
  const n = Number(cleaned);
  return isNaN(n) || cleaned === "" ? null : n;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// 컬럼이 "주로 숫자"인지 판단 (60% 이상이 숫자면 숫자 컬럼)
function isNumericColumn(values: string[]): boolean {
  const sample = values.slice(0, 100);
  const numericCount = sample.filter((v) => parseNumber(v) !== null).length;
  return numericCount / sample.length >= 0.6;
}

// 카테고리 컬럼인지 판단 (문자열이 많고 고유값이 적당히 있으면)
function isCategoryColumn(values: string[], uniqueRatio: number): boolean {
  return uniqueRatio < 0.3 && uniqueRatio > 0;
}

export function summarizeData(data: RawData, maxGroupCategories = 10): DataSummary {
  const { headers, rows } = data;

  if (rows.length === 0) {
    return {
      totalRows: 0,
      totalColumns: headers.length,
      headers,
      numericStats: [],
      categoryStats: [],
      sampleRows: [],
      summaryText: "데이터가 비어있습니다.",
    };
  }

  // 컬럼별 값 배열 추출
  const colValues: string[][] = headers.map((_, ci) =>
    rows.map((row) => (row[ci] ?? "").trim()),
  );

  const numericStats: NumericStats[] = [];
  const categoryStats: CategoryStats[] = [];
  const numericColIndices: number[] = [];

  // 각 컬럼 분석
  headers.forEach((header, ci) => {
    const values = colValues[ci];
    const nonEmpty = values.filter((v) => v !== "");
    if (nonEmpty.length === 0) return;

    const uniqueValues = new Set(nonEmpty);
    const uniqueRatio = uniqueValues.size / nonEmpty.length;

    if (isNumericColumn(nonEmpty)) {
      numericColIndices.push(ci);
      const nums = nonEmpty
        .map(parseNumber)
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);

      if (nums.length === 0) return;

      const sum = nums.reduce((a, b) => a + b, 0);
      numericStats.push({
        column: header,
        sum: Math.round(sum * 100) / 100,
        avg: Math.round((sum / nums.length) * 100) / 100,
        min: nums[0],
        max: nums[nums.length - 1],
        median: Math.round(median(nums) * 100) / 100,
        nonNullCount: nums.length,
      });
    } else if (isCategoryColumn(nonEmpty, uniqueRatio)) {
      // 카테고리별 집계
      const groupMap = new Map<string, { count: number; numericTotals: Record<string, number> }>();

      rows.forEach((row) => {
        const catVal = (row[ci] ?? "").trim();
        if (!catVal) return;

        if (!groupMap.has(catVal)) {
          groupMap.set(catVal, { count: 0, numericTotals: {} });
        }
        const entry = groupMap.get(catVal)!;
        entry.count++;

        // 같은 행의 숫자 컬럼 합산
        numericColIndices.forEach((ni) => {
          const numVal = parseNumber((row[ni] ?? "").trim());
          if (numVal !== null) {
            const numHeader = headers[ni];
            entry.numericTotals[numHeader] = (entry.numericTotals[numHeader] ?? 0) + numVal;
          }
        });
      });

      // 건수 기준 상위 N개
      const topGroups = Array.from(groupMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, maxGroupCategories)
        .map(([value, stats]) => ({
          value,
          count: stats.count,
          numericTotals: Object.fromEntries(
            Object.entries(stats.numericTotals).map(([k, v]) => [
              k,
              Math.round(v * 100) / 100,
            ]),
          ),
        }));

      categoryStats.push({
        column: header,
        uniqueCount: uniqueValues.size,
        topGroups,
      });
    }
  });

  // 대표 샘플 행: 처음 5개 + 마지막 5개 (전체 느낌 전달)
  const sampleRows =
    rows.length <= 10
      ? rows.slice(0, 10)
      : [...rows.slice(0, 5), ...rows.slice(-5)];

  // 요약 텍스트 생성
  const summaryLines: string[] = [
    `총 ${rows.length.toLocaleString()}행 × ${headers.length}컬럼 데이터`,
  ];

  if (numericStats.length > 0) {
    summaryLines.push(`\n[주요 수치 요약]`);
    numericStats.slice(0, 8).forEach((s) => {
      summaryLines.push(
        `• ${s.column}: 합계=${s.sum.toLocaleString()}, 평균=${s.avg.toLocaleString()}, 최소=${s.min.toLocaleString()}, 최대=${s.max.toLocaleString()}`,
      );
    });
  }

  if (categoryStats.length > 0) {
    summaryLines.push(`\n[카테고리별 집계]`);
    categoryStats.slice(0, 5).forEach((c) => {
      summaryLines.push(`• ${c.column} (${c.uniqueCount}개 유형):`);
      c.topGroups.slice(0, 5).forEach((g) => {
        const totals = Object.entries(g.numericTotals)
          .slice(0, 2)
          .map(([k, v]) => `${k}=${v.toLocaleString()}`)
          .join(", ");
        summaryLines.push(
          `  - ${g.value}: ${g.count}건${totals ? ` (${totals})` : ""}`,
        );
      });
    });
  }

  return {
    totalRows: rows.length,
    totalColumns: headers.length,
    headers,
    numericStats,
    categoryStats,
    sampleRows,
    summaryText: summaryLines.join("\n"),
  };
}

/**
 * Claude에 전달할 최종 데이터 페이로드 생성
 * 원본 수천 줄 대신 압축된 통계 요약을 전달
 */
export function buildClaudeDataPayload(data: RawData) {
  const summary = summarizeData(data);

  return {
    metadata: {
      totalRows: summary.totalRows,
      totalColumns: summary.totalColumns,
      columns: summary.headers,
    },
    statisticalSummary: summary.summaryText,
    numericAnalysis: summary.numericStats,
    categoryBreakdown: summary.categoryStats,
    sampleRows: {
      headers: summary.headers,
      rows: summary.sampleRows,
      note:
        summary.totalRows > 10
          ? `처음 5행 + 마지막 5행 (전체 ${summary.totalRows}행 중)`
          : "전체 행",
    },
  };
}
