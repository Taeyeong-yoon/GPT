import { randomUUID } from "crypto";

import { z } from "zod";

import { errorResponse, successResponse } from "../../../../lib/api-response";
import { getCurrentUserId } from "../../../../lib/auth";
import { generateReport } from "../../../../lib/claude";
import { getPromptByTemplateId } from "../../../../lib/prompts";
import { incrementUsage, saveReport } from "../../../../lib/redis";

export const runtime = "nodejs";

const templateIds = [
  "marketing-weekly",
  "sales-monthly",
  "competitor-report",
] as const;

const requestSchema = z.object({
  templateId: z.enum(templateIds),
  data: z.object({
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())),
  }),
  options: z.object({
    companyName: z.string().trim().min(1),
    period: z.string().trim().min(1),
    additionalNotes: z.string().nullable().optional(),
  }),
  userId: z.string().optional(),
});

function buildFallbackSystemPrompt() {
  return "You are a professional data analyst. Return JSON only. Analyze the provided data and create a Korean business report in JSON format.";
}

function buildFallbackUserPrompt(params: {
  templateId: string;
  data: {
    headers: string[];
    rows: string[][];
  };
  options: {
    companyName: string;
    period: string;
    additionalNotes?: string | null;
  };
}) {
  return JSON.stringify(
    {
      templateId: params.templateId,
      companyName: params.options.companyName,
      period: params.options.period,
      additionalNotes: params.options.additionalNotes ?? "",
      data: params.data,
      outputSchema: {
        title: "string",
        companyName: "string",
        period: "string",
        generatedAt: "ISO datetime string",
        executiveSummary: "string",
        sections: [
          {
            title: "string",
            type: "table | insight | highlights",
          },
        ],
        actionItems: [
          {
            title: "string",
            description: "string",
            priority: "high | medium | low",
          },
        ],
      },
    },
    null,
    2,
  );
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    /aborted|timeout|timed out/i.test(error.message)
  );
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(
        "\uC694\uCCAD \uD615\uC2DD\uC744 \uD655\uC778\uD558\uC138\uC694",
        400,
        {
          issues: parsed.error.flatten(),
        },
      );
    }

    const { templateId, data, options } = parsed.data;
    const userId = (await getCurrentUserId(request)) ?? "anonymous";
    const prompt = getPromptByTemplateId(templateId);
    const systemPrompt = prompt?.system ?? buildFallbackSystemPrompt();
    const userPrompt =
      prompt?.buildUserPrompt({
        data,
        companyName: options.companyName,
        period: options.period,
        additionalNotes: options.additionalNotes ?? null,
      }) ??
      buildFallbackUserPrompt({
        templateId,
        data,
        options,
      });

    const report = await generateReport({
      templateId,
      systemPrompt,
      userPrompt,
      timeoutMs: 45_000,
    });

    const reportId = randomUUID();
    const createdAt = new Date().toISOString();

    await saveReport({ id: reportId, userId, templateId, createdAt, reportJson: report });
    if (userId !== "anonymous") await incrementUsage(userId);

    return successResponse({
      data: { reportId, report },
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      return errorResponse(
        "AI \uBD84\uC11D \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB370\uC774\uD130 \uC591\uC744 \uC904\uC5EC\uBCF4\uC138\uC694",
        504,
      );
    }

    return errorResponse(
      "\uB9AC\uD3EC\uD2B8 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
