import { z } from "zod";

import { errorResponse } from "../../../../../lib/api-response";
import { buildPdfBuffer } from "../../../../../lib/report-pdf";
import { getReport } from "../../../../../lib/redis";
import { buildExportFileName } from "../../../../../lib/report-renderer";
import { ReportJSONSchema } from "../../../../../lib/schemas/report";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    reportId: z.string().min(1).optional(),
    report: ReportJSONSchema.optional(),
  })
  .refine((value) => Boolean(value.reportId || value.report), {
    message: "reportId or report is required",
    path: ["reportId"],
  });

async function resolveReport(input: z.infer<typeof requestSchema>) {
  if (input.report) {
    return input.report;
  }

  if (!input.reportId) {
    return null;
  }

  const saved = await getReport(input.reportId);
  return saved?.reportJson ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("id");

  if (!reportId) {
    return errorResponse("id query parameter is required", 400);
  }

  const saved = await getReport(reportId);
  const report = saved?.reportJson ?? null;

  if (!report) {
    return errorResponse("Report not found", 404);
  }

  try {
    const buffer = await buildPdfBuffer(report);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildExportFileName(report, "pdf")}"`,
      },
    });
  } catch (error) {
    return errorResponse(
      "Failed to export PDF report",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse("Invalid export request", 400, parsed.error.flatten());
    }

    const report = await resolveReport(parsed.data);

    if (!report) {
      return errorResponse("Report not found", 404);
    }

    const buffer = await buildPdfBuffer(report);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildExportFileName(
          report,
          "pdf",
        )}"`,
      },
    });
  } catch (error) {
    return errorResponse(
      "Failed to export PDF report",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
