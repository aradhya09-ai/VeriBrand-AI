import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useApp } from "../../lib/store";
import { EmptyState, Field, InlineNotice, Modal, SampleBadge, useConfirm, useToast } from "../../components/ui";
import { cn, formatDate, relativeDays } from "../../lib/utils";
import type { ApprovedFact, FactCategory } from "../../lib/types";

const FACT_CATEGORIES: FactCategory[] = [
  "Specification",
  "Pricing",
  "Availability",
  "Performance",
  "Dates & campaigns",
  "Warranty",
  "Other",
];

export type Freshness = "Current" | "Review Soon" | "Expired" | "Needs Verification";

export function freshnessOf(f: ApprovedFact): Freshness {
  if (f.verificationStatus === "unverified") return "Needs Verification";
  if (f.verificationStatus === "disputed") return "Needs Verification";
  const days = relativeDays(f.expiresAt);
  if (days !== null && days < 0) return "Expired";
  if (days !== null && days <= 30) return "Review Soon";
  const sinceVerify = relativeDays(f.lastVerifiedAt);
  if (sinceVerify !== null && sinceVerify < -180) return "Review Soon";
  return "Current";
}

const FRESH_TONE: Record<Freshness, string> = {
  Current: "border-ok/35 bg-ok/10 text-ok",
  "Review Soon": "border-info/35 bg-info/10 text-info",
  Expired: "border-warn/35 bg-warn/10 text-warn",
  "Needs Verification": "border-bad/35 bg-bad/10 text-bad",
};

const emptyDraft = {
  title: "",
  value: "",
  description: "",
  category: "Specification" as FactCategory,
  numericValue: "",
  unit: "ml",
  sourceLabel: "",
  sourceUrl: "",
  verificationStatus: "verified" as ApprovedFact["verificationStatus"],
  expiresAt: "",
  owner: "",
};

type FactDraft = { id?: string } & typeof emptyDraft;

