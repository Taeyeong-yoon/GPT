import { buildClaudeDataPayload } from "../data-summarizer";

type PromptParams = {
  companyName: string;
  period: string;
  additionalNotes?: string | null;
  data: { headers: string[]; rows: string[][] };
};

const SYSTEM = `You are a senior Korean market intelligence analyst. Return ONLY raw JSON — absolutely no markdown, no code fences, no explanation.

You MUST follow this EXACT output structure. Copy the field names exactly:

{
  "title": "2025년 4월 경쟁사 분석 리포트",
  "companyName": "회사명",
  "period": "2025년 4월",
  "generatedAt": "2025-04-30T09:00:00Z",
  "executiveSummary": "3~5문장 한국어 요약.",
  "sections": [
    {
      "type": "highlights",
      "title": "시장 포지셔닝 요약",
      "items": [
        { "label": "시장점유율", "value": "23.5%", "change": { "direction": "up", "value": "+2.1%p" } },
        { "label": "경쟁사 대비 성장률", "value": "+8.3%", "change": { "direction": "up", "value": "업계 1위" } }
      ]
    },
    {
      "type": "table",
      "title": "경쟁사별 비교",
      "columns": ["기업", "점유율", "성장률", "강점", "약점"],
      "rows": [
        ["자사", "23.5%", "+8.3%", "기술력", "인지도"],
        ["A사", "31.2%", "+2.1%", "브랜드", "가격"]
      ],
      "summary": "자사는 점유율 3위이나 성장률은 업계 최고입니다."
    },
    {
      "type": "insight",
      "title": "경쟁 동향 분석",
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

export const competitorReportPrompt = {
  system: SYSTEM,
  buildUserPrompt: ({ companyName, period, additionalNotes, data }: PromptParams) => {
    const payload = buildClaudeDataPayload(data);
    return JSON.stringify(
      {
        task: "Generate a Korean competitor intelligence report. Return raw JSON only — no markdown.",
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
