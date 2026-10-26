import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FileText,
  Flag,
  Globe,
  Image as ImageIcon,
  Languages,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { Field, InlineNotice, Progress, SampleBadge, useToast } from "../components/ui";
import { uid } from "../lib/utils";
import type { BrandRule, Disclaimer, RuleCategory, Severity } from "../lib/types";

const STEPS = [
  { key: "workspace", title: "Create Workspace", icon: Building2, optional: false },
  { key: "identity", title: "Define Brand Identity", icon: Flag, optional: false },
  { key: "guidelines", title: "Add Brand Guidelines", icon: FileText, optional: true },
  { key: "assets", title: "Upload Brand Assets", icon: ImageIcon, optional: true },
  { key: "finish", title: "Finish Setup", icon: Check, optional: false },
];

export default function Onboarding() {
  const { state, workspace, brand, update, createBrand, saveRule, saveFact, saveDisclaimer, saveAsset, finishOnboarding, user } = useApp();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const toast = useToast();

  const [ws, setWs] = useState({
    name: workspace?.name ?? "",
    industry: workspace?.industry ?? "",
    website: workspace?.website ?? "",
    language: workspace?.language ?? "English (UK)",
  });
  const [identity, setIdentity] = useState({
    name: brand?.name ?? "",
    description: brand?.description ?? "",
    audience: brand?.audience ?? "",
    personality: brand?.personality ?? "",
    writingStyle: brand?.writingStyle ?? "",
    wordsToUse: (brand?.wordsToUse ?? []).join(", "),
    wordsAvoid: (brand?.wordsAvoid ?? []).join(", "),
  });
  const [ruleDraft, setRuleDraft] = useState({ title: "", description: "", category: "Accuracy" as RuleCategory, severity: "medium" as Severity });
  const [rules, setRules] = useState<Omit<BrandRule, "id" | "brandId" | "updatedAt">[]>([]);
  const [factDraft, setFactDraft] = useState({ title: "", value: "", sourceLabel: "" });
  const [facts, setFacts] = useState<{ title: string; value: string; sourceLabel: string }[]>([]);
  const [disclaimerDraft, setDisclaimerDraft] = useState("");
  const [disclaimers, setDisclaimers] = useState<{ text: string; when: string }[]>([]);
  const [assets, setAssets] = useState<{ name: string; dataUrl: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeBrandId = useMemo(() => brand?.id, [brand]);

  const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const next = () => {
    setError(null);
    if (step === 0 && !ws.name.trim()) return setError("Workspace name is required.");
    if (step === 1 && !identity.name.trim()) return setError("Brand name is required.");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const persistWorkspace = () => {
    if (!state.session) return;
    update((s) => ({
      ...s,
      workspaces: s.workspaces.map((w) => (w.id === s.session!.workspaceId ? { ...w, ...ws } : w)),
    }));
  };

  const ensureBrand = (): string => {
    if (activeBrandId) {
      const b = brand!;
      const { createBrand: _cb, ...rest } = { createBrand } as any;
      void _cb;
      update((s) => ({
        ...s,
        brands: s.brands.map((x) =>
          x.id === b.id
            ? {
                ...x,
                ...identity,
                wordsToUse: splitList(identity.wordsToUse),
                wordsAvoid: splitList(identity.wordsAvoid),
                industry: ws.industry,
                website: ws.website,
                language: ws.language,
                updatedAt: new Date().toISOString(),
              }
            : x,
        ),
      }));
      return b.id;
    }
    return createBrand({
      workspaceId: state.session!.workspaceId,
      name: identity.name,
      description: identity.description,
      audience: identity.audience,
      personality: identity.personality,
      writingStyle: identity.writingStyle,
      wordsToUse: splitList(identity.wordsToUse),
      wordsAvoid: splitList(identity.wordsAvoid),
      industry: ws.industry,
      website: ws.website,
      language: ws.language,
    });
  };

  const finish = () => {
    persistWorkspace();
    const brandId = ensureBrand();
    for (const r of rules) saveRule({ ...r, brandId });
    for (const f of facts) saveFact({ ...f, brandId, category: "Other", verificationStatus: "unverified", owner: user?.name ?? "Owner" });
    for (const d of disclaimers)
      saveDisclaimer({ brandId, text: d.text, when: d.when, appliesTo: [], severity: "medium", mandatory: true });
    for (const a of assets) saveAsset({ brandId, name: a.name, dataUrl: a.dataUrl, kind: "reference" });
    finishOnboarding();
    toast({ tone: "success", title: "Workspace ready", description: "You can refine rules, facts and assets any time in Brand DNA Studio." });
    navigate("/app");
  };

  const onAssetFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        setError(`${file.name}: unsupported type. Allowed formats are PNG, JPG, JPEG and WebP.`);
        continue;
      }
      if (file.size > 4 * 1024 * 1024) {
        setError(`${file.name}: larger than the 4 MB limit.`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      setAssets((prev) => [...prev, { name: file.name, dataUrl }]);
    }
  };

  return (
    <div className="min-h-screen bg-base">
      <header className="border-b border-white/[0.06] bg-base/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="18" fill="#111827" />
              <path d="M32 14l15 6.6V32c0 10-6.5 17.7-15 20-8.5-2.3-15-10-15-20V20.6L32 14z" fill="none" stroke="#6366F1" strokeWidth="4" strokeLinejoin="round" />
              <path d="M24.5 32.5l5.5 5.5 10.5-11.5" fill="none" stroke="#22D3EE" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-bold text-ink">VeriBrand <span className="text-accent">AI</span></span>
          </div>
          <button className="btn-ghost text-sm" onClick={() => { finishOnboarding(); navigate("/app"); }}>
            Skip and go to dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-bold tracking-tight">Set up your workspace</h1>
            <span className="text-xs text-ink-muted">Step {step + 1} of {STEPS.length}</span>
          </div>
          <div className="mt-3"><Progress value={((step + 1) / STEPS.length) * 100} /></div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => i <= step && setStep(i)}
              className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                i === step ? "border-accent/50 bg-accent/10" : i < step ? "border-ok/30 bg-ok/[0.06]" : "border-white/[0.07] bg-white/[0.02]"
              } ${i > step ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {i < step ? <Check size={12} className="text-ok" /> : <s.icon size={12} />} 0{i + 1}
              </span>
              <span className="text-[13px] font-medium text-ink">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="surface p-6">
          {/* STEP 1 — workspace */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Create your workspace</h2>
                <p className="mt-1 text-sm text-ink-muted">A workspace groups your brands, audits, reviewers and history.</p>
              </div>
              <Field label="Workspace name" htmlFor="ws-name" required>
                <input id="ws-name" className="input" value={ws.name} onChange={(e) => setWs({ ...ws, name: e.target.value })} placeholder="Acme Marketing" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Industry" htmlFor="ws-industry">
                  <input id="ws-industry" className="input" value={ws.industry} onChange={(e) => setWs({ ...ws, industry: e.target.value })} placeholder="Consumer goods" />
                </Field>
                <Field label="Website URL" htmlFor="ws-site">
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input id="ws-site" className="input pl-9" value={ws.website} onChange={(e) => setWs({ ...ws, website: e.target.value })} placeholder="https://example.com" />
                  </div>
                </Field>
              </div>
              <Field label="Default language" htmlFor="ws-lang">
                <div className="relative">
                  <Languages size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <select id="ws-lang" className="input pl-9" value={ws.language} onChange={(e) => setWs({ ...ws, language: e.target.value })}>
                    {["English (UK)", "English (US)", "French", "German", "Spanish", "Hindi", "Japanese"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          )}

          {/* STEP 2 — identity */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Define your brand identity</h2>
                <p className="mt-1 text-sm text-ink-muted">These fields anchor tone and terminology checks.</p>
              </div>
              <Field label="Brand name" htmlFor="b-name" required>
                <input id="b-name" className="input" value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} placeholder="Nova Bottle" />
              </Field>
              <Field label="Brand description" htmlFor="b-desc">
                <textarea id="b-desc" className="input min-h-24" value={identity.description} onChange={(e) => setIdentity({ ...identity, description: e.target.value })} placeholder="What the brand makes and stands for." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Target audience" htmlFor="b-aud">
                  <input id="b-aud" className="input" value={identity.audience} onChange={(e) => setIdentity({ ...identity, audience: e.target.value })} placeholder="Commuters aged 25–45" />
                </Field>
                <Field label="Brand personality" htmlFor="b-per">
                  <input id="b-per" className="input" value={identity.personality} onChange={(e) => setIdentity({ ...identity, personality: e.target.value })} placeholder="Friendly, practical, evidence-first" />
                </Field>
              </div>
              <Field label="Preferred writing style" htmlFor="b-style">
                <input id="b-style" className="input" value={identity.writingStyle} onChange={(e) => setIdentity({ ...identity, writingStyle: e.target.value })} placeholder="Plain English, short sentences, concrete numbers" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Words to use" htmlFor="b-use" hint="Comma separated">
                  <input id="b-use" className="input" value={identity.wordsToUse} onChange={(e) => setIdentity({ ...identity, wordsToUse: e.target.value })} placeholder="insulated, keeps cold, up to" />
                </Field>
                <Field label="Words to avoid" htmlFor="b-avoid" hint="Comma separated — these trigger tone findings">
                  <input id="b-avoid" className="input" value={identity.wordsAvoid} onChange={(e) => setIdentity({ ...identity, wordsAvoid: e.target.value })} placeholder="world-class, revolutionary, miracle" />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 3 — guidelines */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Add brand guidelines</h2>
                  <p className="mt-1 text-sm text-ink-muted">Rules and facts can be added later in Brand DNA Studio.</p>
                </div>
                <SampleBadge note="Optional step" />
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="mb-3 text-sm font-semibold text-ink">Add a brand rule</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input" placeholder="Rule title" value={ruleDraft.title} onChange={(e) => setRuleDraft({ ...ruleDraft, title: e.target.value })} aria-label="Rule title" />
                  <select className="input" value={ruleDraft.category} onChange={(e) => setRuleDraft({ ...ruleDraft, category: e.target.value as RuleCategory })} aria-label="Rule category">
                    {["Accuracy", "Tone", "Terminology", "Compliance", "Accessibility", "Visual Identity", "Required Disclaimers"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <textarea className="input sm:col-span-2" placeholder="What the rule requires and why" value={ruleDraft.description} onChange={(e) => setRuleDraft({ ...ruleDraft, description: e.target.value })} aria-label="Rule description" />
                  <select className="input" value={ruleDraft.severity} onChange={(e) => setRuleDraft({ ...ruleDraft, severity: e.target.value as Severity })} aria-label="Rule severity">
                    {["critical", "high", "medium", "low", "informational"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (!ruleDraft.title.trim()) return setError("Rule title is required.");
                      setRules([...rules, { ...ruleDraft, status: "active", contentTypes: [], origin: "manual" }]);
                      setRuleDraft({ title: "", description: "", category: "Accuracy", severity: "medium" });
                      setError(null);
                    }}
                  >
                    <Plus size={15} /> Add rule
                  </button>
                </div>
                {rules.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {rules.map((r, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.07] bg-card/60 px-3 py-2 text-sm">
                        <span>
                          <b className="text-ink">{r.title}</b>
                          <span className="block text-xs text-ink-muted">{r.category} · {r.severity}</span>
                        </span>
                        <button className="text-ink-muted hover:text-bad" onClick={() => setRules(rules.filter((_, j) => j !== i))} aria-label={`Remove ${r.title}`}>
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="mb-3 text-sm font-semibold text-ink">Add an approved fact</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input className="input" placeholder="Fact title" value={factDraft.title} onChange={(e) => setFactDraft({ ...factDraft, title: e.target.value })} aria-label="Fact title" />
                  <input className="input" placeholder="Value — 750 ml" value={factDraft.value} onChange={(e) => setFactDraft({ ...factDraft, value: e.target.value })} aria-label="Fact value" />
                  <input className="input" placeholder="Source document or URL" value={factDraft.sourceLabel} onChange={(e) => setFactDraft({ ...factDraft, sourceLabel: e.target.value })} aria-label="Fact source" />
                </div>
                <button
                  className="btn-secondary mt-3"
                  onClick={() => {
                    if (!factDraft.title.trim() || !factDraft.value.trim()) return setError("Fact title and value are required.");
                    const num = factDraft.value.match(/^([\d.]+)\s*(ml|l|litres?|hours?|g|kg|months?|£|\$)?/i);
                    setFacts([...facts, { ...factDraft, sourceLabel: factDraft.sourceLabel || "No source recorded" } as any]);
                    setFactDraft({ title: "", value: "", sourceLabel: "" });
                    void num;
                    setError(null);
                  }}
                >
                  <Plus size={15} /> Add fact
                </button>
                {facts.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {facts.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-card/60 px-3 py-2 text-sm">
                        <span><b className="text-ink">{f.title}</b> <span className="text-ink-muted">— {f.value}</span></span>
                        <button className="text-ink-muted hover:text-bad" onClick={() => setFacts(facts.filter((_, j) => j !== i))} aria-label={`Remove ${f.title}`}>
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="mb-3 text-sm font-semibold text-ink">Required disclaimer</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input className="input flex-1" placeholder="Prices include VAT and may change without notice." value={disclaimerDraft} onChange={(e) => setDisclaimerDraft(e.target.value)} aria-label="Disclaimer text" />
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (!disclaimerDraft.trim()) return setError("Disclaimer text is required.");
                      setDisclaimers([...disclaimers, { text: disclaimerDraft.trim(), when: "Whenever this content type publishes a related claim." }]);
                      setDisclaimerDraft("");
                      setError(null);
                    }}
                  >
                    <Plus size={15} /> Add disclaimer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — assets */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Upload brand assets</h2>
                  <p className="mt-1 text-sm text-ink-muted">PNG, JPG, JPEG and WebP up to 4 MB each.</p>
                </div>
                <SampleBadge note="Optional step" />
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center transition-colors hover:border-accent/50 hover:bg-accent/[0.04]">
                <Upload size={22} className="text-accent" />
                <span className="mt-2 text-sm font-semibold text-ink">Drop files here or click to browse</span>
                <span className="mt-1 text-xs text-ink-muted">Logos, colour palettes, typography references</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => onAssetFiles(e.target.files)} />
              </label>

              {assets.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {assets.map((a, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border border-white/10 bg-card/60">
                      <img src={a.dataUrl} alt={a.name} className="h-24 w-full object-cover" />
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span className="truncate text-[11px] text-ink-muted">{a.name}</span>
                        <button className="text-ink-muted hover:text-bad" onClick={() => setAssets(assets.filter((_, j) => j !== i))} aria-label={`Remove ${a.name}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5 — summary */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Review and finish</h2>
                <p className="mt-1 text-sm text-ink-muted">You can change anything later in Brand DNA Studio and Settings.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Workspace", value: ws.name || "—", sub: [ws.industry, ws.website].filter(Boolean).join(" · ") || ws.language },
                  { label: "Brand", value: identity.name || "—", sub: identity.personality || "No personality set" },
                  { label: "Rules added", value: `${rules.length}`, sub: rules.map((r) => r.title).slice(0, 2).join(", ") || "Add rules later" },
                  { label: "Approved facts", value: `${facts.length}`, sub: facts.map((f) => f.title).slice(0, 2).join(", ") || "Add facts later" },
                  { label: "Disclaimers", value: `${disclaimers.length}`, sub: disclaimers[0]?.text.slice(0, 60) || "None yet" },
                  { label: "Assets", value: `${assets.length}`, sub: assets.map((a) => a.name).slice(0, 2).join(", ") || "None uploaded" },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{c.label}</p>
                    <p className="mt-1 truncate text-base font-semibold text-ink">{c.value}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{c.sub}</p>
                  </div>
                ))}
              </div>

              <InlineNotice tone="info" title="What happens next">
                Your references are stored locally in this browser. The audit engine evaluates content against them and
                labels every verdict — nothing is sent to an external AI provider unless a backend with an LLM key is
                configured.
              </InlineNotice>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
            <button className="btn-ghost" onClick={() => (step === 0 ? navigate("/app") : setStep((s) => s - 1))}>
              <ArrowLeft size={15} /> {step === 0 ? "Dashboard" : "Back"}
            </button>
            <div className="flex items-center gap-2">
              {STEPS[step].optional && (
                <button className="btn-ghost" onClick={() => { setError(null); setStep((s) => s + 1); }}>
                  Skip this step
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button className="btn-primary" onClick={next}>
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <button className="btn-primary" onClick={finish}>
                  <Sparkles size={15} /> Enter dashboard
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-ink-muted">
          {uid("session").slice(0, 0)}Demo mode: records persist in this browser only.
        </p>
      </main>
    </div>
  );
}
