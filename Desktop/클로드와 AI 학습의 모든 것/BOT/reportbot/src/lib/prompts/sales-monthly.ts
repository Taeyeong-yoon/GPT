import { buildClaudeDataPayload } from "../data-summarizer";

type PromptParams = {
  companyName: string;
  period: string;
  additionalNotes?: string | null;
  data: { headers: string[]; rows: string[][] };
};

const SYSTEM = `You are a senior Korean sales analyst. Return ONLY valid JSON — no markdown, no explanation.

Output schema (strictly follow this):
{
  "title": "string — report title in Korean",
  "companyName": "string",
  "period": "string",
  "generatedAt": "ISO 8601 datetime string",
  "executiveSummary": "string — 3–5 sentence Korean summary",
  "sections": [
    {
      "type": "highlights",
      "title": "string",
      "items": [{ "label": "string", "value": "string", "change": { "direction": "up|down|flat", "value": "string" } }]
    },
    {
      "type": "table",
      "title": "string",
      "columns": ["string"],
      "rows": [["string"]],
      "summary": "string (optional)"
    },
    {
      "type": "insight",
      "title": "string",
      "content": "string"
    }
  ],
  "actionItems": [
    { "title": "string", "description": "string", "priority": "high|medium|low" }
  ]
}
Include at least 3 sections and 3 actionItems.`;

export const salesMonthlyPrompt = {
  system: SYSTEM,
  buildUserPrompt: ({ companyName, period, additionalNotes, data }: PromptParams) =>
    JSON.stringify(
      {
        task: "Generate a Korean monthly sales analysis report. Return JSON only.",
        companyName,
        period,
        additionalNotes: additionalNotes ?? "",
        data: buildClaudeDataPayload(data),
      },
      null,
      2,
    ),
};
