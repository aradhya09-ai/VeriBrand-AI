import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, FileText, FlaskConical, Image as ImageIcon, MessageSquare, Palette, ScrollText, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import { useApp } from "../../lib/store";
import { Field, InlineNotice, SampleBadge, SectionHeader, Tabs, Toggle, useToast } from "../../components/ui";
import { formatDate } from "../../lib/utils";
import RulesTab from "./RulesTab";
import FactsTab from "./FactsTab";
import MediaTab from "./MediaTab";
import { useState } from "react";

const TABS = [
  { key: "overview", label: "Brand Overview", icon: <FlaskConical size={14} /> },
  { key: "rules", label: "Brand Rules", icon: <ScrollText size={14} /> },
  { key: "facts", label: "Approved Facts", icon: <Target size={14} /> },
  { key: "tone", label: "Tone of Voice", icon: <MessageSquare size={14} /> },
  { key: "assets", label: "Brand Assets", icon: <Palette size={14} /> },
  { key: "documents", label: "Documents", icon: <FileText size={14} /> },
  { key: "disclaimers", label: "Disclaimers", icon: <ShieldCheck size={14} /> },
];

const SLIDERS = [
  { key: "formality", left: "Casual", right: "Formal" },
  { key: "friendliness", left: "Authoritative", right: "Friendly" },
  { key: "conciseness", left: "Descriptive", right: "Concise" },
  { key: "technicality", left: "Accessible", right: "Technical" },
] as const;

function toneExamples(t: { formality: number; friendliness: number; conciseness: number; technicality: number }) {
  const opener =
    t.friendliness > 65
      ? t.formality < 50
        ? "Hey — your drink stays cold all day."
        : "We're pleased to help you get more from your day."
      : t.formality > 65
        ? "Our product maintains beverage temperature throughout the working day."
        : "Your drink stays cold all day.";
  const body =
    t.conciseness > 65
      ? "750 ml. Cold for up to 48 hours."
      : "The bottle holds 750 ml and keeps drinks cold for up to 48 hours, so you can refill less often throughout the day.";
  const close =
    t.technicality > 65
      ? "Double-wall vacuum insulation limits conductive heat transfer."
      : "A double-wall vacuum layer traps heat outside the bottle.";
  return [`${opener} ${body}`, close];
}

