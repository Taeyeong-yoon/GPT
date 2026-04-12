import { buildClaudeDataPayload } from "../data-summarizer";

type PromptParams = {
  companyName: string;
  period: string;
  additionalNotes?: string | null;
  data: { headers: string[]; rows: string[][] };
};

const SYSTEM = `You are a senior Korean business analyst. Your job is to analyze ANY CSV data and produce a professional Korean monthly sales/business report.

IMPORTANT: The CSV columns will vary for every customer. Do NOT assume fixed column names. Read the actual headers and adapt your analysis to whatever data is provided. If the data looks like sales, analyze sales. If it looks like revenue, analyze revenue. Use the column names exactly as they appear in the CSV.

Return ONLY raw JSON — absolutely no markdown, no code fences, no explanation text before or after.

OUTPUT STRUCTURE (copy field names exactly, adapt content to match the actual data):

{
  "title": "<적절한 리포트 제목>",
  "companyName": "<회사명>",
  "period": "<기간>",
  "generatedAt": "<ISO datetime>",
  "executiveSummary": "<전체 데이터를 3~5문장으로 요약. 핵심 지표와 특이사항 포함>",
  "sections": [
    {
      "type": "highlights",
      "title": "<핵심 지표 섹션 제목>",
      "items": [
        { "label": "<지표명>", "value": "<값>", "change": { "direction": "up", "value": "<변화량>" } }
      ]
    },
    {
      "type": "table",
      "title": "<표 섹션 제목>",
      "columns": ["<실제 CSV에서 가져온 컬럼명들>"],
      "rows": [["<값>", "<값>"]],
      "summary": "<표 요약 1문장>"
    },
    {
      "type": "insight",
      "title": "<인사이트 제목>",
      "content": "<상세 분석 내용>"
    }
  ],
  "actionItems": [
    { "title": "<액션 제목>", "description": "<구체적 실행 방안>", "priority": "high" }
  ]
}

CRITICAL RULES — MUST FOLLOW:
1. "type" in sections: ONLY "highlights", "table", or "insight" — no other values
2. "highlights" → MUST have "items" array. Each item: { label, value, change(optional) }
3. "table" → MUST have "columns" (string[]) and "rows" (string[][])
4. "insight" → MUST have "content" (string)
5. "actionItems" → MUST be objects { title, description, priority } — NOT plain strings
6. "priority" → ONLY "high", "medium", or "low"
7. MINIMUM: 1 highlights + 1 table + 2 insight sections + 3 actionItems
8. All text in Korean
9. ⚠️ NUMBERS: Use the exact pre-calculated statistics provided. Never recalculate — your arithmetic may be wrong.
10. For table rows: use the top items from the data (e.g., top 10 by key metric), not all rows`;

export const salesMonthlyPrompt = {
  system: SYSTEM,
  buildUserPrompt: ({ companyName, period, additionalNotes, data }: PromptParams) => {
    const payload = buildClaudeDataPayload(data);
    return JSON.stringify(
      {
        task: "Generate a Korean monthly business/sales analysis report based on the CSV data below. Adapt your analysis to whatever columns exist in the data. Return raw JSON only.",
        companyName,
        period,
        additionalNotes: additionalNotes || "(없음)",
        csvHeaders: data.headers,
        "PRE_CALCULATED_STATISTICS — USE THESE EXACT NUMBERS": payload.fullStatistics,
        analysisNote: payload.analysisNote,
        csvData: payload.dataCsv,
      },
      null,
      2,
    );
  },
};
