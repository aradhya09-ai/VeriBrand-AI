import { useMemo, useState } from "react";
import { CheckCircle2, Circle, FileUp, Play, ScanSearch, Sparkles, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ALL_CHECKS, CONTENT_TYPES, type AuditCheck, type Audit, type ContentType } from "../lib/types";
import { useApp } from "../lib/store";
import { SAMPLE_CONTENT } from "../lib/demoData";
import { runAuditStaged, STAGES } from "../lib/auditEngine";
import { extractFile } from "../lib/extract";
import { Field, InlineNotice, SampleBadge, SectionHeader, Spinner, useToast } from "../components/ui";
import { cn, uid } from "../lib/utils";

export default function NewAudit() {
  const { state, workspace, brand, can, denyReason, createAudit, logActivity, notify, isSampleWorkspace } = useApp();
  const navigate = useNavigate();
  const toast = useToast();

  const [mode, setMode] = useState<"text" | "upload" | "sample">("text");
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("Social media post");
  const [campaign, setCampaign] = useState("");
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState(brand?.language ?? "English (UK)");
  const [content, setContent] = useState("");
  const [checks, setChecks] = useState<AuditCheck[]>(ALL_CHECKS.map((c) => c.key));
  const [error, setError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);

  const activeRules = useMemo(() => state.rules.filter((r) => r.brandId === brand?.id && r.status === "active").length, [state.rules, brand]);
  const facts = useMemo(() => state.facts.filter((f) => f.brandId === brand?.id).length, [state.facts, brand]);
  const allowed = can("run_audit");

  const toggleCheck = (key: AuditCheck) =>
    setChecks((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const loadSample = () => {
    setMode("sample");
    setTitle("Nova Bottle — sample launch copy");
    setContent(SAMPLE_CONTENT);
    setContentType("Social media post");
    setCampaign("Winter Product Launch");
    setUploadNote("Sample content loaded. Running it produces the documented demonstration findings.");
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadNote(null);
    const file = files[0];
    const result = await extractFile(file);
    if (!result.ok) {
      setUploadNote(result.error ?? "Extraction failed.");
      setError(result.error ?? "Extraction failed.");
      return;
    }
    setMode("upload");
    setContent(result.text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    setUploadNote(`${file.name}: ${result.passages.length} passage(s) extracted in your browser.`);
  };

  const run = async () => {
    setError(null);
    if (!brand) return setError("Create a brand in Brand DNA Studio before running an audit.");
    if (!title.trim()) return setError("Give this audit a content title.");
    if (content.trim().length < 20) return setError("Paste at least a couple of sentences to audit (20 characters minimum).");
    if (checks.length === 0) return setError("Select at least one check to run.");

    setBusy(true);
    setStage(0);
    try {
      const now = new Date().toISOString();
      const id = uid("aud");
      const result = await runAuditStaged(
        {
          auditId: id,
          content,
          checks,
          brand,
          rules: state.rules,
          facts: state.facts,
          documents: state.documents,
          disclaimers: state.disclaimers,
          campaign: state.campaigns.find((c) => c.name === campaign),
          contentType,
        },
        (i) => setStage(i),
      );

      const openFindings = result.findings.filter((f) => f.verificationStatus !== "SUPPORTED");
      const audit: Audit = {
        id,
        workspaceId: workspace?.id ?? "ws_sample",
        brandId: brand.id,
        title: title.trim(),
        contentType,
        campaignName: campaign.trim() || undefined,
        audience: audience.trim() || undefined,
        language,
        content,
        version: 1,
        status: openFindings.length ? "needs_review" : "draft",
        checks,
        findings: result.findings,
        checksRun: result.checksRun,
        limitations: result.limitations,
        score: result.score,
        analysisMode: result.analysisMode,
        resultLabel: result.resultLabel,
        riskLevel: result.riskLevel,
        summaryText: result.summaryText,
        createdBy: state.session?.userId ?? "u_demo",
        createdAt: now,
        updatedAt: now,
        isSample: isSampleWorkspace,
      };

      createAudit(audit);
      logActivity({
        action: "audit_completed",
        resourceType: "audit",
        resourceId: id,
        label: `Audit completed — ${audit.title} (${result.findings.length} findings)`,
      });
      notify({
        type: result.riskLevel === "critical" || result.riskLevel === "high" ? "high_severity" : "audit_completed",
        title: result.riskLevel === "critical" || result.riskLevel === "high" ? "High-severity issue detected" : "Audit completed",
        body: `${audit.title}: ${result.findings.length} finding(s). ${result.summaryText}`,
        link: `/app/audits/${id}`,
      });
      toast({ tone: "success", title: "Audit complete", description: result.summaryText });
      navigate(`/app/audits/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The audit could not be completed.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SectionHeader
        title="Audit Your Content"
        description="Check your content against your approved brand rules, verified facts, and communication guidelines."
        actions={isSampleWorkspace && <SampleBadge />}
      />

      {!allowed && <InlineNotice tone="warning" title="Read-only role">{denyReason("run_audit")}</InlineNotice>}

      <div className="grid gap-3 sm:grid-cols-3">
        {([
          { key: "text", label: "Paste text", icon: ScanSearch, hint: "Write or paste copy directly" },
          { key: "upload", label: "Upload document", icon: FileUp, hint: "TXT or DOCX (PDF needs backend)" },
          { key: "sample", label: "Sample content", icon: Sparkles, hint: "Load the Nova Bottle demo" },
        ] as const).map((o) => (
          <button
            key={o.key}
            onClick={() => (o.key === "sample" ? loadSample() : setMode(o.key))}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              mode === o.key ? "border-accent/60 bg-accent/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
            )}
          >
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", mode === o.key ? "bg-accent text-white" : "bg-white/5 text-ink-muted")}>
              <o.icon size={16} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{o.label}</span>
              <span className="block text-[11px] text-ink-muted">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Content title" required htmlFor="a-title">
            <input id="a-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Winter launch — email blast" />
          </Field>
          <Field label="Content type" htmlFor="a-type">
            <select id="a-type" className="input" value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)}>
              {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Campaign name (optional)" htmlFor="a-camp">
            <input id="a-camp" className="input" list="campaigns" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Winter Product Launch" />
            <datalist id="campaigns">{state.campaigns.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          </Field>
          <Field label="Target audience (optional)" htmlFor="a-aud">
            <input id="a-aud" className="input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="UK adults 25–45" />
          </Field>
          <Field label="Content language" htmlFor="a-lang">
            <input id="a-lang" className="input" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </Field>
          <Field label="Brand workspace" htmlFor="a-ws" hint="Audits run against this brand's references.">
            <input id="a-ws" className="input" value={`${brand?.name ?? "No brand"} — ${workspace?.name ?? ""}`} disabled />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Content" htmlFor="a-body" required hint={`${content.trim().length} characters`}>
            {mode === "upload" ? (
              <div className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-8 text-center hover:border-accent/50">
                  <UploadCloud size={22} className="text-accent" />
                  <span className="mt-2 text-sm font-semibold text-ink">Upload PDF, TXT or DOCX</span>
                  <span className="mt-1 text-xs text-ink-muted">Max 5 MB · extracted in your browser</span>
                  <input type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={(e) => onUpload(e.target.files)} />
                </label>
                {uploadNote && <p className={cn("text-xs", content ? "text-ok" : "text-bad")}>{uploadNote}</p>}
                <textarea id="a-body" className="input min-h-44 font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Extracted text appears here — you can edit it before running the audit." />
              </div>
            ) : (
              <textarea
                id="a-body"
                className="input min-h-48 leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={mode === "sample" ? "Sample content loaded below." : "Paste the marketing copy you want to verify…"}
              />
            )}
          </Field>
          {mode !== "upload" && uploadNote && <p className="mt-1 text-xs text-ok">{uploadNote}</p>}
          {mode === "sample" && content && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <SampleBadge note="Fictional demo content" /> Running this produces the four documented demonstration findings.
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Audit settings</p>
            <span className="text-xs text-ink-muted">{checks.length} of {ALL_CHECKS.length} checks selected</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ALL_CHECKS.map((c) => {
              const on = checks.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCheck(c.key)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    on ? "border-accent/40 bg-accent/[0.08]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20",
                  )}
                >
                  <span className={cn("mt-0.5", on ? "text-accent" : "text-ink-muted")}>{on ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{c.label}</span>
                    <span className="block text-[11px] text-ink-muted">{c.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
          <div className="text-xs text-ink-muted">
            <p>References available: <b className="text-ink">{activeRules}</b> active rules · <b className="text-ink">{facts}</b> approved facts · <b className="text-ink">{state.documents.filter((d) => d.extracted).length}</b> extracted documents</p>
            <p className="mt-0.5">No AI provider is configured — analysis runs on the deterministic rule engine in this browser.</p>
          </div>
          <button className="btn-primary px-6 py-3" onClick={run} disabled={busy || !allowed}>
            {busy ? <><Spinner /> Running…</> : <><Play size={16} /> Run Brand Audit</>}
          </button>
        </div>

        {error && <p role="alert" className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
      </div>

      {busy && (
        <div className="surface animate-fadeUp p-5">
          <p className="text-sm font-semibold text-ink">Audit in progress</p>
          <ol className="mt-3 space-y-2">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border", i < stage ? "border-ok/50 bg-ok/15 text-ok" : i === stage ? "border-accent bg-accent/15 text-accent" : "border-white/15 text-ink-muted")}>
                  {i < stage ? <CheckCircle2 size={13} /> : i === stage ? <Spinner size={12} /> : i + 1}
                </span>
                <span className={i <= stage ? "text-ink" : "text-ink-muted"}>{s}</span>
                {i === stage && <span className="ml-auto text-[11px] text-accent">working…</span>}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-ink-muted">
            Each stage performs real matching against your stored references — this is not a simulated progress bar.
          </p>
        </div>
      )}

      <InlineNotice tone="info" title="What the audit does">
        It splits your content into claims, matches measurable values against approved facts, checks configured rules,
        tone, terminology, disclaimers and readability, then returns findings with evidence or an explicit
        “no approved evidence” marker.
      </InlineNotice>
    </div>
  );
}