export default function BrandStudio() {
  const { state, workspace, brand, can, denyReason, update, isSampleWorkspace } = useApp();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const tab = params.get("tab") ?? "overview";
  const editable = can("edit_brand");

  const counts = useMemo(
    () => ({
      rules: state.rules.filter((r) => r.brandId === brand?.id && r.status === "active").length,
      facts: state.facts.filter((f) => f.brandId === brand?.id).length,
      docs: state.documents.filter((d) => d.brandId === brand?.id && d.extracted).length,
    }),
    [state, brand],
  );

  const setTab = (key: string) => setParams({ tab: key });

  const saveOverview = () => toast({ tone: "success", title: "Brand profile saved", description: "Future audits will use the updated profile." });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <SectionHeader
        title="Brand DNA Studio"
        description="The approved rules, facts, tone, assets and documents your content is verified against."
        actions={
          <>
            {isSampleWorkspace && <SampleBadge note="Sample brand" />}
            <span className="chip border-white/15 bg-white/5 text-ink-muted">
              {counts.rules} rules · {counts.facts} facts · {counts.docs} documents
            </span>
          </>
        }
      />

      <Tabs ariaLabel="Brand sections" items={TABS} active={tab} onChange={setTab} />

      {!editable && (
        <InlineNotice tone="warning" title="Read-only access">
          {denyReason("edit_brand")} You can review everything on this page.
        </InlineNotice>
      )}

      {/* --------------------------- OVERVIEW ----------------------- */}
      {tab === "overview" && brand && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="surface p-5 lg:col-span-2">
            <h2 className="text-base font-semibold text-ink">Brand identity</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand name" htmlFor="bn">
                  <input id="bn" className="input" defaultValue={brand.name} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, name: e.target.value } : b)) }))} />
                </Field>
                <Field label="Industry">
                  <input className="input" defaultValue={brand.industry} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, industry: e.target.value } : b)) }))} />
                </Field>
              </div>
              <Field label="Brand description">
                <textarea className="input min-h-24" defaultValue={brand.description} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, description: e.target.value } : b)) }))} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Target audience">
                  <input className="input" defaultValue={brand.audience} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, audience: e.target.value } : b)) }))} />
                </Field>
                <Field label="Brand mission">
                  <input className="input" defaultValue={brand.mission} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, mission: e.target.value } : b)) }))} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand personality">
                  <input className="input" defaultValue={brand.personality} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, personality: e.target.value } : b)) }))} />
                </Field>
                <Field label="Preferred writing style">
                  <input className="input" defaultValue={brand.writingStyle} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, writingStyle: e.target.value } : b)) }))} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Words to use" hint="Comma separated">
                  <input className="input" defaultValue={brand.wordsToUse.join(", ")} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, wordsToUse: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } : b)) }))} />
                </Field>
                <Field label="Words to avoid" hint="Comma separated — matches produce tone findings">
                  <input className="input" defaultValue={brand.wordsAvoid.join(", ")} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, wordsAvoid: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } : b)) }))} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred language">
                  <input className="input" defaultValue={brand.language} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, language: e.target.value } : b)) }))} />
                </Field>
                <Field label="Website">
                  <input className="input" defaultValue={brand.website} disabled={!editable} onChange={(e) => update((s) => ({ ...s, brands: s.brands.map((b) => (b.id === brand.id ? { ...b, website: e.target.value } : b)) }))} />
                </Field>
              </div>
              <div className="flex justify-end">
                <button className="btn-primary" onClick={saveOverview} disabled={!editable}>
                  <Check size={15} /> Save profile
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Users size={16} className="text-accent" /> Workspace</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Name", workspace?.name ?? "—"],
                  ["Industry", workspace?.industry || "Not set"],
                  ["Website", workspace?.website || "Not set"],
                  ["Language", workspace?.language ?? "—"],
                  ["Members", `${state.memberships.filter((m) => m.workspaceId === workspace?.id).length}`],
                  ["Created", formatDate(workspace?.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-white/[0.05] pb-2 last:border-0">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className="truncate font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Sparkles size={16} className="text-accent-cyan" /> Verification coverage</h2>
              <div className="mt-3 space-y-3">
                {[
                  { label: "Active brand rules", value: counts.rules, total: Math.max(counts.rules, 1) },
                  { label: "Approved facts", value: counts.facts, total: Math.max(counts.facts, 1) },
                  { label: "Extracted documents", value: counts.docs, total: Math.max(counts.docs, 1) },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-ink-muted">{r.label}</span>
                      <span className="font-semibold text-ink">{r.value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-cyan" style={{ width: `${Math.min(100, (r.value / Math.max(1, r.total)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                More approved references mean fewer “needs review” verdicts: the engine can only confirm claims it can
                match against something you have approved.
              </p>
            </div>

            <div className="surface flex items-start gap-3 p-5">
              <Palette size={16} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-semibold text-ink">Brand assets</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {state.assets.filter((a) => a.brandId === brand.id).length} asset(s) uploaded — open the Brand Assets tab to manage them.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- TONE ------------------------- */}
      {tab === "tone" && brand && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Tone sliders</h2>
              <span className="chip border-white/15 bg-white/5 text-ink-muted">{brand.language}</span>
            </div>
            <div className="mt-5 space-y-6">
              {SLIDERS.map((s) => {
                const value = brand.tone[s.key];
                return (
                  <div key={s.key}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-ink-muted">{s.left}</span>
                      <span className="font-semibold text-ink">{value}</span>
                      <span className="text-ink-muted">{s.right}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={value}
                      disabled={!editable}
                      onChange={(e) =>
                        update((s2) => ({
                          ...s2,
                          brands: s2.brands.map((b) => (b.id === brand.id ? { ...b, tone: { ...b.tone, [s.key]: Number(e.target.value) } } : b)),
                        }))
                      }
                      className="w-full accent-accent"
                      aria-label={`${s.left} to ${s.right}`}
                    />
                  </div>
                );
              })}

              <Field label="Preferred sentence style">
                <select
                  className="input"
                  value={brand.tone.sentenceStyle}
                  disabled={!editable}
                  onChange={(e) =>
                    update((s2) => ({
                      ...s2,
                      brands: s2.brands.map((b) => (b.id === brand.id ? { ...b, tone: { ...b.tone, sentenceStyle: e.target.value as any } } : b)),
                    }))
                  }
                >
                  <option value="short">Short and direct</option>
                  <option value="varied">Varied length</option>
                  <option value="formal">Formal, flowing sentences</option>
                </select>
              </Field>

              <Field label="Preferred terminology" hint="Comma separated">
                <input
                  className="input"
                  defaultValue={brand.tone.preferredTerms.join(", ")}
                  disabled={!editable}
                  onChange={(e) =>
                    update((s2) => ({
                      ...s2,
                      brands: s2.brands.map((b) => (b.id === brand.id ? { ...b, tone: { ...b.tone, preferredTerms: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } } : b)),
                    }))
                  }
                />
              </Field>

              <Field label="Words and phrases to avoid" hint="Comma separated — these produce tone findings when they appear">
                <input
                  className="input"
                  defaultValue={brand.tone.avoidPhrases.join(", ")}
                  disabled={!editable}
                  onChange={(e) =>
                    update((s2) => ({
                      ...s2,
                      brands: s2.brands.map((b) => (b.id === brand.id ? { ...b, tone: { ...b.tone, avoidPhrases: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } } : b)),
                    }))
                  }
                />
              </Field>
            </div>
          </div>

          <div className="space-y-5">
            <div className="surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><MessageSquare size={16} className="text-accent-cyan" /> How your tone reads</h2>
              <div className="mt-4 space-y-3">
                {toneExamples(brand.tone).map((ex, i) => (
                  <div key={i} className="rounded-xl border border-ok/25 bg-ok/[0.06] p-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ok">On-brand example</p>
                    <p className="text-sm leading-relaxed text-ink">{ex}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-bad/25 bg-bad/[0.06] p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bad">Off-brand example</p>
                  <p className="text-sm leading-relaxed text-ink">
                    “Buy now — the world&apos;s best bottle, guaranteed to transform your hydration instantly!”
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">Contains an unsupported superlative, a universal guarantee and hype wording.</p>
                </div>
              </div>
            </div>

            <div className="surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Target size={16} className="text-accent" /> Words policy</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ok">Use</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
                    {brand.wordsToUse.length ? brand.wordsToUse.map((w) => <li key={w}>• {w}</li>) : <li className="text-ink-muted/60">None configured</li>}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-bad">Avoid</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
                    {brand.wordsAvoid.length ? brand.wordsAvoid.map((w) => <li key={w}>• {w}</li>) : <li className="text-ink-muted/60">None configured</li>}
                  </ul>
                </div>
              </div>
            </div>

            <div className="surface flex items-start gap-3 p-5">
              <span className="mt-0.5"><Toggle checked={!!editable} onChange={() => undefined} label="Edit permission indicator" /></span>
              <div>
                <p className="text-sm font-semibold text-ink">Editing {editable ? "enabled" : "locked for your role"}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {editable ? "Changes save instantly to this workspace." : denyReason("edit_brand")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <RulesTab active={tab === "rules"} />
      <FactsTab active={tab === "facts"} />
      <MediaTab active={tab === "assets"} tab="assets" />
      <MediaTab active={tab === "documents"} tab="documents" />
      <MediaTab active={tab === "disclaimers"} tab="disclaimers" />

      {tab === "overview" && !brand && (
        <InlineNotice tone="warning" title="No brand configured">
          This workspace has no brand yet. Run onboarding or create a brand to start auditing content.
        </InlineNotice>
      )}
    </div>
  );
}
