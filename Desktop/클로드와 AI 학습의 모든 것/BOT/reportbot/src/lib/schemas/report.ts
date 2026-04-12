import { z } from "zod";

export const reportChangeSchema = z.object({
  direction: z.enum(["up", "down", "flat"]).default("flat"),
  value: z.string(),
});

export const reportHighlightItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  change: reportChangeSchema.optional(),
});

export const reportTableSectionSchema = z.object({
  title: z.string().min(1),
  type: z.literal("table"),
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string())).default([]),
  summary: z.string().optional(),
});

export const reportInsightSectionSchema = z.object({
  title: z.string().min(1),
  type: z.literal("insight"),
  content: z.string().min(1),
});

export const reportHighlightsSectionSchema = z.object({
  title: z.string().min(1),
  type: z.literal("highlights"),
  items: z.array(reportHighlightItemSchema).min(1),
});

export const reportSectionSchema = z.discriminatedUnion("type", [
  reportTableSectionSchema,
  reportInsightSectionSchema,
  reportHighlightsSectionSchema,
]);

export const reportActionItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
});

export const ReportJSONSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  period: z.string().min(1),
  generatedAt: z.string().min(1),
  executiveSummary: z.string().min(1),
  sections: z.array(reportSectionSchema).min(1),
  actionItems: z.array(reportActionItemSchema).default([]),
});

export type ReportJSON = z.infer<typeof ReportJSONSchema>;
