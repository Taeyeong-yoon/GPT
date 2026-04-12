import { buildClaudeDataPayload } from "../data-summarizer";

type PromptParams = {
  companyName: string;
  period: string;
  additionalNotes?: string | null;
  data: { headers: string[]; rows: string[][] };
};

const SYSTEM = `You are a senior Korean marketing analyst. Return ONLY raw JSON — absolutely no markdown, no code fences, no explanation.

You MUST follow this EXACT output structure. Copy the field names exactly:

{
  "title": "2025년 4월 2주차 마케팅 리포트",
  "companyName": "회사명",
  "period": "2025년 4월 2주차",
  "generatedAt": "2025-04-14T09:00:00Z",
  "executiveSummary": "3~5문장 한국어 요약.",
  "sections": [
    {
      "type": "highlights",
      "title": "핵심 성과 지표",
      "items": [
        { "label": "총 전환수", "value": "1,240건", "change": { "direction": "up", "value": "+18%" } },
        { "label": "클릭률(CTR)", "value": "3.2%", "change": { "direction": "up", "value": "+0.4%p" } }
      ]
    },
    {
      "type": "table",
      "title": "캠페인별 성과",
      "columns": ["캠페인명", "노출수", "클릭수", "전환수", "ROAS"],
      "rows": [
        ["Q2_엔터프라이즈", "45,000", "1,440", "288", "380%"],
        ["Q2_SMB_디지털", "32,000", "960", "192", "290%"]
      ],
      "summary": "엔터프라이즈 캠페인이 ROAS 380%로 최고 성과를 기록했습니다."
    },
    {
      "type": "insight",
      "title": "채널별 분석",
      "content": "상세 분석 내용을 한국어로 작성합니다."
    }
  ],
  "actionItems": [
    { "title": "액션 제목", "description": "구체적 실행 방안", "priority": "high" },
    { "title": "액션 제목2", "description": "구체적 실행 방안2", "priority": "medium" }
  ]
}

CRITICAL RULES:
- "type" field in sections is REQUIRED: must be exactly "highlights", "table", or "insight"
- "highlights" sections MUST have "items" array (NOT "content")
- "table" sections MUST have "columns" (string[]) and "rows" (string[][])
- "insight" sections MUST have "content" (string)
- "actionItems" MUST be array of objects with "title", "description", "priority" — NOT plain strings
- "priority" must be exactly "high", "medium", or "low"
- Include at least: 1 highlights + 1 table + 2 insight sections + 3 actionItems
- All text values must be in Korean
- ⚠️ NUMBER ACCURACY: Always use the exact numbers from "PRE-CALCULATED STATISTICS". Never recalculate totals yourself — your arithmetic is unreliable. Use the provided sum/avg/min/max values verbatim.`;

export const marketingWeeklyPrompt = {
  system: SYSTEM,
  buildUserPrompt: ({ companyName, period, additionalNotes, data }: PromptParams) => {
    const payload = buildClaudeDataPayload(data);
    return JSON.stringify(
      {
        task: "Generate a Korean weekly marketing performance report. Return raw JSON only — no markdown.",
        companyName,
        period,
        additionalNotes: additionalNotes ?? "",
        "⚠️ IMPORTANT — PRE-CALCULATED STATISTICS (USE THESE EXACT NUMBERS, DO NOT RECALCULATE)": payload.fullStatistics,
        analysisNote: payload.analysisNote,
        "rawData_CSV_for_pattern_analysis": payload.dataCsv,
      },
      null,
      2,
    );
  },
};
