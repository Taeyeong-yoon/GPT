"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/* ── Types ─────────────────────────────────────────────────── */
type TemplateId = "marketing-weekly" | "sales-monthly" | "competitor-report";
type DataSource = { type: "csv"; content: string; fileName: string } | { type: "sheets"; url: string };
type Step = 1 | 2 | 3 | 4;

/* ── Constants ─────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: "marketing-weekly" as TemplateId,
    title: "마케팅 주간 성과",
    desc: "채널별 유입수, 전환율, 비용, ROAS 분석",
    color: "indigo",
    example: "채널, 세션수, 전환수, 비용, ROAS\n구글, 1200, 48, 360000, 3.2",
  },
  {
    id: "sales-monthly" as TemplateId,
    title: "월간 매출 분석",
    desc: "제품/서비스별 매출, 원가, 이익률 분석",
    color: "emerald",
    example: "제품명, 매출, 원가, 판매량\n프리미엄플랜, 2400000, 800000, 48",
  },
  {
    id: "competitor-report" as TemplateId,
    title: "경쟁사 동향 리포트",
    desc: "경쟁사 활동 요약 및 시장 포지셔닝 분석",
    color: "amber",
    example: "경쟁사, 최근활동, 가격변화, 신제품\n경쟁사A, 마케팅 강화, -10%, 없음",
  },
];

const STEP_LABELS = ["템플릿 선택", "데이터 연결", "설정", "생성 확인"];

const COLOR_MAP: Record<string, Record<string, string>> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", badge: "rb-badge-indigo" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "rb-badge-green" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "rb-badge-yellow" },
};

/* ── Step indicator ────────────────────────────────────────── */
function StepBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? "done" : n === step ? "active" : "inactive";
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={`rb-step-dot rb-step-dot-${state}`}>
              {state === "done" ? "✓" : n}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${state === "active" ? "text-indigo-700" : "text-gray-400"}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className={`hidden sm:block h-px w-6 mx-1 ${n < step ? "bg-indigo-300" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── CSV parser ─────────────────────────────────────────────── */
function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(",").map(c => c.trim()));
  return { headers, rows };
}

/* ── Main wizard ────────────────────────────────────────────── */
function NewReportWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [templateId, setTemplateId] = useState<TemplateId | null>(
    (searchParams.get("template") as TemplateId) ?? null,
  );
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [dsMode, setDsMode] = useState<"csv" | "sheets">("csv");
  const [csvText, setCsvText] = useState("");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [period, setPeriod] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* Auto-advance to step 2 if template preset */
  useEffect(() => {
    if (templateId && step === 1) setStep(2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers ────────────────────────────────────────────── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setCsvText(text);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? "");
    reader.readAsText(file, "utf-8");
  }

  function validateStep2() {
    if (dsMode === "csv") {
      if (!csvText.trim()) { setError("CSV 데이터를 붙여넣거나 파일을 업로드하세요."); return false; }
      if (!parseCsv(csvText)) { setError("CSV 형식이 올바르지 않습니다 (헤더 + 데이터 1행 이상 필요)."); return false; }
    } else {
      if (!sheetsUrl.trim()) { setError("Google Sheets URL을 입력하세요."); return false; }
    }
    setError("");
    return true;
  }

  function validateStep3() {
    if (!companyName.trim()) { setError("회사명을 입력하세요."); return false; }
    if (!period.trim()) { setError("리포트 기간을 입력하세요."); return false; }
    setError("");
    return true;
  }

  async function handleGenerate() {
    if (!templateId) return;
    setGenerating(true);
    setError("");

    let parsedData: { headers: string[]; rows: string[][] } | null = null;

    if (dsMode === "csv") {
      parsedData = parseCsv(csvText);
    } else {
      setGenStage("Google Sheets 데이터 불러오는 중...");
      try {
        const res = await fetch("/api/data/sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: sheetsUrl }),
        });
        const json = await res.json() as { success?: boolean; data?: { headers: string[]; rows: string[][] }; error?: string };
        if (!json.success || !json.data) throw new Error(json.error ?? "Sheets 데이터 오류");
        parsedData = json.data;
      } catch (e) {
        setError(e instanceof Error ? e.message : "데이터 로드 실패");
        setGenerating(false);
        return;
      }
    }

    if (!parsedData) { setError("데이터 파싱 실패"); setGenerating(false); return; }

    setGenStage("Claude AI가 리포트를 분석 중입니다...");

    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          data: parsedData,
          options: {
            companyName: companyName.trim(),
            period: period.trim(),
            additionalNotes: notes.trim() || null,
          },
        }),
      });
      const json = await res.json() as { success?: boolean; data?: { reportId: string }; error?: string; details?: string };
      if (!json.success || !json.data?.reportId) {
        const msg = json.details ? `${json.error}: ${json.details}` : (json.error ?? "리포트 생성 실패");
        throw new Error(msg);
      }
      router.push(`/dashboard/reports/${json.data.reportId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "리포트 생성 중 오류가 발생했습니다.");
      setGenerating(false);
    }
  }

  const tpl = TEMPLATES.find(t => t.id === templateId);
  const tplColor = tpl ? COLOR_MAP[tpl.color] : COLOR_MAP.indigo;

  /* ── Step 1: Template ────────────────────────────────────── */
  if (step === 1) {
    return (
      <div>
        <StepBar step={1} />
        <h2 className="text-xl font-bold text-gray-900 mb-1">어떤 리포트를 생성하실 건가요?</h2>
        <p className="text-sm text-gray-500 mb-6">목적에 맞는 템플릿을 선택하세요</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => {
            const c = COLOR_MAP[t.color];
            return (
              <button
                key={t.id}
                onClick={() => { setTemplateId(t.id); setStep(2); }}
                className={`rb-card text-left hover:border-opacity-100 hover:shadow-md transition-all group border-2 ${
                  templateId === t.id ? `border-indigo-400 ${c.bg}` : "border-transparent hover:border-gray-200"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
                  <span className={`text-lg ${c.text}`}>✦</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors">
                  {t.title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
                <p className="text-xs text-gray-400 mt-3 font-mono truncate">{t.example.split("\n")[0]}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Step 2: Data ────────────────────────────────────────── */
  if (step === 2) {
    return (
      <div>
        <StepBar step={2} />
        <h2 className="text-xl font-bold text-gray-900 mb-1">데이터 소스를 연결하세요</h2>
        <p className="text-sm text-gray-500 mb-6">CSV 파일 또는 Google Sheets URL로 데이터를 입력하세요</p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          {(["csv", "sheets"] as const).map(m => (
            <button
              key={m}
              onClick={() => setDsMode(m)}
              className={`rb-btn rb-btn-sm ${dsMode === m ? "rb-btn-primary" : "rb-btn-secondary"}`}
            >
              {m === "csv" ? "CSV 파일" : "Google Sheets"}
            </button>
          ))}
        </div>

        {dsMode === "csv" ? (
          <div className="space-y-4">
            {/* Drag & drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
            >
              <p className="text-sm font-medium text-gray-700">CSV 파일을 끌어다 놓거나 클릭하여 업로드</p>
              <p className="text-xs text-gray-400 mt-1">UTF-8 인코딩 권장, 헤더 포함 필수</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
            {/* Textarea */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                또는 CSV 데이터 직접 붙여넣기
              </label>
              <textarea
                className="rb-input font-mono text-xs"
                rows={8}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={tpl?.example ?? "헤더행, 데이터행 순으로 입력하세요"}
              />
            </div>
            {csvText && parseCsv(csvText) && (
              <p className="text-xs text-emerald-600">
                ✓ {parseCsv(csvText)!.headers.length}개 컬럼, {parseCsv(csvText)!.rows.length}행 인식됨
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Google Sheets URL
            </label>
            <input
              className="rb-input"
              type="url"
              value={sheetsUrl}
              onChange={e => setSheetsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <p className="text-xs text-gray-400 mt-2">
              스프레드시트를 &quot;링크 있는 사용자&quot;에게 공개 설정해야 합니다
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={() => { setStep(1); setError(""); }} className="rb-btn rb-btn-secondary">
            이전
          </button>
          <button
            onClick={() => { if (validateStep2()) setStep(3); }}
            className="rb-btn rb-btn-primary"
          >
            다음: 설정
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 3: Settings ────────────────────────────────────── */
  if (step === 3) {
    return (
      <div>
        <StepBar step={3} />
        <h2 className="text-xl font-bold text-gray-900 mb-1">리포트 설정</h2>
        <p className="text-sm text-gray-500 mb-6">리포트에 표시될 기본 정보를 입력하세요</p>

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              회사 / 팀 이름 <span className="text-red-500">*</span>
            </label>
            <input
              className="rb-input"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="예: 주식회사 리포트봇"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              리포트 기간 <span className="text-red-500">*</span>
            </label>
            <input
              className="rb-input"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              placeholder="예: 2026년 4월 1주차, 2026년 3월"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              수신 이메일
            </label>
            <input
              className="rb-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="리포트를 받을 이메일 (선택)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              추가 메모 / 분석 요청 (선택)
            </label>
            <textarea
              className="rb-input"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="예: 특히 구글 채널 성과를 강조해주세요"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={() => { setStep(2); setError(""); }} className="rb-btn rb-btn-secondary">
            이전
          </button>
          <button
            onClick={() => { if (validateStep3()) setStep(4); }}
            className="rb-btn rb-btn-primary"
          >
            다음: 확인
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 4: Confirm ─────────────────────────────────────── */
  const csvPreview = dsMode === "csv" ? parseCsv(csvText) : null;

  return (
    <div>
      <StepBar step={4} />
      <h2 className="text-xl font-bold text-gray-900 mb-1">리포트 생성 확인</h2>
      <p className="text-sm text-gray-500 mb-6">아래 내용을 확인하고 리포트를 생성하세요</p>

      <div className="space-y-3 max-w-lg mb-6">
        <div className="rb-card">
          <p className="text-xs text-gray-500 mb-3 font-medium">선택된 템플릿</p>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${tplColor.bg}`}>
            <span className={`text-sm font-semibold ${tplColor.text}`}>{tpl?.title}</span>
          </div>
        </div>

        <div className="rb-card">
          <p className="text-xs text-gray-500 mb-2 font-medium">데이터 소스</p>
          {dsMode === "csv" && csvPreview ? (
            <div>
              <p className="text-sm font-medium text-gray-800">CSV 데이터</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {csvPreview.headers.length}개 컬럼 · {csvPreview.rows.length}행
              </p>
              <div className="mt-2 font-mono text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto">
                {csvPreview.headers.join(", ")}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-800">Google Sheets</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{sheetsUrl}</p>
            </div>
          )}
        </div>

        <div className="rb-card">
          <p className="text-xs text-gray-500 mb-2 font-medium">설정 요약</p>
          <dl className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">회사명</dt>
              <dd className="font-medium text-gray-900">{companyName}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">기간</dt>
              <dd className="font-medium text-gray-900">{period}</dd>
            </div>
            {email && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">이메일</dt>
                <dd className="font-medium text-gray-900">{email}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {generating ? (
        <div className="rb-card flex flex-col items-center justify-center py-12 max-w-lg">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl mb-4 animate-pulse-soft">
            ✦
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">AI 분석 중...</p>
          <p className="text-xs text-gray-500">{genStage || "Claude AI가 데이터를 분석하고 있습니다"}</p>
          <div className="mt-4 h-1 w-48 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-pulse-soft w-3/4" />
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button onClick={() => { setStep(3); setError(""); }} className="rb-btn rb-btn-secondary">
            이전
          </button>
          <button onClick={handleGenerate} className="rb-btn rb-btn-primary">
            ✦ AI 리포트 생성
          </button>
        </div>
      )}
    </div>
  );
}

export default function NewReportPage() {
  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">새 리포트 생성</h1>
        <p className="text-sm text-gray-500 mt-0.5">4단계로 AI 리포트를 자동 생성합니다</p>
      </div>
      <div className="rb-card">
        <Suspense fallback={<div className="animate-pulse-soft h-64 bg-gray-100 rounded-xl" />}>
          <NewReportWizard />
        </Suspense>
      </div>
    </div>
  );
}
