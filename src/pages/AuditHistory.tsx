import { useMemo, useState } from "react";
import { FileSearch, Filter, Plus, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, SampleBadge, SectionHeader, SeverityBadge, StatusBadge, useConfirm, useToast } from "../components/ui";
import { useApp } from "../lib/store";
import { cn, formatDate, truncate } from "../lib/utils";

const STATUSES = ["all", "draft", "in_progress", "needs_review", "approved", "rejected"];

export default function AuditHistory() {
  const { state, can, denyReason, deleteAudit, isSampleWorkspace } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const confirm = useConfirm();
  const toast = useToast();

  const types = useMemo(() => [...new Set(state.audits.map((a) => a.contentType))], [state.audits]);

  const rows = useMemo(
    () =>
      [...state.audits]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .filter((a) => {
          const text = q.trim().toLowerCase();
          const mq = !text || a.title.toLowerCase().includes(text) || a.content.toLowerCase().includes(text) || (a.campaignName ?? "").toLowerCase().includes(text);
          const ms = status === "all" || a.status === status;
          const mt = type === "all" || a.contentType === type;
          return mq && ms && mt;
        }),
    [state.audits, q, status, type],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <SectionHeader
        title="Audit History"
        description="Every audit with its findings, versions and approval state. Records are scoped to this workspace."
        actions={
          <>
            {isSampleWorkspace && <SampleBadge />}
            <Link to="/app/audit/new" className="btn-primary"><Plus size={15} /> New Audit</Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search titles, campaigns or content…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audits" />
        </div>
        <div className="flex items-center gap-2 text-ink-muted">
          <Filter size={14} />
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace(/_/g, " ")}</option>)}
          </select>
          <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by content type">
            <option value="all">All content types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={20} />}
          title="No audits match"
          body={q || status !== "all" || type !== "all" ? "Adjust the search or filters." : "Submit content for an audit to build your history."}
          action={<Link to="/app/audit/new" className="btn-primary">Start your first audit</Link>}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const reviewer = state.users.find((u) => u.id === a.reviewerId);
            const approval = state.approvals.find((x) => x.auditId === a.id);
            return (
              <article key={a.id} className="surface p-4 transition-all hover:border-accent/30">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/app/audits/${a.id}`} className="font-semibold text-ink hover:text-accent">{a.title}</Link>
                      <StatusBadge status={a.status} />
                      <SeverityBadge severity={a.riskLevel === "clear" ? "informational" : a.riskLevel} />
                      {a.isSample && <SampleBadge />}
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {a.contentType} · {formatDate(a.createdAt)} · v{a.version}
                      {a.campaignName ? ` · ${a.campaignName}` : ""} · reviewer {reviewer?.name ?? "unassigned"}
                      {approval ? ` · approval ${approval.status.replace(/_/g, " ")}` : ""}
                    </p>
                    <p className="mt-1.5 max-w-3xl text-sm text-ink-muted">{truncate(a.summaryText || a.content, 170)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="chip border-white/15 bg-white/5 text-ink-muted">{a.findings.length} findings</span>
                      <span className="chip border-bad/30 bg-bad/10 text-bad">
                        {a.findings.filter((f) => f.verificationStatus === "CONTRADICTED").length} contradicted
                      </span>
                      <span className="chip border-warn/30 bg-warn/10 text-warn">
                        {a.findings.filter((f) => f.verificationStatus === "NEEDS_REVIEW").length} need review
                      </span>
                      <span className="chip border-ok/30 bg-ok/10 text-ok">
                        {a.findings.filter((f) => f.verificationStatus === "SUPPORTED").length} supported
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Link to={`/app/audits/${a.id}`} className="btn-primary !px-4 !py-2 !text-xs">Open results</Link>
                    <div className="flex gap-2">
                      <Link to={`/app/rewrite?audit=${a.id}`} className="btn-secondary !px-3 !py-1.5 !text-xs">Rewrite</Link>
                      <button
                        className="btn-danger !px-3 !py-1.5 !text-xs"
                        disabled={!can("edit_brand")}
                        title={can("edit_brand") ? "Delete audit" : denyReason("edit_brand")}
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete this audit?",
                            body: `“${a.title}” and its findings will be removed. Associated approval records are also removed.`,
                            confirmLabel: "Delete",
                            tone: "danger",
                          });
                          if (!ok) return;
                          deleteAudit(a.id);
                          toast({ tone: "info", title: "Audit deleted" });
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className={cn("text-[11px] text-ink-muted")}>
        {rows.length} of {state.audits.length} audits shown. History is stored in this browser when no backend is configured.
      </p>
    </div>
  );
}
