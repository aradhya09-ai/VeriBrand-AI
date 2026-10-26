import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  ShieldAlert,
  UserCog,
  XCircle,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState, InlineNotice, Modal, SampleBadge, SectionHeader, StatusBadge, Tabs, useConfirm, useToast } from "../components/ui";
import { useApp, unresolvedHigh } from "../lib/store";
import type { ChecklistItem, ChecklistStatus } from "../lib/types";
import { cn, formatDateTime, timeAgo } from "../lib/utils";

const STATUS_TONE: Record<string, string> = {
  pending_review: "border-warn/35 bg-warn/10 text-warn",
  approved: "border-ok/35 bg-ok/10 text-ok",
  rejected: "border-bad/35 bg-bad/10 text-bad",
  changes_requested: "border-info/35 bg-info/10 text-info",
  draft: "border-white/15 bg-white/5 text-ink-muted",
  archived: "border-white/15 bg-white/5 text-ink-muted",
};

function buildChecklist(items: { key: string; label: string; required: boolean }[], audit: ReturnType<typeof useApp>["state"]["audits"][number] | undefined): ChecklistItem[] {
  if (!audit) return [];
  const findings = audit.findings;
  const openHighCount = unresolvedHigh(findings).length;
  const hasDisclaimers = findings.some((f) => f.category === "disclaimer");
  const disclaimersResolved = findings.filter((f) => f.category === "disclaimer").every((f) => f.reviewStatus !== "open");
  const toneFindings = findings.filter((f) => f.category === "tone");
  const accFindings = findings.filter((f) => f.category === "accessibility");

  const evidence: Record<string, Pick<ChecklistItem, "status" | "evidence" | "nextAction">> = {
    rules: {
      status: audit.checks.includes("brand_rules") ? "complete" : "not_applicable",
      evidence: audit.checks.includes("brand_rules") ? "Brand rule compliance check ran during this audit." : "This check was not selected for the audit.",
      nextAction: audit.checks.includes("brand_rules") ? "None" : "Re-run the audit with brand rule compliance enabled.",
    },
    facts: {
      status: audit.checks.includes("factual_verification") ? (findings.some((f) => f.category === "factual_accuracy" && f.verificationStatus === "NEEDS_REVIEW") ? "needs_review" : "complete") : "incomplete",
      evidence: audit.checks.includes("factual_verification") ? "Measurable claims were compared with approved facts." : "Factual verification was skipped.",
      nextAction: "Re-run with factual verification enabled.",
    },
    high: {
      status: openHighCount === 0 ? "complete" : "incomplete",
      evidence: openHighCount === 0 ? "No open critical or high findings." : `${openHighCount} critical/high finding(s) still open.`,
      nextAction: openHighCount === 0 ? "None" : "Resolve or explicitly override each finding.",
    },
    disclaimers: {
      status: !hasDisclaimers ? "not_applicable" : disclaimersResolved ? "complete" : "incomplete",
      evidence: hasDisclaimers ? "Disclaimer findings recorded for this content." : "No disclaimer requirement triggered.",
      nextAction: disclaimersResolved ? "None" : "Add the required wording or accept the finding.",
    },
    tone: {
      status: audit.checks.includes("tone") ? (toneFindings.some((f) => f.reviewStatus === "open") ? "needs_review" : "complete") : "not_applicable",
      evidence: audit.checks.includes("tone") ? `${toneFindings.length} tone finding(s) recorded.` : "Tone check not selected.",
      nextAction: "Review tone findings in the audit results.",
    },
    accessibility: {
      status: !audit.checks.includes("accessibility") ? "not_applicable" : accFindings.some((f) => f.reviewStatus === "open") ? "needs_review" : "complete",
      evidence: `${accFindings.length} accessibility observation(s).`,
      nextAction: "Review readability observations.",
    },
    visual: {
      status: "needs_review",
      evidence: "Visual assets are checked separately in VisualGuard.",
      nextAction: "Upload creative in VisualGuard if this content ships with an image.",
    },
    audited: {
      status: "complete",
      evidence: `Audit v${audit.version} completed ${formatDateTime(audit.createdAt)}.`,
      nextAction: "None",
    },
    human: {
      status: "incomplete",
      evidence: "No approval decision recorded yet.",
      nextAction: "A reviewer must approve, reject or request changes.",
    },
  };

  return items.map((cfg) => {
    const e = evidence[cfg.key] ?? { status: "needs_review" as ChecklistStatus, evidence: "Not evaluated.", nextAction: "Review manually." };
    return { key: cfg.key, label: cfg.label, required: cfg.required, ...e };
  });
}

