import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FilePlus2,
  FileText,
  Filter,
  FlaskConical,
  Inbox,
  MessageSquare,
  Plus,
  ShieldAlert,
  Tag,
  UploadCloud,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { dashboardTotals } from "../lib/analytics";
import { useApp } from "../lib/store";
import { cn, formatDate, timeAgo, truncate } from "../lib/utils";
import { EmptyState, SampleBadge, SeverityBadge, StatusBadge, VerificationBadge } from "../components/ui";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "in_progress", label: "In Progress" },
  { key: "needs_review", label: "Needs Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const RISK_TONE: Record<string, string> = {
  critical: "text-bad",
  high: "text-[#f87171]",
  medium: "text-warn",
  low: "text-info",
  informational: "text-ink-muted",
  clear: "text-ok",
};

export default function Overview() {
  const { state, user, brand, isSampleWorkspace, can, denyReason } = useApp();
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const audits = useMemo(
    () => [...state.audits].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.audits],
  );
  const filtered = filter === "all" ? audits : audits.filter((a) => a.status === filter);
  const totals = useMemo(() => dashboardTotals(state.audits, state.approvals), [state.audits, state.approvals]);

  const cards = [
    { label: "Total Audits", value: totals.totalAudits, icon: FileText, tone: "text-accent", to: "/app/audits", hint: "All audits in this workspace" },
    { label: "Content Approved", value: totals.approved, icon: CheckCircle2, tone: "text-ok", to: "/app/approvals", hint: "Audits that reached approved status" },
    { label: "Issues Detected", value: totals.issues, icon: AlertTriangle, tone: "text-warn", to: "/app/pulse", hint: "Findings excluding supported claims" },
    { label: "Pending Reviews", value: totals.pending, icon: Clock, tone: "text-info", to: "/app/approvals", hint: "Submissions awaiting a decision" },
  ];

  const quickActions = [
    { label: "Start New Audit", icon: FilePlus2, to: "/app/audit/new", disabled: !can("run_audit"), reason: denyReason("run_audit") },
    { label: "Add Brand Rule", icon: Plus, to: "/app/brand?tab=rules", disabled: !can("edit_brand"), reason: denyReason("edit_brand") },
    { label: "Upload Guidelines", icon: UploadCloud, to: "/app/brand?tab=documents", disabled: !can("edit_brand"), reason: denyReason("edit_brand") },
    { label: "Review Pending Content", icon: Inbox, to: "/app/approvals", disabled: false, reason: "" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* welcome */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}!</h1>
            {isSampleWorkspace && <SampleBadge note="Sample data" />}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            Keep your brand accurate, consistent, and ready for publication.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/truthtrace" className="btn-secondary">
            <ShieldAlert size={15} /> TruthTrace
          </Link>
          <button
            className="btn-primary"
            onClick={() => (can("run_audit") ? navigate("/app/audit/new") : undefined)}
            disabled={!can("run_audit")}
            title={can("run_audit") ? "Run a new audit" : denyReason("run_audit")}
          >
            <FilePlus2 size={15} /> New Audit
          </button>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="surface group p-5 transition-all hover:-translate-y-0.5 hover:border-accent/35">
            <div className="flex items-start justify-between">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]", c.tone)}>
                <c.icon size={19} />
              </span>
              <ArrowRight size={15} className="text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-ink">{c.value}</p>
            <p className="mt-0.5 text-sm font-medium text-ink">{c.label}</p>
            <p className="mt-1 text-[11px] text-ink-muted">{c.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* recent audits */}
        <section className="surface overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Recent audits</h2>
              <p className="text-xs text-ink-muted">Latest content submitted for review in this workspace</p>
            </div>
            <div className="flex items-center gap-2 text-ink-muted">
              <Filter size={14} />
              <select
                className="rounded-lg border border-white/10 bg-base-soft px-2.5 py-1.5 text-xs text-ink"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter audits by status"
              >
                {FILTERS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Content</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Findings</th>
                  <th className="px-3 py-3 font-semibold">Risk</th>
                  <th className="px-3 py-3 font-semibold">Reviewer</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const reviewer = state.users.find((u) => u.id === a.reviewerId);
                  const high = a.findings.filter((f) => f.severity === "critical" || f.severity === "high").length;
                  return (
                    <tr key={a.id} className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.03]">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink">{a.title}</p>
                        <p className="text-xs text-ink-muted">{a.campaignName ?? brand?.name ?? "Brand content"}</p>
                      </td>
                      <td className="px-3 py-3.5 text-xs text-ink-muted">{a.contentType}</td>
                      <td className="px-3 py-3.5 text-xs text-ink-muted">{formatDate(a.createdAt)}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={a.status} /></td>
                      <td className="px-3 py-3.5">
                        <span className="text-sm font-semibold text-ink">{a.findings.length}</span>
                        {high > 0 && <span className="ml-1.5 text-[11px] text-bad">{high} high</span>}
                      </td>
                      <td className={cn("px-3 py-3.5 text-xs font-semibold uppercase", RISK_TONE[a.riskLevel] ?? "text-ink-muted")}>{a.riskLevel}</td>
                      <td className="px-3 py-3.5 text-xs text-ink-muted">{reviewer?.name ?? "Unassigned"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={`/app/audits/${a.id}`} className="btn-secondary !px-3 !py-1.5 !text-xs">
                          View <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="divide-y divide-white/[0.05] md:hidden">
            {filtered.map((a) => (
              <Link key={a.id} to={`/app/audits/${a.id}`} className="block px-5 py-4 hover:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink">{a.title}</p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {a.contentType} · {formatDate(a.createdAt)} · {a.findings.length} findings
                </p>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="p-5">
              <EmptyState
                icon={<FileText size={20} />}
                title={filter === "all" ? "No audits yet" : `No ${FILTERS.find((f) => f.key === filter)?.label} audits`}
                body={filter === "all" ? "Submit your first piece of content to see evidence-linked findings." : "Try a different filter or run a new audit."}
                action={<Link to="/app/audit/new" className="btn-primary">Start New Audit</Link>}
              />
            </div>
          )}
        </section>

        {/* right column */}
        <div className="space-y-6">
          {/* quick actions */}
          <section className="surface p-5">
            <h2 className="text-base font-semibold text-ink">Quick actions</h2>
            <div className="mt-3 grid gap-2">
              {quickActions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => q.disabled ? undefined : navigate(q.to)}
                  disabled={q.disabled}
                  title={q.disabled ? q.reason : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left text-sm transition-colors",
                    q.disabled ? "cursor-not-allowed opacity-50" : "hover:border-accent/40 hover:bg-accent/[0.06]",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <q.icon size={16} />
                  </span>
                  <span className="font-medium text-ink">{q.label}</span>
                  <ArrowRight size={14} className="ml-auto text-ink-muted" />
                </button>
              ))}
            </div>
            {quickActions.some((q) => q.disabled) && (
              <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                Some actions are disabled for your role: {quickActions.filter((q) => q.disabled).map((q) => q.reason).join(" ")}
              </p>
            )}
          </section>

          {/* brand snapshot */}
          <section className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Brand snapshot</h2>
              <Link to="/app/brand" className="text-xs font-semibold text-accent hover:underline">Open studio</Link>
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              {[
                { k: "Brand", v: brand?.name ?? "Not configured" },
                { k: "Active rules", v: `${state.rules.filter((r) => r.status === "active").length}` },
                { k: "Approved facts", v: `${state.facts.length}` },
                { k: "Documents", v: `${state.documents.filter((d) => d.extracted).length} extracted` },
                { k: "Facts needing review", v: `${state.facts.filter((f) => (f.expiresAt && +new Date(f.expiresAt) < Date.now()) || f.verificationStatus !== "verified").length}` },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-2 last:border-0">
                  <dt className="text-ink-muted">{row.k}</dt>
                  <dd className="font-medium text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* activity */}
          <section className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Recent activity</h2>
              <MessageSquare size={15} className="text-ink-muted" />
            </div>
            <ol className="mt-3 space-y-3">
              {state.activity.slice(0, 7).map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug text-ink">{e.label}</p>
                    <p className="text-[11px] text-ink-muted">
                      {e.userName} · {timeAgo(e.at)}
                      {e.isSample ? " · sample data" : ""}
                    </p>
                  </div>
                </li>
              ))}
              {state.activity.length === 0 && (
                <li className="text-sm text-ink-muted">No activity recorded yet.</li>
              )}
            </ol>
          </section>
        </div>
      </div>

      {/* findings needing attention */}
      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Open findings needing attention</h2>
            <p className="text-xs text-ink-muted">High-impact findings that are still unresolved</p>
          </div>
          <Tag size={15} className="text-ink-muted" />
        </div>
        <div className="divide-y divide-white/[0.05]">
          {audits
            .flatMap((a) => a.findings.map((f) => ({ a, f })))
            .filter(({ f }) => f.reviewStatus === "open" && f.verificationStatus !== "SUPPORTED")
            .sort((x, y) => (x.f.severity === "critical" ? -1 : y.f.severity === "critical" ? 1 : 0))
            .slice(0, 5)
            .map(({ a, f }) => (
              <Link key={f.id} to={`/app/audits/${a.id}?finding=${f.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
                <SeverityBadge severity={f.severity} />
                <VerificationBadge status={f.verificationStatus} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.originalExcerpt}</span>
                <span className="text-xs text-ink-muted">{a.title}</span>
              </Link>
            ))}
          {audits.flatMap((a) => a.findings).filter((f) => f.reviewStatus === "open").length === 0 && (
            <div className="px-5 py-6">
              <EmptyState
                icon={<CheckCircle2 size={20} />}
                title="Nothing open"
                body="Every finding has been reviewed, accepted or dismissed. Run a new audit to check fresh content."
                action={<Link to="/app/audit/new" className="btn-primary">Run an audit</Link>}
              />
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <FlaskConical size={13} />
        {isSampleWorkspace
          ? "Figures above are computed from fictional sample data stored in this browser."
          : "Figures above are computed from records stored in this browser."}
        <ShieldAlert size={13} className="ml-3" /> {state.notifications.filter((n) => !n.read).length} unread notification(s).
      </div>
    </div>
  );
}
