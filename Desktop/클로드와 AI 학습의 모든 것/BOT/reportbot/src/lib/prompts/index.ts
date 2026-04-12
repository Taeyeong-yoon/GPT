import { competitorReportPrompt } from "./competitor-report";
import { marketingWeeklyPrompt } from "./marketing-weekly";
import { salesMonthlyPrompt } from "./sales-monthly";

export const promptRegistry = {
  "marketing-weekly": marketingWeeklyPrompt,
  "sales-monthly": salesMonthlyPrompt,
  "competitor-report": competitorReportPrompt,
} as const;

export type PromptTemplateId = keyof typeof promptRegistry;

export function getPromptByTemplateId(id: string) {
  return promptRegistry[id as PromptTemplateId] ?? null;
}
