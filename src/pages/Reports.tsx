import { useState } from "react";
import { Download, FileJson, Printer, Table2 } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, InlineNotice, SampleBadge, SectionHeader, SeverityBadge, StatusBadge, VerificationBadge, useToast } from "../components/ui";
import { downloadAuditCSV, downloadAuditJSON } from "../lib/exporters";
import { useApp } from "../lib/store";
import { cn, formatDate, truncate } from "../lib/utils";

export default function Reports() {
  const { state, brand, workspace, isSampleWorkspace } = useApp();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(state.audits[0]?.id ?? null);
  const audit = state.audits.find((a) => a.id === selectedId) ?? null;

  if (state.audits.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <SectionHeader title="Reports" description="Export audit summaries, findings, evidence and review status." />
        <EmptyState icon={<Download size={20} />} title="No audits to report on yet" body="Run an audit first — reports are generated from audit records." action={<Link to="/app/audit/new" className="btn-primary">Run an audit</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="no-print">
        <SectionHeader
          title="Reports & Exports"
          description="Export audit summaries, content metadata, verification statuses, findings, evidence, suggested corrections, reviewer comments and approval status."
          actions={isSampleWorkspace && <SampleBadge />}
        />
        <InlineNotice tone="info" title="Export contents">
          Exports include audit data only — no credentials, tokens or private contact details. If an export fails,
          check your browser&apos;s download permission and try again.
        </InlineNotice>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* picker */}
        <div className="no-print space-y-4">
          <div className="surface p-4">
            <p className="mb-2 text-sm font-semibold text-ink">Choose an audit</p>
            <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {state.audits.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    selectedId === a.id ? "border-accent/50 bg-accent/10" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20",
                  )}
                >
                  <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                  <span className="block text-[11px] text-ink-muted">{a.contentType} · {formatDate(a.createdAt)} · {a.findings.length} findings</span>
                </button>
              ))}
            </div>
          </div>

          {audit && (
            <div className="surface space-y-2 p-4">
              <p className="text-sm font-semibold text-ink">Export “{truncate(audit.title, 40)}”</p>
              <button className="btn-secondary w-full justify-start" onClick={() => { downloadAuditCSV(audit, brand); toast({ tone: "success", title: "CSV findings downloaded" }); }}>
                <Table2 size={15} /> CSV findings export
              </button>
              <button className="btn-secondary w-full justify-start" onClick={() => { downloadAuditJSON(audit, brand, workspace); toast({ tone: "success", title: "JSON audit data downloaded" }); }}>
                <FileJson size={15} /> JSON audit data
              </button>
              <button className="btn-primary w-full justify-start" onClick={() => window.print()}>
                <Printer size={15} /> PDF report (print / save as PDF)
              </button>
              <p className="pt-1 text-[11px] leading-relaxed text-ink-muted">
                This deployment has no server-side PDF renderer, so the report below is printed through your browser.
                Choose “Save as PDF” in the print dialog.
              </p>
              <Link to={`/app/audits/${audit.id}`} className="btn-ghost w-full">Open full audit view</Link>
            </div>
          )}
        </div>

        {/* printable report */}
        <div className="lg:col-span-2">
          {!audit ? (
            <EmptyState title="Nothing selected" body="Pick an audit from the list to preview its report." />
          ) : (
            <article className="surface overflow-hidden">
              <div className="border-b border-white/[0.07] bg-gradient-to-r from-accent/15 to-transparent px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">VeriBrand AI — Audit Report</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{audit.title}</h1>
                    <p className="mt-1 text-sm text-ink-muted">
                      {brand?.name} · {audit.contentType} · {formatDate(audit.createdAt)} · v{audit.version}
                    </p>
                  </div>
                  <StatusBadge status={audit.status} />
                </div>
              </div>

              <div className="space-y-6 p-6">
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">Summary</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      { l: "Findings", v: audit.findings.length },
                      { l: "Critical/High", v: audit.findings.filter((f) => f.severity === "critical" || f.severity === "high").length },
                      { l: "Supported", v: audit.findings.filter((f) => f.verificationStatus === "SUPPORTED").length },
                      { l: "Need review", v: audit.findings.filter((f) => f.verificationStatus === "NEEDS_REVIEW").length },
                      { l: "Contradicted", v: audit.findings.filter((f) => f.verificationStatus === "CONTRADICTED").length },
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-center">
                        <p className="text-xl font-bold text-ink">{s.v}</p>
                        <p className="text-[11px] text-ink-muted">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{audit.summaryText}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Compliance score: <b className="text-ink">{audit.score.score ?? "n/a"}</b> — {audit.score.reason}
                  </p>
                </section>

                <section>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">Analysis provenance</h2>
                  <p className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-xs leading-relaxed text-ink-muted">
                    {audit.resultLabel}
                  </p>
                </section>

                <section>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">Findings &amp; evidence</h2>
                  <div className="mt-3 space-y-3">
                    {audit.findings.map((f, i) => (
                      <div key={f.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-ink-muted">#{i + 1}</span>
                          <VerificationBadge status={f.verificationStatus} />
                          <SeverityBadge severity={f.severity} />
                          <span className="chip border-white/15 bg-white/5 text-ink-muted">{f.category.replace(/_/g, " ")}</span>
                        </div>
                        <p className="mt-2 text-sm text-ink">“{f.originalExcerpt}”</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{f.explanation}</p>
                        <div className="mt-2 space-y-1 text-xs">
                          {f.evidence.filter((e) => e.type !== "none").map((e, j) => (
                            <p key={j} className="text-ink-muted">
                              <b className="text-ink">Evidence:</b> {e.label}
                              {e.sourceLabel ? ` — ${e.sourceLabel}` : ""}
                              {e.passage ? ` — “${truncate(e.passage, 140)}”` : ""}
                            </p>
                          ))}
                          {!f.evidence.some((e) => e.type !== "none") && (
                            <p className="text-warn">Evidence: no approved evidence was found to verify this claim.</p>
                          )}
                          <p className="text-accent-cyan">
                            <b className="text-ink">Recommended action:</b> {f.suggestedAction ?? (f.suggestedCorrection ? `Apply: ${f.suggestedCorrection}` : "Human review")}
                          </p>
                          <p className="text-ink-muted">
                            <b className="text-ink">Review status:</b> {f.reviewStatus.replace(/_/g, " ")}
                            {f.resolutionNote ? ` — ${f.resolutionNote}` : ""}
                            {f.falsePositiveReason ? ` — false positive: ${f.falsePositiveReason}` : ""}
                          </p>
                          {f.comments.length > 0 && (
                            <p className="text-ink-muted">
                              <b className="text-ink">Comments:</b> {f.comments.map((c) => `${c.authorName}: ${c.body}`).join(" | ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {audit.findings.length === 0 && <p className="text-sm text-ink-muted">No findings recorded for this audit.</p>}
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">Limitations</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-muted">
                    {audit.limitations.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </section>

                <section>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-muted">Review status</h2>
                  {(() => {
                    const approval = state.approvals.find((a) => a.auditId === audit.id);
                    return (
                      <p className="mt-2 text-sm text-ink-muted">
                        {approval
                          ? `${approval.status.replace(/_/g, " ")} — submitter ${approval.submitterName}, reviewer ${approval.reviewerName ?? "unassigned"}, ${approval.decisions.length} decision(s) recorded.`
                          : "Not submitted for approval."}
                      </p>
                    );
                  })()}
                </section>

                <footer className="border-t border-white/[0.07] pt-4 text-[11px] leading-relaxed text-ink-muted">
                  Generated by VeriBrand AI on {formatDate(new Date().toISOString())}. This report is decision support
                  and does not guarantee legal compliance or factual accuracy.
                </footer>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
