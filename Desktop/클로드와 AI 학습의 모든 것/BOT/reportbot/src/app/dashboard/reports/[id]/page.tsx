"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

type ActionItem = { title: string; description: string; priority: "high" | "medium" | "low" };
type Section =
  | { type: "table"; title: string; columns: string[]; rows: string[][]; summary?: string }
  | { type: "insight"; title: string; content: string }
  | { type: "highlights"; title: string; items: { label: string; value: string; change?: { direction: "up" | "down" | "flat"; value: string } }[] };

type Report = {
  id: string;
  templateId: string;
  createdAt: string;
  reportJson: {
    title: string;
    companyName: string;
    period: string;
    generatedAt: string;
    executiveSummary: string;
    sections: Section[];
    actionItems: ActionItem[];
  };
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "rb-badge-red",
  medium: "rb-badge-yellow",
  low: "rb-badge-gray",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "높음", medium: "중간", low: "낮음",
};

const CHANGE_ICON: Record<string, string> = {
  up: "↑", down: "↓", flat: "─",
};

const CHANGE_COLOR: Record<string, string> = {
  up: "text-emerald-600", down: "text-red-500", flat: "text-gray-400",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function SectionBlock({ section }: { section: Section }) {
  if (section.type === "highlights") {
    return (
      <div className="rb-card">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">{section.title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {section.items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{item.value}</p>
              {item.change && (
                <p className={`text-xs font-medium mt-0.5 ${CHANGE_COLOR[item.change.direction]}`}>
                  {CHANGE_ICON[item.change.direction]} {item.change.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "table") {
    return (
      <div className="rb-card overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">{section.title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {section.columns.map((col, i) => (
                  <th key={i} className="text-left text-xs font-medium text-gray-500 py-2 pr-4 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2.5 pr-4 text-gray-700 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {section.summary && (
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">{section.summary}</p>
        )}
      </div>
    );
  }

  if (section.type === "insight") {
    return (
      <div className="rb-card">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{section.title}</h3>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
      </div>
    );
  }

  return null;
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { success?: boolean; report?: Report } | null) => {
        if (d?.success && d?.report) setReport(d.report);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in max-w-4xl">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse-soft" />
        <div className="rb-card h-32 animate-pulse-soft bg-gray-100" />
        <div className="rb-card h-48 animate-pulse-soft bg-gray-100" />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <div className="rb-card flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-medium text-gray-700 mb-2">리포트를 찾을 수 없습니다</p>
          <p className="text-xs text-gray-400 mb-4">삭제되었거나 접근 권한이 없습니다</p>
          <Link href="/dashboard/reports" className="rb-btn rb-btn-secondary rb-btn-sm">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const { reportJson } = report;

  return (
    <div className="max-w-4xl space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/reports" className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">
            ← 목록으로
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{reportJson.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reportJson.companyName} · {reportJson.period} · {fmtDate(reportJson.generatedAt)}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a
            href={`/api/report/export/pdf?id=${report.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rb-btn rb-btn-secondary rb-btn-sm"
          >
            📄 PDF
          </a>
          <a
            href={`/api/report/export/docx?id=${report.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rb-btn rb-btn-secondary rb-btn-sm"
          >
            📝 DOCX
          </a>
        </div>
      </div>

      {/* Executive summary */}
      <div className="rb-card border-l-4 border-indigo-500">
        <p className="text-xs text-indigo-600 font-semibold mb-2 uppercase tracking-wide">핵심 요약</p>
        <p className="text-sm text-gray-700 leading-relaxed">{reportJson.executiveSummary}</p>
      </div>

      {/* Sections */}
      {reportJson.sections.map((section, i) => (
        <SectionBlock key={i} section={section} />
      ))}

      {/* Action items */}
      {reportJson.actionItems.length > 0 && (
        <div className="rb-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">액션 아이템</h3>
          <div className="space-y-3">
            {reportJson.actionItems.map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className={`rb-badge ${PRIORITY_BADGE[item.priority]} flex-shrink-0 self-start mt-0.5`}>
                  {PRIORITY_LABEL[item.priority]}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
