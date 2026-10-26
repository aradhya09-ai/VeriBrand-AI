import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileJson,
  Filter,
  PenLine,
  Printer,
  RefreshCw,
  Send,
  Table2,
  XCircle,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import EvidencePanel from "../components/EvidencePanel";
import { EmptyState, InlineNotice, Modal, SampleBadge, SeverityBadge, StatusBadge, VerificationBadge, useConfirm, useToast } from "../components/ui";
import { downloadAuditCSV, downloadAuditJSON } from "../lib/exporters";
import { runAudit, STAGES } from "../lib/auditEngine";
import { useApp } from "../lib/store";
import type { Finding, VerificationStatus } from "../lib/types";
import { cn, formatDate } from "../lib/utils";

const FILTERS = [
  { key: "all", label: "All findings" },
  { key: "SUPPORTED", label: "Supported" },
  { key: "NEEDS_REVIEW", label: "Needs Review" },
  { key: "CONTRADICTED", label: "Contradicted" },
  { key: "high", label: "High severity" },
  { key: "tone", label: "Tone" },
  { key: "factual", label: "Facts" },
  { key: "compliance", label: "Compliance" },
  { key: "accessibility", label: "Accessibility" },
];

function matches(f: Finding, key: string): boolean {
  if (key === "all") return true;
  if (key === "high") return f.severity === "critical" || f.severity === "high";
  if (key === "factual") return f.category === "factual_accuracy" || f.category === "unsupported_claim";
  if (key === "compliance") return ["rule_violation", "disclaimer", "terminology", "consistency", "ambiguous"].includes(f.category);
  if (key === "accessibility") return f.category === "accessibility";
  return f.verificationStatus === (key as VerificationStatus);
}

