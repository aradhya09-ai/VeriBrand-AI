import { useEffect, useMemo, useState } from "react";
import { Check, GitCompareArrows, Loader2, PenLine, Play, Save, ShieldCheck, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState, InlineNotice, SectionHeader, SampleBadge, useToast } from "../components/ui";
import { applyEdits, generateRewrite } from "../lib/rewrite";
import { runAudit } from "../lib/auditEngine";
import { REWRITE_MODES, type Audit, type Rewrite, type RewriteMode } from "../lib/types";
import { useApp } from "../lib/store";
import { cn, diffWords, uid } from "../lib/utils";

export default function RewriteStudio() {
  const { state, brand, workspace, user, can, denyReason, saveRewrite, createAudit, isSampleWorkspace } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const auditId = params.get("audit") ?? "";
  const audit: Audit | undefined = state.audits.find((a) => a.id === auditId);
  const [mode, setMode] = useState<RewriteMode>("fix_brand_violations");
  const [edits, setEdits] = useState<ReturnType<typeof generateRewrite>["edits"] | null>(null);
  const [original, setOriginal] = useState("");
  const [manual, setManual] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(auditId);
  const editable = can("edit_content");

  // Load content when arriving with ?audit= (deep link from results/history).
  useEffect(() => {
    if (!audit || original) return;
    setOriginal(audit.revisedContent ?? audit.content);
    setPicked(audit.id);
  }, [audit, original]);

  const source = manual ?? original;
  const revised = useMemo(() => (edits ? applyEdits(original, edits) : source), [edits, original, source]);

  const load = (id: string) => {
    const a = state.audits.find((x) => x.id === id);
    if (!a) return;
    setOriginal(a.revisedContent ?? a.content);
    setManual(null);
    setEdits(null);
    setParams({ audit: a.id });
  };

  const generate = () => {
    if (!brand) return;
    if (!original.trim()) return toast({ tone: "error", title: "Load or paste content first" });
    setBusy(true);
    const findings = audit?.findings.filter((f) => f.reviewStatus !== "resolved" && f.reviewStatus !== "false_positive") ?? [];
    const res = generateRewrite({
      content: original,
      findings,
      mode,
      disclaimers: state.disclaimers,
      contentType: audit?.contentType ?? "General marketing content",
      brandAvoid: [...brand.wordsAvoid, ...brand.tone.avoidPhrases],
    });
    setEdits(res.edits);
    setManual(null);
    setBusy(false);
    toast({
      tone: res.edits.length ? "success" : "info",
      title: `${res.edits.length} proposed edit(s)`,
      description: res.edits.length ? "Review each change below — nothing is applied until you audit it." : "No automated edits apply to this mode for the selected content.",
    });
  };

  const saveDraft = () => {
    if (!audit) return;
    const rewrite: Rewrite = {
      id: uid("rw"),
      auditId: audit.id,
      originalContent: original,
      revisedContent: revised,
      mode,
      edits: edits ?? [],
      createdAt: new Date().toISOString(),
      createdBy: user?.id ?? "u_demo",
      isSample: isSampleWorkspace,
    };
    saveRewrite(rewrite);
    toast({ tone: "success", title: "Draft saved", description: "The revision is stored with this workspace." });
  };

  const auditRevised = () => {
    if (!brand || !audit) return;
    const now = new Date().toISOString();
    const id = uid("aud");
    const result = runAudit({
      auditId: id,
      content: revised,
      checks: audit.checks,
      brand,
      rules: state.rules,
      facts: state.facts,
      documents: state.documents,
      disclaimers: state.disclaimers,
      campaign: state.campaigns.find((c) => c.name === audit.campaignName),
      contentType: audit.contentType,
    });
    createAudit({
      ...audit,
      id,
      content: revised,
      title: `${audit.title} — revised`,
      version: audit.version + 1,
      parentAuditId: audit.id,
      status: result.findings.filter((f) => f.verificationStatus !== "SUPPORTED").length ? "needs_review" : "draft",
      findings: result.findings,
      checksRun: result.checksRun,
      limitations: result.limitations,
      score: result.score,
      analysisMode: result.analysisMode,
      resultLabel: result.resultLabel,
      riskLevel: result.riskLevel,
      summaryText: result.summaryText,
      createdAt: now,
      updatedAt: now,
      isSample: isSampleWorkspace,
    });
    toast({ tone: "success", title: "Revised content audited", description: result.summaryText });
    navigate(`/app/audits/${id}`);
  };

  const acceptedCount = edits?.filter((e) => e.accepted).length ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <SectionHeader
        title="Rewrite Studio"
        description="Improve content while preserving intent. Every proposed change shows what changed, why, and which finding or source supports it."
        actions={isSampleWorkspace && <SampleBadge />}
      />

      {!editable && <InlineNotice tone="warning" title="Read-only role">{denyReason("edit_content")}</InlineNotice>}

      {/* toolbar */}
      <div className="surface grid gap-4 p-5 lg:grid-cols-4">
        <div>
          <label htmlFor="src-audit" className="field-label">Source audit</label>
          <select
            id="src-audit"
            className="input"
            value={picked}
            onChange={(e) => { setPicked(e.target.value); load(e.target.value); }}
          >
            <option value="">Choose an audit…</option>
            {state.audits.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="mode" className="field-label">Rewrite mode</label>
          <select id="mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as RewriteMode)}>
            {REWRITE_MODES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-muted">{REWRITE_MODES.find((m) => m.key === mode)?.description}</p>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary flex-1" onClick={generate} disabled={!editable || !original}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Generate revision
          </button>
          <button className="btn-secondary" onClick={saveDraft} disabled={!audit || !editable} title="Save draft">
            <Save size={15} />
          </button>
        </div>
      </div>

      {!audit ? (
        <EmptyState
          icon={<GitCompareArrows size={20} />}
          title="Select an audit to rewrite"
          body="Choose a source audit above, or run a new audit first. Load the Nova Bottle sample audit from Audit History to see the documented flow."
          action={<Link to="/app/audit/new" className="btn-primary">Run a new audit</Link>}
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            {/* original */}
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
                <p className="text-sm font-semibold text-ink">Original content</p>
                <span className="text-[11px] text-ink-muted">{original.trim().length} characters</span>
              </div>
              <div className="max-h-[52vh] overflow-y-auto p-5 text-sm leading-relaxed text-ink-muted">
                {edits ? (
                  <p>
                    {(() => {
                      // render original with accepted spans highlighted
                      const sorted = [...edits].sort((a, b) => a.start - b.start);
                      const nodes: React.ReactNode[] = [];
                      let cursor = 0;
                      sorted.forEach((e) => {
                        if (e.start < cursor) return;
                        nodes.push(<span key={`t${e.id}`}>{original.slice(cursor, e.start)}</span>);
                        nodes.push(
                          <span
                            key={`h${e.id}`}
                            className={cn(
                              "rounded px-1",
                              e.accepted ? "bg-bad/15 text-bad underline decoration-bad/40" : "bg-white/5 text-ink-muted line-through decoration-white/30",
                            )}
                          >
                            {original.slice(e.start, e.end) || "∅"}
                          </span>,
                        );
                        cursor = e.end;
                      });
                      nodes.push(<span key="tail">{original.slice(cursor)}</span>);
                      return nodes;
                    })()}
                  </p>
                ) : (
                  <p className="whitespace-pre-wrap">{original}</p>
                )}
              </div>
            </div>

            {/* revised */}
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
                <p className="text-sm font-semibold text-ink">Suggested revision</p>
                <div className="flex gap-2">
                  <button className="btn-ghost !px-2 !py-1 !text-xs" onClick={() => setManual(manual === null ? revised : null)}>
                    <PenLine size={12} /> {manual === null ? "Edit manually" : "Back to suggestions"}
                  </button>
                </div>
              </div>
              {manual !== null ? (
                <textarea
                  className="min-h-[52vh] w-full bg-transparent p-5 text-sm leading-relaxed text-ink outline-none"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  aria-label="Manually edited revision"
                />
              ) : (
                <div className="max-h-[52vh] overflow-y-auto p-5 text-sm leading-relaxed text-ink">
                  {edits ? (
                    <p className="whitespace-pre-wrap">
                      {(() => {
                        const accepted = edits.filter((e) => e.accepted).sort((a, b) => a.start - b.start);
                        const nodes: React.ReactNode[] = [];
                        let cursor = 0;
                        accepted.forEach((e) => {
                          if (e.start < cursor) return;
                          nodes.push(<span key={`s${e.id}`}>{original.slice(cursor, e.start)}</span>);
                          nodes.push(
                            <span key={`a${e.id}`} className="rounded bg-ok/15 px-1 text-ok">
                              {e.after || <span className="opacity-60">(removed)</span>}
                            </span>,
                          );
                          cursor = e.end;
                        });
                        nodes.push(<span key="tail2">{original.slice(cursor)}</span>);
                        return nodes;
                      })()}
                    </p>
                  ) : (
                    <p className="whitespace-pre-wrap text-ink-muted">{source}</p>
                  )}
                  {!edits && <p className="mt-3 text-xs text-ink-muted">Generate a revision to compare versions side by side.</p>}
                </div>
              )}
            </div>
          </div>

          {/* edit list */}
          {edits && (
            <div className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Proposed changes ({edits.length})</p>
                  <p className="text-xs text-ink-muted">{acceptedCount} accepted · {edits.length - acceptedCount} rejected</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary !py-1.5 !text-xs" onClick={() => setEdits(edits.map((e) => ({ ...e, accepted: true })))}>Accept all</button>
                  <button className="btn-secondary !py-1.5 !text-xs" onClick={() => setEdits(edits.map((e) => ({ ...e, accepted: false })))}>Reject all</button>
                </div>
              </div>
              <ul className="divide-y divide-white/[0.05]">
                {edits.map((e) => {
                  const finding = e.findingId ? audit.findings.find((f) => f.id === e.findingId) : undefined;
                  return (
                    <li key={e.id} className={cn("px-5 py-4", !e.accepted && "opacity-60")}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{e.what}</p>
                          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{e.why}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="chip border-accent/30 bg-accent/10 text-accent">{e.basis.type}: {e.basis.label}</span>
                            {finding && (
                              <span className={cn("chip", finding.verificationStatus === "CONTRADICTED" ? "border-bad/35 bg-bad/10 text-bad" : "border-warn/35 bg-warn/10 text-warn")}>
                                {finding.verificationStatus}
                              </span>
                            )}
                          </div>
                          {(e.before || e.after) && (
                            <div className="mt-2 rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 font-mono text-xs">
                              <span className="text-bad">− {e.before || "(insert)"}</span>
                              <br />
                              <span className="text-ok">+ {e.after || "(remove)"}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            className={cn(e.accepted ? "btn-primary" : "btn-secondary", "!px-3 !py-1.5 !text-xs")}
                            onClick={() => setEdits(edits.map((x) => (x.id === e.id ? { ...x, accepted: true } : x)))}
                          >
                            <Check size={13} /> Accept
                          </button>
                          <button
                            className={cn(!e.accepted ? "btn-danger" : "btn-secondary", "!px-3 !py-1.5 !text-xs")}
                            onClick={() => setEdits(edits.map((x) => (x.id === e.id ? { ...x, accepted: false } : x)))}
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-4">
                <p className="max-w-2xl text-[11px] leading-relaxed text-ink-muted">
                  The original content is never modified automatically. Unresolved claims stay flagged: a revision is
                  not “verified” until you run it through an audit again.
                </p>
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={saveDraft} disabled={!editable}><Save size={15} /> Save draft</button>
                  <button className="btn-primary" onClick={auditRevised} disabled={!editable}>
                    <ShieldCheck size={15} /> Audit Revised Content
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* word diff preview */}
          {edits && (
            <div className="surface p-5">
              <p className="text-sm font-semibold text-ink">Plain-text diff</p>
              <div className="mt-2 rounded-xl border border-white/[0.07] bg-base-soft/60 p-4 font-mono text-xs leading-relaxed">
                {diffWords(original, revised).map((d, i) => (
                  <span
                    key={i}
                    className={d.type === "add" ? "bg-ok/20 text-ok" : d.type === "del" ? "bg-bad/20 text-bad line-through" : "text-ink-muted"}
                  >
                    {d.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
