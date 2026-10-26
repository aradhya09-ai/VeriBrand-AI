import { useMemo, useState } from "react";
import { Check, ChevronRight, FileSearch, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useApp } from "../../lib/store";
import { EmptyState, Field, InlineNotice, Modal, SeverityBadge, Tabs, useConfirm, useToast } from "../../components/ui";
import { cn, formatDate } from "../../lib/utils";
import type { BrandRule, ContentType, RuleCategory, Severity } from "../../lib/types";

const CATEGORIES: RuleCategory[] = [
  "Accuracy",
  "Tone",
  "Terminology",
  "Compliance",
  "Accessibility",
  "Visual Identity",
  "Required Disclaimers",
];

const CONTENT_TYPES: ContentType[] = [
  "Social media post",
  "Advertisement",
  "Marketing email",
  "Website copy",
  "Product description",
  "Blog article",
  "Press release",
  "General marketing content",
];

export interface RuleDraft {
  id?: string;
  title: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  status: BrandRule["status"];
  contentTypes: ContentType[];
  sourceRef?: string;
  sourcePassage?: string;
  explanation?: string;
  confidence?: number;
}

const empty: RuleDraft = {
  title: "",
  description: "",
  category: "Accuracy",
  severity: "medium",
  status: "active",
  contentTypes: [],
};

/* ---------------- heuristic draft-rule extraction ----------------- */

function guessCategory(text: string): RuleCategory {
  const t = text.toLowerCase();
  if (/tone|friendly|formal|voice|wording style|reads/.test(t)) return "Tone";
  if (/accessib|contrast|readab|screen reader|font size|alt text/.test(t)) return "Accessibility";
  if (/disclaimer|terms apply|subject to|vat|legal notice/.test(t)) return "Required Disclaimers";
  if (/logo|colour|color|typograph|imagery|visual/.test(t)) return "Visual Identity";
  if (/name|terminolog|capital|spell|call (it|the)/.test(t)) return "Terminology";
  if (/must match|specification|fact|number|price|data/.test(t)) return "Accuracy";
  return "Compliance";
}

function guessSeverity(text: string): Severity {
  const t = text.toLowerCase();
  if (/never|must not|prohibited|ban|do not|no longer|illegal/.test(t)) return "high";
  if (/must|required|only|always|ensure/.test(t)) return "medium";
  return "low";
}

