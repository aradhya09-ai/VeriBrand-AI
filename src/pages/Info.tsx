import { useState } from "react";
import { FileText, Gauge, HelpCircle, Lock, Server, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { InlineNotice, SectionHeader } from "../components/ui";
import { apiEnabled, useApp } from "../lib/store";

const DOCS: Record<string, { title: string; intro: string; sections: { h: string; body: string }[] }> = {
  docs: {
    title: "Documentation",
    intro: "How VeriBrand AI works, what it can verify, and where it deliberately stops.",
    sections: [
      { h: "The five steps", body: "DEFINE your brand references, ANALYSE submitted content, VERIFY claims against approved evidence, IMPROVE with accept/reject edits, APPROVE through a human decision." },
      { h: "Verification statuses", body: "SUPPORTED means approved evidence backs the claim. NEEDS REVIEW means evidence is missing, ambiguous or outdated — a missing source is never treated as a contradiction. CONTRADICTED means approved evidence conflicts with the claim." },
      { h: "Scoring", body: "Score = 100 minus the severity weights of non-supported findings (critical 18, high 12, medium 7, low 3, informational 1), capped at 0–100. It is a triage aid, never a compliance guarantee." },
      { h: "Analysis engine", body: "Without a configured AI provider, audits run on a deterministic local engine: numeric claims are matched against approved facts, known claim shapes are pattern-matched, and configured rules are evaluated. Results are labelled accordingly." },
      { h: "Documents", body: "TXT and DOCX are parsed in your browser. PDF extraction requires the backend document service and fails loudly when unavailable." },
      { h: "Roles", body: "ADMIN manages workspace and brand references, EDITOR creates content and runs audits, REVIEWER records decisions, VIEWER reads permitted records." },
    ],
  },
  help: {
    title: "Help Center",
    intro: "Common tasks and what to do when something does not behave as expected.",
    sections: [
      { h: "Run my first audit", body: "Open New Audit, load the sample content, keep the default checks and press Run Brand Audit. Results open with an evidence panel for every finding." },
      { h: "A finding looks wrong", body: "Open the evidence panel and use “Mark false positive” with a reason, or add a reviewer comment. Nothing is silently discarded." },
      { h: "My PDF was rejected", body: "PDF text extraction needs the backend (PyMuPDF). Until it is configured, paste the text or upload TXT/DOCX." },
      { h: "Where is my data?", body: "In demo mode everything is stored in this browser's localStorage. Clearing site data removes it. Nothing is uploaded." },
      { h: "Reset the sample workspace", body: "Settings → Data & demo mode → Reset sample data restores the fictional Nova Bottle demonstration." },
    ],
  },
  security: {
    title: "Security",
    intro: "The controls implemented in this build, stated plainly.",
    sections: [
      { h: "Input handling", body: "Uploaded files are type-checked and size-limited (5 MB). Uploaded content and documents are treated as untrusted data and are never interpreted as instructions." },
      { h: "Workspace isolation", body: "Every record is scoped by workspace id; queries in the UI filter on the active workspace before rendering." },
      { h: "Secrets", body: "No API keys exist in the frontend bundle. LLM keys belong to the backend environment only and are never committed." },
      { h: "Authentication", body: "Demo mode uses a browser-local session and is clearly labelled as such. Production deployments must configure the FastAPI backend for real authentication and server-side authorisation." },
      { h: "Exports", body: "CSV, JSON and printed reports contain audit data only — never credentials or tokens." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "What is processed, where, and for how long.",
    sections: [
      { h: "Demo mode", body: "Content, brand references and audit records stay in your browser's localStorage. They are not transmitted anywhere." },
      { h: "Backend mode", body: "When a backend is configured, content is stored in that deployment's database and may be sent to the configured LLM provider for analysis. Review that provider's terms before enabling it." },
      { h: "Deletion", body: "You can delete audits, rules, facts, documents and assets from their respective screens. Deleting browser site data removes all local records." },
      { h: "No tracking", body: "This build contains no analytics, advertising or third-party tracking scripts." },
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "Fair-use terms for this demonstration application.",
    sections: [
      { h: "Decision support only", body: "VeriBrand AI provides decision support. It does not guarantee legal compliance, factual accuracy or regulatory approval — a human always makes the final call." },
      { h: "Sample data", body: "The Nova Bottle brand, its products, specifications and pricing are fictional demonstration content." },
      { h: "No fabricated evidence", body: "The product never invents citations. Where evidence is unavailable, it says so explicitly." },
      { h: "Availability", body: "This is a demonstration build provided as-is; features unavailable in the current configuration are labelled in the interface." },
    ],
  },
};

export default function InfoPage({ page }: { page: keyof typeof DOCS | "landing" }) {
  const { state } = useApp();
  const [tab, setTab] = useState<string>(page === "landing" ? "docs" : page);
  const doc = DOCS[tab] ?? DOCS.docs;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SectionHeader title={doc.title} description={doc.intro} />

      <div className="flex flex-wrap gap-2">
        {([
          { key: "docs", label: "Documentation", icon: FileText },
          { key: "help", label: "Help Center", icon: HelpCircle },
          { key: "security", label: "Security", icon: Lock },
          { key: "privacy", label: "Privacy", icon: ShieldCheck },
          { key: "terms", label: "Terms", icon: Server },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`chip ${tab === t.key ? "border-accent/50 bg-accent/15 text-accent" : "border-white/15 bg-white/5 text-ink-muted hover:text-ink"}`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {doc.sections.map((s) => (
          <section key={s.h} className="surface p-5">
            <h2 className="text-base font-semibold text-ink">{s.h}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
          </section>
        ))}
      </div>

      <InlineNotice tone={apiEnabled ? "success" : "warning"} title={apiEnabled ? "Backend configured" : "Running in local demo mode"}>
        {apiEnabled
          ? `A backend is configured at ${apiEnabled ? "the VITE_API_BASE_URL origin" : ""}. Authentication and persistence run server-side.`
          : "No backend is configured: authentication, persistence and analysis all run in this browser and are labelled as demo mode."}
      </InlineNotice>

      <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <Gauge size={18} className="text-accent" />
          <div>
            <p className="text-sm font-semibold text-ink">Current workspace</p>
            <p className="text-xs text-ink-muted">{state.workspaces.find((w) => w.id === state.session?.workspaceId)?.name ?? "—"} · {state.audits.length} audits · {state.rules.filter((r) => r.status === "active").length} active rules</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/app/settings" className="btn-secondary"><Sparkles size={15} /> Settings</Link>
          <Link to="/app" className="btn-primary">Open dashboard</Link>
        </div>
      </div>
    </div>
  );
}