/* ------------------------------------------------------------------ */

export default function Approvals() {
  const { id } = useParams();
  if (id) return <ReviewPage id={id} />;
  return <ApprovalList />;
}

function ApprovalList() {
  const { state, isSampleWorkspace } = useApp();
  const [status, setStatus] = useState("all");
  const rows = state.approvals.filter((a) => status === "all" || a.status === status);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <SectionHeader
        title="ApprovalFlow"
        description="Human-in-the-loop review: submit audited content, capture decisions, comments and override reasons."
        actions={isSampleWorkspace && <SampleBadge />}
      />

      <Tabs
        ariaLabel="Approval statuses"
        active={status}
        onChange={setStatus}
        items={[
          { key: "all", label: "All", badge: state.approvals.length },
          { key: "pending_review", label: "Pending review", badge: state.approvals.filter((a) => a.status === "pending_review").length },
          { key: "changes_requested", label: "Changes requested", badge: state.approvals.filter((a) => a.status === "changes_requested").length },
          { key: "approved", label: "Approved", badge: state.approvals.filter((a) => a.status === "approved").length },
          { key: "rejected", label: "Rejected", badge: state.approvals.filter((a) => a.status === "rejected").length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Send size={20} />}
          title="Nothing waiting for review"
          body="Run an audit, open the results and press “Submit for approval” to send content to a reviewer."
          action={<Link to="/app/audits" className="btn-primary">Open audit history</Link>}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const audit = state.audits.find((x) => x.id === a.auditId);
            const unresolved = audit ? unresolvedHigh(audit.findings).length : 0;
            return (
              <Link key={a.id} to={`/app/approvals/${a.id}`} className="surface flex flex-wrap items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/35">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{audit?.title ?? "Deleted audit"}</p>
                    <span className={cn("chip", STATUS_TONE[a.status])}>{a.status.replace(/_/g, " ")}</span>
                    {unresolved > 0 && (
                      <span className="chip border-bad/35 bg-bad/10 text-bad"><AlertTriangle size={11} /> {unresolved} unresolved high</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    Submitted by {a.submitterName} {a.submittedAt ? timeAgo(a.submittedAt) : ""} · reviewer {a.reviewerName ?? "unassigned"} · v{a.contentVersion}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-muted">{a.decisions.length} decision(s) · {a.comments.length} comment(s)</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">Open review <ArrowRight size={12} /></span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ReviewPage({ id }: { id: string }) {
  const { state, role, can, denyReason, addApprovalComment, decide, updateChecklist, updateAudit, isSampleWorkspace } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const approval = state.approvals.find((a) => a.id === id);
  const audit = state.audits.find((a) => a.id === approval?.auditId);
  const [comment, setComment] = useState("");
  const [decisionOpen, setDecisionOpen] = useState<"approve" | "reject" | "request_changes" | null>(null);
  const [note, setNote] = useState("");
  const [override, setOverride] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);

  const checklist = useMemo(() => {
    if (!approval || !audit) return [];
    if (approval.checklist.length) return approval.checklist;
    return buildChecklist(state.checklistConfig, audit);
  }, [approval, audit, state.checklistConfig]);

  if (!approval || !audit) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState icon={<XCircle size={20} />} title="Approval record not found" body="It may have been archived or belongs to another workspace." action={<Link to="/app/approvals" className="btn-primary">Back to ApprovalFlow</Link>} />
      </div>
    );
  }

  const unresolved = unresolvedHigh(audit.findings);
  const canDecide = can("decide_review");
  const decided = approval.status === "approved" || approval.status === "rejected";

  const openDecision = (kind: "approve" | "reject" | "request_changes") => {
    setNote("");
    setOverride("");
    setDecisionOpen(kind);
  };

  const submitDecision = () => {
    if (!decisionOpen) return;
    const res = decide(approval.id, decisionOpen, { comment: note.trim(), overrideReason: override.trim() });
    if (!res.ok) {
      toast({ tone: "error", title: "Decision not recorded", description: res.error });
      return;
    }
    toast({
      tone: decisionOpen === "approve" ? "success" : "info",
      title: decisionOpen === "approve" ? "Approved" : decisionOpen === "reject" ? "Rejected" : "Changes requested",
      description: "The decision was written to the approval history.",
    });
    setDecisionOpen(null);
    if (decisionOpen === "approve") updateChecklist(approval.id, checklist.map((c) => (c.key === "human" ? { ...c, status: "complete", evidence: `Approved by ${state.users.find((u) => u.id === state.session?.userId)?.name ?? "reviewer"} at ${formatDateTime(new Date().toISOString())}`, nextAction: "None" } : c)));
  };

  const setCheck = (key: string, status: ChecklistStatus) => {
    updateChecklist(approval.id, checklist.map((c) => (c.key === key ? { ...c, status } : c)));
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/app/approvals" className="mb-2 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">← ApprovalFlow</Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{audit.title}</h1>
            <span className={cn("chip", STATUS_TONE[approval.status])}>{approval.status.replace(/_/g, " ")}</span>
            {isSampleWorkspace && <SampleBadge />}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Submitter {approval.submitterName} · Reviewer {approval.reviewerName ?? "unassigned"} · submitted {approval.submittedAt ? formatDateTime(approval.submittedAt) : "—"} · updated {timeAgo(approval.updatedAt)} · content v{approval.contentVersion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setReassignOpen(true)} disabled={!canDecide} title={canDecide ? "Reassign reviewer" : denyReason("decide_review")}>
            <UserCog size={15} /> Reassign
          </button>
          <Link to={`/app/audits/${audit.id}`} className="btn-secondary">View audit</Link>
          <button className="btn-secondary" onClick={() => openDecision("request_changes")} disabled={!canDecide || decided}>
            Request changes
          </button>
          <button className="btn-danger" onClick={() => openDecision("reject")} disabled={!canDecide || decided}>
            <XCircle size={15} /> Reject
          </button>
          <button className="btn-primary" onClick={() => openDecision("approve")} disabled={!canDecide || decided}>
            <CheckCircle2 size={15} /> Approve
          </button>
        </div>
      </div>

      {!canDecide && <InlineNotice tone="warning" title="You cannot record a decision">{denyReason("decide_review")} Your current role is {role}.</InlineNotice>}
      {unresolved.length > 0 && !decided && (
        <InlineNotice tone="warning" title={`${unresolved.length} unresolved critical/high finding(s)`}>
          Approving with unresolved high-severity findings requires an explicit override explanation. Review the findings
          first — open them from the audit page.
        </InlineNotice>
      )}
      {decided && (
        <InlineNotice tone={approval.status === "approved" ? "success" : "danger"} title={`This content was ${approval.status.replace("_", " ")}`}>
          Decisions are part of the audit history and cannot be silently modified. Re-submitting requires a new audit
          version.
        </InlineNotice>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* content */}
        <div className="space-y-5 lg:col-span-2">
          <div className="surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Original content (v{audit.version})</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{audit.content}</p>
          </div>
          {(audit.revisedContent ?? audit.findings.some((f) => f.suggestedCorrection)) && (
            <div className="surface p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ok">Revised / corrected version</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{audit.revisedContent ?? "Accept corrections in Rewrite Studio to generate a revised version."}</p>
            </div>
          )}

          <div className="surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Audit summary</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Findings", v: audit.findings.length },
                { l: "Open high", v: unresolved.length },
                { l: "Contradicted", v: audit.findings.filter((f) => f.verificationStatus === "CONTRADICTED").length },
                { l: "Score", v: audit.score.score ?? "n/a" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-center">
                  <p className="text-xl font-bold text-ink">{s.v}</p>
                  <p className="text-[11px] text-ink-muted">{s.l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">{audit.summaryText}</p>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Unresolved findings</p>
            <ul className="mt-2 space-y-2">
              {audit.findings.filter((f) => f.reviewStatus === "open").map((f) => (
                <li key={f.id}>
                  <Link to={`/app/audits/${audit.id}?finding=${f.id}`} className="flex items-center gap-3 rounded-lg border border-white/[0.07] px-3 py-2 text-sm hover:border-accent/40">
                    <span className={cn("chip", f.verificationStatus === "CONTRADICTED" ? "border-bad/35 bg-bad/10 text-bad" : "border-warn/35 bg-warn/10 text-warn")}>{f.verificationStatus}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{f.originalExcerpt}</span>
                    <ArrowRight size={13} className="text-ink-muted" />
                  </Link>
                </li>
              ))}
              {audit.findings.filter((f) => f.reviewStatus === "open").length === 0 && (
                <li className="text-sm text-ok">All findings have been reviewed.</li>
              )}
            </ul>
          </div>

          {/* comments */}
          <div className="surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><MessageSquare size={15} /> Reviewer comments &amp; history</p>
            <ul className="mt-3 space-y-3">
              {approval.comments.map((c) => (
                <li key={c.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{c.authorName} <span className="text-[11px] font-normal uppercase text-ink-muted">{c.role}</span></span>
                    <span className="text-[11px] text-ink-muted">{formatDateTime(c.at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{c.body}</p>
                </li>
              ))}
              {approval.comments.length === 0 && <li className="text-sm text-ink-muted">No comments yet.</li>}
            </ul>
            <div className="mt-3 flex gap-2">
              <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment for the team…" aria-label="Add a comment" />
              <button
                className="btn-secondary"
                onClick={() => {
                  if (!comment.trim()) return;
                  addApprovalComment(approval.id, comment.trim());
                  setComment("");
                  toast({ tone: "success", title: "Comment added" });
                }}
              >
                Add
              </button>
            </div>

            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Decision history</p>
              <ol className="mt-2 space-y-2">
                {approval.history.map((h, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Clock size={13} className="text-ink-muted" />
                    <span className="text-ink">{h.label}</span>
                    <span className="text-xs text-ink-muted">by {h.by} · {formatDateTime(h.at)}</span>
                  </li>
                ))}
                {approval.decisions.map((d) => (
                  <li key={d.id} className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 text-sm">
                    <p className="font-semibold text-ink">{d.decision === "approve" ? "Approved" : d.decision === "reject" ? "Rejected" : "Changes requested"} by {d.reviewerName} · {formatDateTime(d.at)}</p>
                    {d.comment && <p className="mt-1 text-ink-muted">“{d.comment}”</p>}
                    {d.overrideReason && <p className="mt-1 text-warn">Override reason: {d.overrideReason}</p>}
                    <p className="mt-1 text-[11px] text-ink-muted">Content v{d.auditVersion} · {d.unresolvedAtDecision} unresolved high-severity finding(s) at decision time</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* checklist */}
        <div className="space-y-5">
          <div className="surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldAlert size={15} className="text-accent" /> Pre-flight checklist</p>
            <p className="mt-1 text-xs text-ink-muted">Items are never marked complete because a check was skipped.</p>
            <ul className="mt-3 space-y-3">
              {checklist.map((c) => (
                <li key={c.key} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {c.label} {c.required && <span className="text-bad">*</span>}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">{c.evidence}</p>
                      {c.nextAction !== "None" && <p className="mt-0.5 text-[11px] text-accent-cyan">Next: {c.nextAction}</p>}
                    </div>
                    <select
                      className="input w-auto !py-1 !text-[11px]"
                      value={c.status}
                      onChange={(e) => setCheck(c.key, e.target.value as ChecklistStatus)}
                      aria-label={`${c.label} status`}
                    >
                      {["complete", "incomplete", "needs_review", "not_applicable"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface p-5">
            <p className="text-sm font-semibold text-ink">Workflow status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["draft", "audit_completed", "pending_review", "approved", "rejected"].map((s) => (
                <span key={s} className={cn("chip", approval.status === s ? STATUS_TONE[s] : "border-white/10 bg-white/[0.03] text-ink-muted")}>
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <button
              className="btn-secondary mt-4 w-full"
              onClick={async () => {
                const ok = await confirm({ title: "Archive this approval?", body: "Archiving hides it from the active queue. Records and decisions are kept.", confirmLabel: "Archive" });
                if (!ok) return;
                updateAudit(audit.id, { status: "draft" });
                toast({ tone: "info", title: "Approval archived", description: "History is preserved." });
                navigate("/app/approvals");
              }}
            >
              Archive approval
            </button>
          </div>
        </div>
      </div>

      {/* decision modal */}
      <Modal
        open={!!decisionOpen}
        onClose={() => setDecisionOpen(null)}
        title={decisionOpen === "approve" ? "Approve content" : decisionOpen === "reject" ? "Reject content" : "Request changes"}
        description={
          decisionOpen === "request_changes"
            ? "A comment explaining what needs to be fixed is required."
            : decisionOpen === "reject"
              ? "Explain the decision so the submitter knows how to proceed."
              : "Record the reviewer, timestamp, content version and audit state."
        }
      >
        <div className="space-y-4">
          <textarea
            className="input min-h-28"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={decisionOpen === "request_changes" ? "What must change before this can be approved?" : "Optional reviewer note"}
            aria-label="Decision comment"
          />
          {decisionOpen === "request_changes" && !note.trim() && (
            <p className="text-xs text-warn">A comment is required to request changes.</p>
          )}

          {decisionOpen === "approve" && unresolved.length > 0 && (
            <div className="rounded-xl border border-warn/40 bg-warn/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warn"><AlertTriangle size={15} /> Override required</p>
              <p className="mt-1 text-xs text-ink-muted">
                {unresolved.length} critical/high finding(s) are still open. An explanation is mandatory to approve over
                them.
              </p>
              <textarea
                className="input mt-2 min-h-20"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                placeholder="Why is it safe to approve despite these findings?"
                aria-label="Override explanation"
              />
              {!override.trim() && <p className="mt-1 text-xs text-bad">Override explanation is required.</p>}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setDecisionOpen(null)}>Cancel</button>
            <button
              className={decisionOpen === "reject" ? "btn-danger" : "btn-primary"}
              onClick={submitDecision}
              disabled={decisionOpen === "request_changes" && !note.trim()}
            >
              {decisionOpen === "approve" ? <Check size={15} /> : <Send size={15} />}
              Confirm {decisionOpen === "approve" ? "approval" : decisionOpen === "reject" ? "rejection" : "request"}
            </button>
          </div>
        </div>
      </Modal>

      {/* reassign */}
      <Modal open={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign reviewer">
        <div className="space-y-3">
          <select
            className="input"
            defaultValue={approval.reviewerId ?? ""}
            aria-label="New reviewer"
            onChange={(e) => {
              const u = state.users.find((x) => x.id === e.target.value);
              if (!u) return;
              addApprovalComment(approval.id, `Reviewer reassigned to ${u.name}.`);
              toast({ tone: "success", title: "Reviewer reassigned", description: u.name });
              setReassignOpen(false);
            }}
          >
            <option value="">Choose a reviewer…</option>
            {state.memberships.filter((m) => m.workspaceId === approval.workspaceId).map((m) => {
              const u = state.users.find((x) => x.id === m.userId);
              return u ? <option key={u.id} value={u.id}>{u.name} — {m.role}</option> : null;
            })}
          </select>
          <InlineNotice tone="info">Reassignment is recorded in the decision history for traceability.</InlineNotice>
        </div>
      </Modal>
    </div>
  );
}
