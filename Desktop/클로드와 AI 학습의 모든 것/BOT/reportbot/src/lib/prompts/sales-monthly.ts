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

const MAX_ROWS = 50;

export const salesMonthlyPrompt = {
  system: SYSTEM,
  buildUserPrompt: ({ companyName, period, additionalNotes, data }: PromptParams) => {
    const trimmedData = {
      headers: data.headers,
      rows: data.rows.slice(0, MAX_ROWS),
      totalRows: data.rows.length,
      note: data.rows.length > MAX_ROWS ? `(Showing first ${MAX_ROWS} of ${data.rows.length} rows)` : undefined,
    };
    return JSON.stringify(
      {
        task: "Generate a Korean monthly sales analysis report. Return JSON only.",
        companyName,
        period,
        additionalNotes: additionalNotes ?? "",
        data: trimmedData,
      },
      null,
      2,
    );
  },
};
