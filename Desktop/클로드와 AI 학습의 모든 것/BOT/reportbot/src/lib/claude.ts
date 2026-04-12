import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

import { ReportJSONSchema, type ReportJSON } from "./schemas/report";

type GenerateReportParams = {
  templateId: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
}

function extractTextFromMessage(response: Message): string {
  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && "text" in textBlock ? (textBlock as { text: string }).text : "";
}

function extractJsonCandidate(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

function parseReportJson(rawText: string): ReportJSON {
  const candidate = extractJsonCandidate(rawText);
  const parsed = JSON.parse(candidate) as unknown;
  return ReportJSONSchema.parse(parsed);
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<Message> {
  const client = getAnthropicClient();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal },
    ) as Message;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateReport({
  systemPrompt,
  userPrompt,
  timeoutMs = 45_000,
}: GenerateReportParams): Promise<ReportJSON> {
  // First attempt
  let firstError: unknown;
  try {
    const response = await callClaude(systemPrompt, userPrompt, timeoutMs);
    return parseReportJson(extractTextFromMessage(response));
  } catch (err) {
    firstError = err;
  }

  // Retry with stricter prompt
  const retrySystem =
    systemPrompt +
    "\n\nPREVIOUS ATTEMPT FAILED schema validation. You MUST return pure JSON matching the schema exactly. No markdown. No explanation. No extra fields.";

  try {
    const retryResponse = await callClaude(retrySystem, userPrompt, timeoutMs);
    return parseReportJson(extractTextFromMessage(retryResponse));
  } catch (retryError) {
    const msg =
      retryError instanceof Error ? retryError.message :
      firstError instanceof Error ? firstError.message :
      "Failed to parse Claude response";
    console.error("[generateReport] Both attempts failed:", msg);
    throw new Error(msg);
  }
}