export function extractSuggestions(raw: string): RuleDraft[] {
  const lines = raw
    .split(/[\n.;!?]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 12);
  const keep = lines.filter((l) => /\b(must|should|never|always|do not|don't|avoid|ensure|only|required|may not|is not permitted|are prohibited)\b/i.test(l));
  return (keep.length ? keep : lines.slice(0, 6)).slice(0, 8).map((l) => ({
    title: l.length > 70 ? `${l.slice(0, 66)}…` : l.charAt(0).toUpperCase() + l.slice(1),
    description: l,
    category: guessCategory(l),
    severity: guessSeverity(l),
    status: "suggested" as const,
    contentTypes: [],
    sourcePassage: l,
    explanation: "Draft extracted from the pasted guideline text by a local keyword heuristic — review before approving.",
    confidence: 0.45 + Math.min(0.4, l.length / 200),
  }));
}

/* ------------------------------------------------------------------ */

export default function RulesTab({ active }: { active: boolean }) {
  const { state, brand, can, denyReason, saveRule, deleteRule, setRuleStatus, update } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<RuleDraft | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [suggestions, setSuggestions] = useState<RuleDraft[]>([]);
  const [view, setView] = useState<"active" | "suggested">("active");
  const editable = can("edit_brand");

  const rules = useMemo(
    () => state.rules.filter((r) => r.brandId === brand?.id),
    [state.rules, brand],
  );
  const activeRules = rules.filter((r) => r.status === "active" || r.status === "draft" || r.status === "archived");
  const suggested = rules.filter((r) => r.status === "suggested");

  const shown = activeRules.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQ = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    const matchesC = category === "all" || r.category === category;
    return matchesQ && matchesC;
  });

  if (!active) return null;

  const save = () => {
    if (!editing || !brand) return;
    if (!editing.title.trim()) return toast({ tone: "error", title: "Rule title is required" });
    saveRule({
      id: editing.id,
      brandId: brand.id,
      title: editing.title.trim(),
      description: editing.description.trim(),
      category: editing.category,
      severity: editing.severity,
      status: editing.status === "suggested" ? "active" : editing.status,
      contentTypes: editing.contentTypes,
      sourceRef: editing.sourceRef,
      sourcePassage: editing.sourcePassage,
      explanation: editing.explanation,
      confidence: editing.confidence,
      origin: editing.id ? "manual" : "manual",
    });
    toast({ tone: "success", title: editing.id ? "Rule updated" : "Rule created", description: "Changes apply to future audits." });
    setEditing(null);
  };

  const approveSuggestion = (r: BrandRule) => {
    setRuleStatus(r.id, "active");
    toast({ tone: "success", title: "Suggestion approved", description: `“${r.title}” is now part of your active brand policy.` });
  };

  const rejectSuggestion = async (r: BrandRule) => {
    const ok = await confirm({
      title: "Reject suggested rule?",
      body: "The draft will be removed. You can regenerate it from the guideline text at any time.",
      confirmLabel: "Reject",
      tone: "danger",
    });
    if (!ok) return;
    deleteRule(r.id);
    toast({ tone: "info", title: "Suggestion rejected", description: "No change was made to your active policy." });
  };

  const generate = () => {
    if (!pasteText.trim()) return toast({ tone: "error", title: "Paste guideline text first" });
    const drafts = extractSuggestions(pasteText);
    setSuggestions(drafts);
  };

  const saveGenerated = () => {
    if (!brand) return;
    for (const s of suggestions) saveRule({ ...s, brandId: brand.id, sourceRef: "Pasted guideline", origin: "suggested" });
    toast({
      tone: "success",
      title: `${suggestions.length} draft rule(s) saved for review`,
      description: "Suggestions never become active rules until you approve them.",
    });
    setPasteOpen(false);
    setPasteText("");
    setSuggestions([]);
    setView("suggested");
    update((s) => ({ ...s }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input pl-9"
            placeholder="Search rules…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search brand rules"
          />
        </div>
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          className="btn-secondary"
          onClick={() => setPasteOpen(true)}
          disabled={!editable}
          title={editable ? "Generate draft rules from pasted guidelines" : denyReason("edit_brand")}
        >
          <Sparkles size={15} /> Smart rules
        </button>
        <button
          className="btn-primary"
          onClick={() => setEditing({ ...empty })}
          disabled={!editable}
          title={editable ? "Create a rule" : denyReason("edit_brand")}
        >
          <Plus size={15} /> New rule
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Tabs
          ariaLabel="Rule views"
          active={view}
          onChange={(k) => setView(k as "active" | "suggested")}
          items={[
            { key: "active", label: "Active policy", badge: activeRules.length },
            { key: "suggested", label: "Suggested (needs approval)", badge: suggested.length },
          ]}
        />
      </div>

      {!editable && (
        <InlineNotice tone="warning" title="Read-only role">{denyReason("edit_brand")}</InlineNotice>
      )}

      {view === "suggested" ? (
        suggested.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={20} />}
            title="No suggestions waiting"
            body="Paste guideline text in Smart rules to extract draft rules. Suggestions are never activated automatically — you review, edit and approve each one."
            action={editable ? <button className="btn-primary" onClick={() => setPasteOpen(true)}>Open Smart rules</button> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {suggested.map((r) => (
              <div key={r.id} className="rounded-xl border border-warn/30 bg-warn/[0.05] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{r.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span className="chip border-white/15 bg-white/5 text-ink-muted">{r.category}</span>
                      <SeverityBadge severity={r.severity} />
                      <span className="chip border-white/15 bg-white/5 text-ink-muted">
                        confidence {Math.round((r.confidence ?? 0.5) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => setEditing({ ...r })}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => approveSuggestion(r)} disabled={!editable}>
                      <Check size={13} /> Approve
                    </button>
                    <button className="btn-danger !px-3 !py-1.5 !text-xs" onClick={() => rejectSuggestion(r)} disabled={!editable}>
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
                {r.sourcePassage && (
                  <blockquote className="mt-3 border-l-2 border-accent/60 bg-white/[0.03] px-3 py-2 text-xs italic text-ink-muted">
                    Source passage: “{r.sourcePassage}”
                  </blockquote>
                )}
                <p className="mt-2 text-xs text-ink-muted">{r.explanation}</p>
              </div>
            ))}
          </div>
        )
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={20} />}
          title="No rules match"
          body={query || category !== "all" ? "Try a different search term or clear the category filter." : "Add your first brand rule to start auditing content against it."}
          action={editable ? <button className="btn-primary" onClick={() => setEditing({ ...empty })}>Add a rule</button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <article key={r.id} className="surface p-4 transition-colors hover:border-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-ink">{r.title}</h3>
                    <span className="chip border-white/15 bg-white/5 text-ink-muted">{r.category}</span>
                    <SeverityBadge severity={r.severity} />
                    <span
                      className={cn(
                        "chip",
                        r.status === "active"
                          ? "border-ok/35 bg-ok/10 text-ok"
                          : r.status === "draft"
                            ? "border-info/35 bg-info/10 text-info"
                            : "border-white/15 bg-white/5 text-ink-muted",
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-muted">{r.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
                    {r.contentTypes.length > 0 && <span>Applies to: {r.contentTypes.join(", ")}</span>}
                    {r.sourceRef && <span>Source: {r.sourceRef}</span>}
                    <span>Updated {formatDate(r.updatedAt)}</span>
                    {r.isSample && <span className="text-accent-cyan">sample data</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                    onClick={() =>
                      setEditing({
                        id: r.id,
                        title: r.title,
                        description: r.description,
                        category: r.category,
                        severity: r.severity,
                        status: r.status,
                        contentTypes: r.contentTypes,
                        sourceRef: r.sourceRef,
                        sourcePassage: r.sourcePassage,
                        explanation: r.explanation,
                        confidence: r.confidence,
                      })
                    }
                    disabled={!editable}
                    title={editable ? "Edit rule" : denyReason("edit_brand")}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                    onClick={() => {
                      setRuleStatus(r.id, r.status === "active" ? "archived" : "active");
                      toast({ tone: "info", title: r.status === "active" ? "Rule archived" : "Rule reactivated" });
                    }}
                    disabled={!editable}
                  >
                    {r.status === "active" ? "Archive" : "Activate"}
                  </button>
                  <button
                    className="btn-danger !px-3 !py-1.5 !text-xs"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Delete this rule?",
                        body: `“${r.title}” will be removed from your brand policy. Existing audit history is kept.`,
                        confirmLabel: "Delete",
                        tone: "danger",
                      });
                      if (!ok) return;
                      deleteRule(r.id);
                      toast({ tone: "info", title: "Rule deleted" });
                    }}
                    disabled={!editable}
                    title={editable ? "Delete rule" : denyReason("edit_brand")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit brand rule" : "New brand rule"} size="lg">
        {editing && (
          <div className="space-y-4">
            <Field label="Rule title" required>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Avoid Unsupported Superlatives" />
            </Field>
            <Field label="Description" hint="Explain what the rule requires and why it exists.">
              <textarea
                className="input min-h-24"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder={"Do not use claims such as \"world's best\" unless supported by an approved, current source."}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as RuleCategory })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Severity" hint="Severity is inherited by findings produced from this rule.">
                <select className="input" value={editing.severity} onChange={(e) => setEditing({ ...editing, severity: e.target.value as Severity })}>
                  {["critical", "high", "medium", "low", "informational"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Supporting source" hint="Reference a document, policy or URL that backs this rule.">
              <input className="input" value={editing.sourceRef ?? ""} onChange={(e) => setEditing({ ...editing, sourceRef: e.target.value })} placeholder="Nova Bottle Brand Guidelines.pdf — p.4" />
            </Field>
            <Field label="Applicable content types" hint="Leave all unchecked to apply the rule to every content type.">
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((ct) => {
                  const on = editing.contentTypes.includes(ct);
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          contentTypes: on ? editing.contentTypes.filter((x) => x !== ct) : [...editing.contentTypes, ct],
                        })
                      }
                      className={cn(
                        "chip transition-colors",
                        on ? "border-accent/50 bg-accent/15 text-accent" : "border-white/15 bg-white/5 text-ink-muted hover:text-ink",
                      )}
                      aria-pressed={on}
                    >
                      {on && <Check size={11} />}{ct}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4">
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>
                <Check size={15} /> Save rule
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* smart rules modal */}
      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Smart rules — draft from guidelines" description="Paste existing guideline text and review the extracted suggestions." size="lg">
        <div className="space-y-4">
          <InlineNotice tone="warning" title="Extraction is heuristic, not AI">
            Suggestions are produced by a local keyword parser. They are saved with status “suggested” and never become
            active rules until you approve them explicitly.
          </InlineNotice>
          <Field label="Guideline text" hint="Sentences containing must / should / never / avoid are prioritised.">
            <textarea
              className="input min-h-40 font-mono text-xs"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Product specifications must match approved product documentation.\nNever use the phrase 'world's best' without a source.\nKeep sentences under 28 words for accessibility."}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setPasteOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={generate}>
              <Sparkles size={15} /> Extract draft rules
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3 border-t border-white/[0.07] pt-4">
              <p className="text-sm font-semibold text-ink">Review {suggestions.length} suggestion(s)</p>
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <input
                    className="input mb-2"
                    value={s.title}
                    onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    aria-label={`Suggestion ${i + 1} title`}
                  />
                  <textarea
                    className="input mb-2 text-sm"
                    value={s.description}
                    onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                    aria-label={`Suggestion ${i + 1} description`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="input w-auto !py-1.5 !text-xs"
                      value={s.category}
                      onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, category: e.target.value as RuleCategory } : x)))}
                      aria-label={`Suggestion ${i + 1} category`}
                    >
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <select
                      className="input w-auto !py-1.5 !text-xs"
                      value={s.severity}
                      onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, severity: e.target.value as Severity } : x)))}
                      aria-label={`Suggestion ${i + 1} severity`}
                    >
                      {["critical", "high", "medium", "low", "informational"].map((v) => <option key={v}>{v}</option>)}
                    </select>
                    <button className="btn-ghost !text-xs" onClick={() => setSuggestions(suggestions.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                  {s.sourcePassage && (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-muted">
                      <ChevronRight size={12} className="mt-0.5" /> Source: “{s.sourcePassage}”
                    </p>
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-3">
                <button className="btn-secondary" onClick={() => setSuggestions([])}>Clear</button>
                <button className="btn-primary" onClick={saveGenerated}>
                  <Check size={15} /> Save as suggestions
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