export default function FactsTab({ active }: { active: boolean }) {
  const { state, brand, can, denyReason, saveFact, deleteFact } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [freshFilter, setFreshFilter] = useState("all");
  const [draft, setDraft] = useState<FactDraft | null>(null);
  const editable = can("edit_brand");

  const facts = useMemo(() => state.facts.filter((f) => f.brandId === brand?.id), [state.facts, brand]);

  const rows = facts.filter((f) => {
    const q = query.trim().toLowerCase();
    const mq = !q || f.title.toLowerCase().includes(q) || f.value.toLowerCase().includes(q) || f.sourceLabel.toLowerCase().includes(q);
    const mf = freshFilter === "all" || freshnessOf(f) === freshFilter;
    return mq && mf;
  });

  if (!active) return null;

  const parseNumeric = (value: string): { numericValue?: number; unit?: string } => {
    const m = value.match(/^([\d]+(?:[.,][\d]+)?)\s*(ml|l|litres?|liters?|hours?|hrs?|days?|months?|g|kg|£|\$)?/i);
    if (!m) return {};
    const num = parseFloat(m[1].replace(",", "."));
    const u = (m[2] ?? "").toLowerCase();
    let unit: string | undefined;
    if (u === "ml") unit = "ml";
    else if (["l", "litre", "litres", "liter", "liters"].includes(u)) unit = "ml";
    else if (["hour", "hours", "hr", "hrs"].includes(u)) unit = "hours";
    else if (u === "day" || u === "days") unit = "hours";
    else if (u === "month" || u === "months") unit = "months";
    else if (["g", "gram", "grams"].includes(u)) unit = "g";
    else if (u === "kg") unit = "g";
    else if (u === "£") unit = "GBP";
    else if (u === "$") unit = "USD";
    return unit ? { numericValue: num, unit } : {};
  };

  const save = () => {
    if (!draft || !brand) return;
    if (!draft.title.trim() || !draft.value.trim()) return toast({ tone: "error", title: "Title and value are required" });
    const parsed = parseNumeric(draft.value.trim());
    saveFact({
      id: draft.id,
      brandId: brand.id,
      title: draft.title.trim(),
      value: draft.value.trim(),
      description: draft.description.trim(),
      category: draft.category,
      sourceLabel: draft.sourceLabel.trim() || "No source recorded",
      sourceUrl: draft.sourceUrl.trim() || undefined,
      verificationStatus: draft.verificationStatus,
      lastVerifiedAt: new Date().toISOString(),
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : undefined,
      owner: draft.owner.trim() || "Unassigned",
      ...parsed,
    });
    toast({ tone: "success", title: draft.id ? "Fact updated" : "Approved fact added" });
    setDraft(null);
  };

  const counts = {
    all: facts.length,
    Current: facts.filter((f) => freshnessOf(f) === "Current").length,
    "Review Soon": facts.filter((f) => freshnessOf(f) === "Review Soon").length,
    Expired: facts.filter((f) => freshnessOf(f) === "Expired").length,
    "Needs Verification": facts.filter((f) => freshnessOf(f) === "Needs Verification").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search facts, values, sources…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search approved facts" />
        </div>
        <select className="input w-auto" value={freshFilter} onChange={(e) => setFreshFilter(e.target.value)} aria-label="Filter by freshness">
          <option value="all">All freshness ({counts.all})</option>
          {(["Current", "Review Soon", "Expired", "Needs Verification"] as Freshness[]).map((f) => (
            <option key={f} value={f}>{f} ({counts[f]})</option>
          ))}
        </select>
        <button
          className="btn-primary"
          onClick={() => setDraft({ ...emptyDraft })}
          disabled={!editable}
          title={editable ? "Add an approved fact" : denyReason("edit_brand")}
        >
          <Plus size={15} /> Add fact
        </button>
      </div>

      <InlineNotice tone="info" title="How freshness works">
        An expired fact is <b>not</b> treated as false — it is flagged for verification. Update the value only after a
        human confirms the new information against the source.
      </InlineNotice>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={20} />}
          title="No approved facts yet"
          body="Approved facts are the knowledge base the audit engine checks measurable claims against (capacities, durations, prices, dates)."
          action={editable ? <button className="btn-primary" onClick={() => setDraft({ ...emptyDraft })}>Add the first fact</button> : undefined}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((f) => {
            const fresh = freshnessOf(f);
            return (
              <article key={f.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-ink">{f.title}</h3>
                      <span className={cn("chip", FRESH_TONE[fresh])}>
                        {fresh !== "Current" && <AlertTriangle size={11} />}
                        {fresh}
                      </span>
                      {f.isSample && <SampleBadge />}
                    </div>
                    <p className="mt-1 text-lg font-semibold text-accent-cyan">{f.value}</p>
                    {f.description && <p className="mt-1 text-sm text-ink-muted">{f.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      className="btn-ghost !px-2"
                      title="Edit fact"
                      aria-label={`Edit ${f.title}`}
                      disabled={!editable}
                      onClick={() =>
                        setDraft({
                          id: f.id,
                          title: f.title,
                          value: f.value,
                          description: f.description,
                          category: f.category,
                          numericValue: f.numericValue !== undefined ? String(f.numericValue) : "",
                          unit: f.unit ?? "ml",
                          sourceLabel: f.sourceLabel,
                          sourceUrl: f.sourceUrl ?? "",
                          verificationStatus: f.verificationStatus,
                          expiresAt: f.expiresAt ? f.expiresAt.slice(0, 10) : "",
                          owner: f.owner,
                        })
                      }
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn-ghost !px-2"
                      title="Mark verified today"
                      aria-label={`Mark ${f.title} verified`}
                      disabled={!editable}
                      onClick={() => {
                        saveFact({ id: f.id, brandId: f.brandId, lastVerifiedAt: new Date().toISOString(), verificationStatus: "verified" });
                        toast({ tone: "success", title: "Fact marked verified", description: "Last verified date updated to today." });
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="btn-ghost !px-2 hover:text-bad"
                      title="Delete fact"
                      aria-label={`Delete ${f.title}`}
                      disabled={!editable}
                      onClick={async () => {
                        const ok = await confirm({ title: "Delete this approved fact?", body: `“${f.title}” will no longer be used to verify claims.`, confirmLabel: "Delete", tone: "danger" });
                        if (ok) {
                          deleteFact(f.id);
                          toast({ tone: "info", title: "Fact deleted" });
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-3 text-[11px]">
                  <div>
                    <dt className="text-ink-muted">Category</dt>
                    <dd className="font-medium text-ink">{f.category}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Owner</dt>
                    <dd className="font-medium text-ink">{f.owner}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-muted">Source</dt>
                    <dd className="font-medium text-ink">{f.sourceLabel}{f.sourceUrl ? ` · ${f.sourceUrl}` : ""}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Last verified</dt>
                    <dd className="font-medium text-ink">{formatDate(f.lastVerifiedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Expires</dt>
                    <dd className={cn("font-medium", fresh === "Expired" ? "text-warn" : "text-ink")}>
                      {f.expiresAt ? formatDate(f.expiresAt) : "No expiry set"}
                    </dd>
                  </div>
                </dl>

                {f.unit && f.numericValue !== undefined && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
                    <CalendarClock size={12} /> Matchable value: <b className="text-ink">{f.numericValue} {f.unit}</b> — the audit engine compares numeric claims against this.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit approved fact" : "Add approved fact"} size="lg">
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fact title" required>
                <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Approved bottle capacity" />
              </Field>
              <Field label="Fact value" required hint="Include units — numeric values are matched automatically (e.g. 750 ml, 48 hours, £24.99).">
                <input className="input" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="750 ml" />
              </Field>
            </div>
            <Field label="Description">
              <textarea className="input min-h-20" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Fill capacity of the standard bottle." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as FactCategory })}>
                  {FACT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Verification status">
                <select className="input" value={draft.verificationStatus} onChange={(e) => setDraft({ ...draft, verificationStatus: e.target.value as ApprovedFact["verificationStatus"] })}>
                  <option value="verified">verified</option>
                  <option value="unverified">unverified</option>
                  <option value="disputed">disputed</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Source document or label" hint="Shown as evidence in findings. Never invent a source.">
                <input className="input" value={draft.sourceLabel} onChange={(e) => setDraft({ ...draft, sourceLabel: e.target.value })} placeholder="Nova Bottle Product Specification.pdf — p.2" />
              </Field>
              <Field label="Source URL (optional)">
                <input className="input" value={draft.sourceUrl} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} placeholder="https://…" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Expiry date (optional)">
                <input type="date" className="input" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />
              </Field>
              <Field label="Responsible owner">
                <input className="input" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Name or team" />
              </Field>
              <Field label="Numeric match (auto)">
                <input className="input" value={draft.numericValue} onChange={(e) => setDraft({ ...draft, numericValue: e.target.value })} placeholder="750" inputMode="decimal" />
              </Field>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4">
              <button className="btn-secondary" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}><Check size={15} /> Save fact</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
