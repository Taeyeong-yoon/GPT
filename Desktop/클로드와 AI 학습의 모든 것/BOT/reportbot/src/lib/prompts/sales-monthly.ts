import { buildClaudeDataPayload } from "../data-summarizer";

type PromptParams = {
  companyName: string;
  period: string;
  additionalNotes?: string | null;
  data: { headers: string[]; rows: string[][] };
};

const SYSTEM = `You are a senior Korean sales analyst. Return ONLY raw JSON — absolutely no markdown, no code fences, no explanation.

You MUST follow this EXACT output structure. Copy the field names exactly:

{
  "title": "2025년 4월 월간 매출 리포트",
  "companyName": "회사명",
  "period": "2025년 4월",
  "generatedAt": "2025-04-30T09:00:00Z",
  "executiveSummary": "3~5문장 한국어 요약.",
  "sections": [
    {
      "type": "highlights",
      "title": "핵심 지표",
      "items": [
        { "label": "총 매출", "value": "5,800만원", "change": { "direction": "up", "value": "+13.7%" } },
        { "label": "달성률", "value": "116%", "change": { "direction": "up", "value": "+6%p" } }
      ]
    },
    {
      "type": "table",
      "title": "담당자별 실적",
      "columns": ["담당자", "매출", "건수", "달성률"],
      "rows": [
        ["김민준", "2억 5천만원", "24건", "112%"],
        ["박지훈", "1억 8천만원", "18건", "108%"]
      ],
      "summary": "김민준 담당자가 전체 매출의 35%를 차지했습니다."
    },
    {
      "type": "insight",
      "title": "주요 인사이트",
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
- All text values must be in Korean`;

export const salesMonthlyPrompt = {
  system: SYSTEM,
  buildUserPrompt: ({ companyName, period, additionalNotes, data }: PromptParams) => {
    const payload = buildClaudeDataPayload(data);
    return JSON.stringify(
      {
        task: "Generate a Korean monthly sales analysis report. Return raw JSON only — no markdown.",
        companyName,
        period,
        additionalNotes: additionalNotes ?? "",
        analysisNote: payload.analysisNote,
        fullStatistics: payload.fullStatistics,
        dataCsv: payload.dataCsv,
      },
      null,
      2,
    );
  },
};
