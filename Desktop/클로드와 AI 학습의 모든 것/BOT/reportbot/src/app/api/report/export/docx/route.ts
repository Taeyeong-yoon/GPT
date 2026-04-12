import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { z } from "zod";

import { errorResponse } from "../../../../../lib/api-response";
import { getReport } from "../../../../../lib/redis";
import {
  buildExportFileName,
  formatDate,
  getChangeColor,
  getChangeIcon,
} from "../../../../../lib/report-renderer";
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

function colorToDocxHex(color: string) {
  return color.replace("#", "").toUpperCase();
}

async function buildDocxResponse(reportId: string) {
  const saved = await getReport(reportId);
  const report = saved?.reportJson ?? null;
  if (!report) return errorResponse("Report not found", 404);

  // reuse POST logic by building via internal POST call
  const fakeRequest = new Request("http://localhost/api/report/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  });
  return POST(fakeRequest);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("id");
  if (!reportId) return errorResponse("id query parameter is required", 400);
  return buildDocxResponse(reportId);
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

    const bodyChildren = [
      new Paragraph({
        text: report.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        text: report.companyName,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: report.period,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: formatDate(report.generatedAt),
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [new PageBreak()],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: "DBEAFE" },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Executive Summary",
                        bold: true,
                        size: 28,
                      }),
                    ],
                    spacing: { after: 120 },
                  }),
                  new Paragraph({
                    text: report.executiveSummary,
                    spacing: { after: 80 },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      ...report.sections.flatMap((section) => {
        if (section.type === "insight") {
          return [
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
            }),
            new Paragraph({
              text: section.content,
              spacing: { after: 120 },
            }),
          ];
        }

        if (section.type === "highlights") {
          return [
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: section.items.map(
                (item) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(item.label)],
                      }),
                      new TableCell({
                        children: [new Paragraph(item.value)],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `${getChangeIcon(item.change?.direction)} ${
                                  item.change?.value ?? ""
                                }`.trim(),
                                color: colorToDocxHex(
                                  getChangeColor(item.change?.direction),
                                ),
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
            }),
          ];
        }

        return [
          new Paragraph({
            text: section.title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: section.columns.map(
                  (column) =>
                    new TableCell({
                      shading: { fill: "DBEAFE" },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: column, bold: true })],
                        }),
                      ],
                    }),
                ),
              }),
              ...section.rows.map(
                (row) =>
                  new TableRow({
                    children: row.map(
                      (cell) =>
                        new TableCell({
                          children: [new Paragraph(cell)],
                        }),
                    ),
                  }),
              ),
            ],
          }),
          ...(section.summary
            ? [
                new Paragraph({
                  text: section.summary,
                  spacing: { before: 120, after: 120 },
                }),
              ]
            : []),
        ];
      }),
      new Paragraph({
        text: "Action Items",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      ...report.actionItems.map(
        (item, index) =>
          new Paragraph({
            numbering: {
              reference: "action-items",
              level: 0,
            },
            children: [
              new TextRun({ text: `${item.title}: `, bold: true }),
              new TextRun(`${item.description} (${item.priority})`),
            ],
          }),
      ),
    ];

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "action-items",
            levels: [
              {
                level: 0,
                format: "decimal",
                text: "%1.",
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
      styles: {
        default: {
          document: {
            run: {
              font: "Malgun Gothic",
              size: 22,
            },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 48, bold: true, font: "Malgun Gothic" },
            paragraph: { spacing: { after: 240 } },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 36, bold: true, font: "Malgun Gothic" },
            paragraph: { spacing: { before: 160, after: 120 } },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  text: "Powered by ReportBot | CLOID.AI",
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: bodyChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${buildExportFileName(
          report,
          "docx",
        )}"`,
      },
    });
  } catch (error) {
    return errorResponse(
      "Failed to export DOCX report",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
