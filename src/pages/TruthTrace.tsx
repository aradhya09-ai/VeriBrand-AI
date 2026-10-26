import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, HelpCircle, SearchCheck, ShieldAlert, Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { InlineNotice, SampleBadge, SectionHeader, VerificationBadge, EmptyState } from "../components/ui";
import { traceClaim, type TraceResult } from "../lib/auditEngine";
import { useApp } from "../lib/store";
import { cn, truncate } from "../lib/utils";

const EXAMPLES = [
  {
    label: "Contradiction example",
    claim: "Our bottle keeps drinks cold for 72 hours.",
    note: "Fictional demonstration example — the approved spec states 48 hours.",
  },
  {
    label: "Missing evidence example",
    claim: "Our bottle is the world's best-selling insulated bottle.",
    note: "Fictional demonstration example — no approved sales ranking exists, so this must be NEEDS REVIEW, never CONTRADICTED.",
  },
];

export default function TruthTrace() {
  const { state, brand } = useApp();
  const [claim, setClaim] = useState("");
  const [result, setResult] = useState<TraceResult | null>(null);
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const ctx = useMemo(
    () =>
      brand
        ? {
            brand,
            rules: state.rules,
            facts: state.facts,
            documents: state.documents,
            disclaimers: state.disclaimers,
            contentType: "General marketing content",
          }
        : null,
    [brand, state.rules, state.facts, state.documents, state.disclaimers],
  );

  const trace = (text: string) => {
    if (!ctx) return;
    setClaim(text);
    setResult(traceClaim(text, ctx));
  };

  const allClaims = useMemo(
    () =>
      state.audits.flatMap((a) =>
        a.findings
          .filter((f) => f.category === "factual_accuracy" || f.category === "unsupported_claim")
          .map((f) => ({ audit: a, finding: f })),
      ),
    [state.audits],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <SectionHeader
        title="TruthTrace"
        description="Examine how a single claim relates to your approved evidence — with the reasoning, the limitations and the recommended action spelled out."
        actions={<SampleBadge note="Evidence-first verification" />}
      />

      <InlineNotice tone="info" title="Three statuses, never blurred">
        <b>SUPPORTED</b> — approved evidence backs the claim. <b>NEEDS REVIEW</b> — evidence is missing, ambiguous or
        outdated (a missing source is never treated as a contradiction). <b>CONTRADICTED</b> — approved evidence
        conflicts with the claim.
      </InlineNotice>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* input */}
        <div className="space-y-4 lg:col-span-2">
          <div className="surface p-5">
            <label htmlFor="claim" className="field-label">Claim to examine</label>
            <textarea
              id="claim"
              className="input min-h-32"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="Paste a sentence or claim — e.g. “Our bottle keeps drinks cold for 72 hours.”"
            />
            <button
              className="btn-primary mt-3 w-full"
              onClick={() => trace(claim)}
              disabled={!claim.trim() || !ctx}
            >
              <SearchCheck size={16} /> Trace this claim
            </button>
            {!ctx && <p className="mt-2 text-xs text-warn">No brand configured — add a brand in Brand DNA Studio first.</p>}
          </div>

          <div className="surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles size={15} className="text-accent" /> Documented examples</p>
            <div className="mt-3 space-y-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setActiveExample(ex.label); trace(ex.claim); }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    activeExample === ex.label ? "border-accent/50 bg-accent/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">{ex.label}</span>
                    <ArrowRight size={13} className="text-ink-muted" />
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">“{ex.claim}”</span>
                  <span className="mt-1 block text-[11px] text-accent-cyan">{ex.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <p className="text-sm font-semibold text-ink">Claims already in your audits</p>
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
              {allClaims.map(({ audit, finding }) => (
                <button
                  key={finding.id}
                  onClick={() => trace(finding.originalExcerpt)}
                  className="flex w-full items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 text-left hover:border-white/20"
                >
                  <VerificationBadge status={finding.verificationStatus} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-ink">{finding.originalExcerpt}</span>
                    <span className="block text-[11px] text-ink-muted">{truncate(audit.title, 34)}</span>
                  </span>
                </button>
              ))}
              {allClaims.length === 0 && <p className="text-xs text-ink-muted">No claim findings recorded yet.</p>}
            </div>
          </div>
        </div>

        {/* result */}
        <div className="lg:col-span-3">
          {!result ? (
            <EmptyState
              icon={<SearchCheck size={20} />}
              title="No claim traced yet"
              body="Enter a claim or pick a documented example to see the evidence, reasoning, limitations and recommended action."
            />
          ) : (
            <div className="space-y-4">
              <div className="surface overflow-hidden">
                <div className={cn(
                  "flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4",
                  result.status === "SUPPORTED" ? "border-ok/30 bg-ok/[0.07]"
                    : result.status === "CONTRADICTED" ? "border-bad/30 bg-bad/[0.07]"
                      : "border-warn/30 bg-warn/[0.07]",
                )}>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Claim</p>
                    <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink">“{result.claim}”</p>
                  </div>
                  <VerificationBadge status={result.status} />
                </div>

                <div className="space-y-4 p-5">
                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      <BookOpen size={12} /> Evidence
                    </p>
                    <div className="mt-2 space-y-2">
                      {result.evidence.filter((e) => e.type !== "none").map((e, i) => (
                        <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                          <p className="text-sm font-medium text-ink">{e.label}</p>
                          {e.sourceLabel && <p className="text-xs text-ink-muted">Source: {e.sourceLabel}</p>}
                          {e.passage && <blockquote className="mt-1.5 border-l-2 border-accent/60 pl-3 text-xs italic text-ink-muted">{e.passage}</blockquote>}
                        </div>
                      ))}
                      {!result.evidence.some((e) => e.type !== "none") && (
                        <div className="rounded-xl border border-warn/30 bg-warn/[0.07] p-3 text-sm text-ink">
                          No approved evidence was found to verify this claim.
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      <Target size={12} /> Reasoning
                    </p>
                    <p className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm leading-relaxed text-ink">
                      {result.reasoning}
                    </p>
                  </section>

                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      <ShieldAlert size={12} /> Limitations
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                      {result.limitations.length ? result.limitations.map((l, i) => <li key={i} className="flex gap-2"><span className="text-warn">•</span>{l}</li>) : <li>No additional limitations recorded for this trace.</li>}
                      <li className="flex gap-2"><span className="text-warn">•</span>Only approved references in this workspace were consulted.</li>
                    </ul>
                  </section>

                  <section className="rounded-xl border border-accent/30 bg-accent/[0.08] p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                      <HelpCircle size={12} /> Recommended action
                    </p>
                    <p className="mt-1.5 text-sm text-ink">{result.recommendedAction}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to="/app/audit/new" className="btn-secondary !py-2 !text-xs">Audit new content</Link>
                      <Link to="/app/brand?tab=facts" className="btn-secondary !py-2 !text-xs">Add an approved source</Link>
                      <Link to="/app/rewrite" className="btn-secondary !py-2 !text-xs">Open Rewrite Studio</Link>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