export default function AuditResults() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, brand, workspace, can, denyReason, createAudit, submitForReview, isSampleWorkspace } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const audit = state.audits.find((a) => a.id === id);
  const [filter, setFilter] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [rerunOpen, setRerunOpen] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [stage, setStage] = useState(-1);

  const selected = useMemo(
    () => audit?.findings.find((f) => f.id === params.get("finding")) ?? null,
    [audit, params],
  );

  if (!audit) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<XCircle size={20} />}
          title="Audit not found"
          body="This audit may have been deleted or belongs to another workspace."
          action={<Link to="/app/audits" className="btn-primary">Back to audit history</Link>}
        />
      </div>
    );
  }

  const findings = audit.findings;
  const shown = findings.filter((f) => matches(f, filter));
  const counts = {
    total: findings.length,
    high: findings.filter((f) => f.severity === "critical" || f.severity === "high").length,
    supported: findings.filter((f) => f.verificationStatus === "SUPPORTED").length,
    needs: findings.filter((f) => f.verificationStatus === "NEEDS_REVIEW").length,
    contradicted: findings.filter((f) => f.verificationStatus === "CONTRADICTED").length,
  };
  const failedChecks = audit.checksRun.filter((c) => c.status === "failed").length;
  const completedChecks = audit.checksRun.filter((c) => c.status === "completed").length;
  const skippedChecks = audit.checksRun.filter((c) => c.status === "skipped").length;
  const openHigh = findings.filter((f) => f.reviewStatus === "open" && (f.severity === "critical" || f.severity === "high")).length;
  const approval = state.approvals.find((a) => a.auditId === audit.id);

  const openFinding = (fid: string | null) => {
    const next = new URLSearchParams(params);
    if (fid) next.set("finding", fid);
    else next.delete("finding");
    setParams(next, { replace: true });
  };

  const rerun = async () => {
    if (!brand) return;
    setRerunning(true);
    setStage(0);
    const result = runAudit(
      {
        auditId: audit.id,
        content: audit.revisedContent ?? audit.content,
        checks: audit.checks,
        brand,
        rules: state.rules,
        facts: state.facts,
        documents: state.documents,
        disclaimers: state.disclaimers,
        campaign: state.campaigns.find((c) => c.name === audit.campaignName),
        contentType: audit.contentType,
      },
    );
    void STAGES;
    setStage(STAGES.length);
    const newId = `${audit.id}_r${Date.now().toString(36)}`;
    createAudit({
      ...audit,
      id: newId,
      content: audit.revisedContent ?? audit.content,
      version: audit.version + 1,
      parentAuditId: audit.id,
      findings: result.findings,
      checksRun: result.checksRun,
      limitations: result.limitations,
      score: result.score,
      analysisMode: result.analysisMode,
      resultLabel: result.resultLabel,
      riskLevel: result.riskLevel,
      summaryText: result.summaryText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: isSampleWorkspace,
    });
    setRerunning(false);
    setRerunOpen(false);
    toast({ tone: "success", title: "Re-run complete", description: "A new audit version was created." });
    navigate(`/app/audits/${newId}`);
  };

  const doSubmit = () => {
    if (!can("submit_review")) return toast({ tone: "error", title: denyReason("submit_review") });
    const aid = submitForReview(audit.id);
    if (aid) {
      toast({ tone: "success", title: "Submitted for review", description: "A reviewer can now approve, reject or request changes." });
      navigate(`/app/approvals/${aid}`);
    }
  };

  const scoreTone = (s: number | null) => (s === null ? "text-ink-muted" : s >= 80 ? "text-ok" : s >= 55 ? "text-warn" : "text-bad");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/app/audits" className="mb-2 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft size={14} /> Audit history
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{audit.title}</h1>
            <StatusBadge status={audit.status} />
            {audit.isSample && <SampleBadge />}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {brand?.name ?? "Brand"} · {audit.contentType} · audited {formatDate(audit.createdAt)} · v{audit.version}
            {audit.campaignName ? ` · ${audit.campaignName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setExportOpen(true)}><Download size={15} /> Export</button>
          <button className="btn-secondary" onClick={() => setRerunOpen(true)}><RefreshCw size={15} /> Re-run audit</button>
          <Link to={`/app/rewrite?audit=${audit.id}`} className="btn-secondary"><PenLine size={15} /> Rewrite</Link>
          <button className="btn-primary" onClick={doSubmit} disabled={!can("submit_review")} title={can("submit_review") ? "Send to a reviewer" : denyReason("submit_review")}>
            <Send size={15} /> Submit for approval
          </button>
        </div>
      </div>

      {/* result label */}
      <InlineNotice tone={audit.analysisMode === "predefined_demo" ? "warning" : "info"} title={audit.resultLabel}>
        {audit.analysisMode === "predefined_demo"
          ? "These are predefined fictional demonstration results for the sample paragraph — no live model produced them."
          : "Findings were produced by local pattern and reference matching. No external AI service was contacted."}
      </InlineNotice>

      {/* summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Findings", value: counts.total, tone: "text-ink" },
          { label: "Critical / High", value: counts.high, tone: "text-bad" },
          { label: "Supported Claims", value: counts.supported, tone: "text-ok" },
          { label: "Need Review", value: counts.needs, tone: "text-warn" },
          { label: "Contradicted", value: counts.contradicted, tone: "text-bad" },
        ].map((c) => (
          <div key={c.label} className="surface p-4">
            <p className={cn("text-3xl font-bold tracking-tight", c.tone)}>{c.value}</p>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* score */}
        <div className="surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Brand compliance score</p>
          {audit.score.score === null ? (
            <>
              <p className="mt-3 text-lg font-semibold text-warn">Not enough information to calculate a reliable score.</p>
              <p className="mt-1 text-sm text-ink-muted">{audit.score.reason}</p>
            </>
          ) : (
            <div className="mt-3 flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#1C2740" strokeWidth="12" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={audit.score.score >= 80 ? "#22C55E" : audit.score.score >= 55 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - audit.score.score / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-2xl font-bold", scoreTone(audit.score.score))}>{audit.score.score}</span>
                  <span className="text-[10px] text-ink-muted">/100</span>
                </div>
              </div>
              <div className="min-w-0 text-xs text-ink-muted">
                <p className="leading-relaxed">{audit.score.reason}</p>
              </div>
            </div>
          )}
          <dl className="mt-4 space-y-1.5 border-t border-white/[0.07] pt-3 text-xs">
            {(audit.score.score === null ? [{ label: "Reason", detail: audit.score.reason }] : audit.score.factors).map((f) => (
              <div key={f.label} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{f.label}</dt>
                <dd className="text-right font-medium text-ink">{f.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* checks */}
        <div className="surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Check results</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Passed", value: completedChecks, cls: "text-ok border-ok/30" },
              { label: "Failed", value: failedChecks + counts.contradicted, cls: "text-bad border-bad/30" },
              { label: "Review", value: skippedChecks + counts.needs, cls: "text-warn border-warn/30" },
            ].map((s) => (
              <div key={s.label} className={cn("rounded-xl border bg-white/[0.02] py-3", s.cls)}>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[11px] text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {audit.checksRun.map((c) => (
              <li key={c.category} className="flex gap-2">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", c.status === "completed" ? "bg-ok" : c.status === "skipped" ? "bg-warn" : "bg-bad")} />
                <span>
                  <b className="text-ink">{c.category.replace(/_/g, " ")}</b> — <span className="text-ink-muted">{c.summary}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* limitations */}
        <div className="surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Limitations &amp; notes</p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-muted">
            {audit.limitations.map((l, i) => (
              <li key={i} className="flex gap-2"><span className="text-accent">•</span>{l}</li>
            ))}
            <li className="flex gap-2"><span className="text-accent">•</span>Open high-severity findings: {openHigh}.</li>
            <li className="flex gap-2"><span className="text-accent">•</span>Approval status: {approval?.status ?? "not submitted"}.</li>
          </ul>
          <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11px] text-ink-muted">
            The score summarises findings for triage. It does not guarantee legal compliance or factual accuracy.
          </p>
        </div>
      </div>

      {/* findings table */}
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Table2 size={16} /> Findings</h2>
            <p className="text-xs text-ink-muted">Click a row to open its evidence panel</p>
          </div>
          <div className="flex items-center gap-2 text-ink-muted"><Filter size={14} /></div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] px-5 py-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "chip transition-colors",
                filter === f.key ? "border-accent/50 bg-accent/15 text-accent" : "border-white/15 bg-white/5 text-ink-muted hover:text-ink",
              )}
              aria-pressed={filter === f.key}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto self-center text-[11px] text-ink-muted">{shown.length} shown</span>
        </div>

        {/* desktop */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Severity</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 font-semibold">Original Text</th>
                <th className="px-3 py-3 font-semibold">Explanation</th>
                <th className="px-3 py-3 font-semibold">Suggested Fix</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => openFinding(f.id)}
                  className={cn(
                    "cursor-pointer border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.04]",
                    f.reviewStatus !== "open" && "opacity-70",
                  )}
                >
                  <td className="px-5 py-3.5"><VerificationBadge status={f.verificationStatus} /></td>
                  <td className="px-3 py-3.5"><SeverityBadge severity={f.severity} /></td>
                  <td className="px-3 py-3.5 text-xs text-ink-muted">{f.category.replace(/_/g, " ")}</td>
                  <td className="max-w-[240px] px-3 py-3.5 text-ink">{f.originalExcerpt}</td>
                  <td className="max-w-[320px] px-3 py-3.5 text-xs text-ink-muted">{f.explanation}</td>
                  <td className="max-w-[240px] px-3 py-3.5 text-xs text-accent-cyan">{f.suggestedCorrection ?? f.suggestedAction ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="btn-secondary !px-3 !py-1.5 !text-xs">Evidence <ArrowRight size={12} /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile */}
        <div className="divide-y divide-white/[0.05] lg:hidden">
          {shown.map((f) => (
            <button key={f.id} onClick={() => openFinding(f.id)} className="block w-full px-5 py-4 text-left hover:bg-white/[0.03]">
              <div className="flex flex-wrap items-center gap-2">
                <VerificationBadge status={f.verificationStatus} />
                <SeverityBadge severity={f.severity} />
              </div>
              <p className="mt-2 text-sm text-ink">{f.originalExcerpt}</p>
              <p className="mt-1 text-xs text-ink-muted">{f.explanation}</p>
            </button>
          ))}
        </div>

        {shown.length === 0 && (
          <div className="p-5">
            <EmptyState
              icon={<CheckCircle2 size={20} />}
              title="No findings match this filter"
              body="Try a different filter to see other findings for this audit."
            />
          </div>
        )}
      </div>

      {/* evidence drawer */}
      {selected && <EvidencePanel audit={audit} finding={selected} onClose={() => openFinding(null)} />}

      {/* export modal */}
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export audit" description="Exports contain audit data only — never credentials or secrets.">
        <div className="space-y-3">
          {[
            { icon: Table2, label: "CSV findings export", hint: "One row per finding, with evidence and review status", action: () => { downloadAuditCSV(audit, brand); toast({ tone: "success", title: "CSV downloaded" }); } },
            { icon: FileJson, label: "JSON audit data", hint: "Full structured audit including checks, limitations and content", action: () => { downloadAuditJSON(audit, brand, workspace); toast({ tone: "success", title: "JSON downloaded" }); } },
            { icon: Printer, label: "PDF report (print)", hint: "Opens your browser's print dialog — choose “Save as PDF”", action: () => { setExportOpen(false); setTimeout(() => window.print(), 150); } },
          ].map((o) => (
            <button key={o.label} onClick={o.action} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-colors hover:border-accent/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent"><o.icon size={17} /></span>
              <span>
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="block text-xs text-ink-muted">{o.hint}</span>
              </span>
            </button>
          ))}
          <InlineNotice tone="info">
            No server-side PDF renderer is configured in this deployment, so PDF export uses your browser&apos;s print
            engine. If a print or download fails, close the dialog and try again.
          </InlineNotice>
        </div>
      </Modal>

      {/* rerun modal */}
      <Modal open={rerunOpen} onClose={() => setRerunOpen(false)} title="Re-run this audit" description="Re-evaluates the current content against your latest rules and facts.">
        <div className="space-y-4">
          <InlineNotice tone="info">
            A new audit version is created — the existing record and its history are preserved.
          </InlineNotice>
          {rerunning && (
            <ol className="space-y-2">
              {STAGES.map((s, i) => (
                <li key={s} className={cn("flex items-center gap-2 text-sm", i <= stage ? "text-ink" : "text-ink-muted")}>
                  <span className={cn("h-2 w-2 rounded-full", i < stage ? "bg-ok" : i === stage ? "bg-accent animate-pulseSoft" : "bg-white/20")} />
                  {s}
                </li>
              ))}
            </ol>
          )}
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setRerunOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={rerun} disabled={rerunning}>
              {rerunning ? "Re-running…" : <><RefreshCw size={15} /> Re-run now</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
