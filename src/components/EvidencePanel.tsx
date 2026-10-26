import { useState } from "react";
import {
  Check,
  FileText,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Audit, Finding } from "../lib/types";
import { cn, formatDateTime } from "../lib/utils";
import { InlineNotice, Modal, SeverityBadge, VerificationBadge, useConfirm, useToast } from "./ui";

function EvidenceRow({ label, value, tone }: { label: string; value?: React.ReactNode; tone?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <div className={cn("mt-1 text-sm leading-relaxed", tone ?? "text-ink")}>{value}</div>
    </div>
  );
}

export default function EvidencePanel({
  audit,
  finding,
  onClose,
}: {
  audit: Audit;
  finding: Finding;
  onClose: () => void;
}) {
  const { state, updateFinding, addFindingComment, can, denyReason, user } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(finding.suggestedCorrection ?? "");
  const [comment, setComment] = useState("");
  const [fpOpen, setFpOpen] = useState(false);
  const [fpReason, setFpReason] = useState("");
  const editable = can("run_audit");

  const rule = state.rules.find((r) => finding.matchedRuleIds.includes(r.id));
  const fact = finding.evidence.find((e) => e.type === "fact");
  const factRecord = fact?.refId ? state.facts.find((f) => f.id === fact.refId) : undefined;
  const doc = factRecord?.sourceDocId
    ? state.documents.find((d) => d.id === factRecord.sourceDocId)
    : state.documents.find((d) => fact?.sourceLabel?.startsWith(d.filename));
  const docPassage =
    fact?.passage ??
    doc?.passages.find((p) => (fact?.sourceLabel ?? "").includes(p.ref))?.text ??
    doc?.passages[0]?.text;
  const assignee = state.users.find((u) => u.id === finding.assigneeId);
  const hasEvidence = finding.evidence.some((e) => e.type === "fact" || e.type === "document" || e.type === "campaign");

  const set = (patch: Partial<Finding>) => updateFinding(audit.id, finding.id, patch);

  const accept = () => {
    set({ reviewStatus: "accepted", resolutionNote: `Accepted suggestion at ${new Date().toLocaleString()}` });
    toast({ tone: "success", title: "Suggestion accepted", description: "It will be proposed in Rewrite Studio." });
  };

  const reject = async () => {
    const ok = await confirm({
      title: "Reject this suggestion?",
      body: "The finding stays open — rejecting a suggestion does not resolve the finding unless you mark it resolved.",
      confirmLabel: "Reject suggestion",
      tone: "danger",
    });
    if (!ok) return;
    set({ reviewStatus: "rejected", resolutionNote: undefined });
    toast({ tone: "info", title: "Suggestion rejected", description: "The finding remains open for human decision." });
  };

  const saveEdit = () => {
    set({ suggestedCorrection: editText, reviewStatus: "edited", resolutionNote: "Suggestion edited before acceptance" });
    setEditOpen(false);
    toast({ tone: "success", title: "Edited suggestion saved" });
  };

  const markFalsePositive = () => {
    if (fpReason.trim().length < 8) return;
    set({ reviewStatus: "false_positive", falsePositiveReason: fpReason.trim(), resolutionNote: "Marked as a false positive" });
    setFpOpen(false);
    setFpReason("");
    toast({ tone: "info", title: "Marked as false positive", description: "Recorded with your reason." });
  };

  const statusTone =
    finding.verificationStatus === "CONTRADICTED" ? "border-bad/30 bg-bad/[0.06]" : finding.verificationStatus === "SUPPORTED" ? "border-ok/30 bg-ok/[0.06]" : "border-warn/30 bg-warn/[0.06]";

  return (
    <div className="fixed inset-0 z-[85] flex justify-end" role="dialog" aria-modal="true" aria-label="Finding evidence">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl animate-slideIn flex-col border-l border-white/10 bg-card-elevated shadow-card">
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <VerificationBadge status={finding.verificationStatus} />
              <span className="chip border-white/15 bg-white/5 text-ink-muted">{finding.category.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">Finding {finding.id} · review status: {finding.reviewStatus.replace(/_/g, " ")}</p>
          </div>
          <button className="btn-ghost !px-2" onClick={onClose} aria-label="Close evidence panel"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className={cn("rounded-xl border p-4", statusTone)}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Original claim</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink">“{finding.originalExcerpt}”</p>
          </div>

          <EvidenceRow label="Explanation" value={finding.explanation} />
          <EvidenceRow label="Matched brand rule" value={rule ? <><b className="text-ink">{rule.title}</b><span className="block text-xs text-ink-muted">{rule.description}</span></> : undefined} />
          <EvidenceRow label="Relevant approved fact" value={fact ? <><b className="text-ink">{fact.label}</b>{fact.sourceLabel && <span className="block text-xs text-ink-muted">Source: {fact.sourceLabel}</span>}</> : undefined} />
          <EvidenceRow label="Source document" value={doc ? <span className="flex items-center gap-1.5"><FileText size={14} className="text-accent" />{doc.filename}</span> : fact?.sourceLabel} />
          <EvidenceRow label="Relevant extracted passage" value={docPassage ? <blockquote className="border-l-2 border-accent/60 pl-3 italic text-ink-muted">{docPassage}</blockquote> : undefined} />

          {!hasEvidence && (
            <InlineNotice tone="warning" title="No approved evidence">
              No approved evidence was found to verify this claim. That is not proof the claim is false — the status
              stays NEEDS REVIEW until a human adds a source or removes the claim.
            </InlineNotice>
          )}

          <EvidenceRow label="Why this status" value={finding.explanation} />
          <EvidenceRow
            label="Suggested next action"
            tone="text-accent-cyan"
            value={finding.suggestedAction ?? (finding.suggestedCorrection ? `Apply: “${finding.suggestedCorrection}”` : undefined)}
          />

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Confidence</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-cyan" style={{ width: `${Math.round(finding.confidence * 100)}%` }} />
              </div>
              <span className="text-sm font-semibold text-ink">{Math.round(finding.confidence * 100)}%</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
              Confidence describes matcher strength, not a guarantee of correctness. Humans make the final decision.
            </p>
          </div>

          {finding.suggestedCorrection && (
            <div className="rounded-xl border border-ok/30 bg-ok/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ok">Suggested correction</p>
              <p className="mt-1.5 text-sm text-ink">{finding.suggestedCorrection}</p>
            </div>
          )}

          {finding.resolutionNote && <InlineNotice tone="success" title="Resolution recorded">{finding.resolutionNote}</InlineNotice>}
          {finding.falsePositiveReason && (
            <InlineNotice tone="info" title="False positive reason">{finding.falsePositiveReason}</InlineNotice>
          )}

          {/* comments */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              <MessageSquare size={12} /> Reviewer comments ({finding.comments.length})
            </p>
            <ul className="mt-2 space-y-2">
              {finding.comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-semibold text-ink">{c.authorName}</span>{" "}
                  <span className="text-[11px] text-ink-muted">{formatDateTime(c.at)}</span>
                  <p className="text-ink-muted">{c.body}</p>
                </li>
              ))}
              {finding.comments.length === 0 && <li className="text-xs text-ink-muted">No comments yet.</li>}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                className="input !py-2 text-sm"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a reviewer comment…"
                aria-label="Add a reviewer comment"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && comment.trim()) {
                    addFindingComment(audit.id, finding.id, comment.trim());
                    setComment("");
                    toast({ tone: "success", title: "Comment added" });
                  }
                }}
              />
              <button
                className="btn-secondary !px-3"
                onClick={() => {
                  if (!comment.trim()) return;
                  addFindingComment(audit.id, finding.id, comment.trim());
                  setComment("");
                  toast({ tone: "success", title: "Comment added" });
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* assignment */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              <UserCheck size={12} /> Assigned reviewer
            </p>
            <select
              className="input mt-2"
              value={finding.assigneeId ?? ""}
              onChange={(e) => set({ assigneeId: e.target.value || undefined })}
              aria-label="Assign a reviewer"
            >
              <option value="">Unassigned</option>
              {state.memberships
                .filter((m) => m.workspaceId === audit.workspaceId)
                .map((m) => {
                  const u = state.users.find((x) => x.id === m.userId);
                  return u ? <option key={u.id} value={u.id}>{u.name} — {m.role}</option> : null;
                })}
            </select>
            {assignee && <p className="mt-1 text-xs text-ink-muted">Currently assigned to {assignee.name}</p>}
          </div>
        </div>

        <footer className="border-t border-white/[0.07] px-5 py-4">
          {!editable ? (
            <InlineNotice tone="warning">{denyReason("run_audit")}</InlineNotice>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button className="btn-primary !py-2 !text-xs" onClick={accept} disabled={!finding.suggestedCorrection}>
                  <Check size={14} /> Accept
                </button>
                <button className="btn-secondary !py-2 !text-xs" onClick={() => { setEditText(finding.suggestedCorrection ?? ""); setEditOpen(true); }} disabled={!finding.suggestedCorrection}>
                  Edit
                </button>
                <button className="btn-secondary !py-2 !text-xs" onClick={reject} disabled={!finding.suggestedCorrection}>
                  <X size={14} /> Reject
                </button>
                <button
                  className="btn-secondary !py-2 !text-xs"
                  onClick={() => {
                    set({ reviewStatus: "reviewed" });
                    toast({ tone: "info", title: "Marked as reviewed" });
                  }}
                >
                  <Check size={14} /> Mark reviewed
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  className="btn-ghost !text-xs"
                  onClick={() => {
                    if (finding.reviewStatus === "resolved") {
                      set({ reviewStatus: "open", resolutionNote: undefined });
                      toast({ tone: "info", title: "Finding reopened" });
                    } else {
                      set({ reviewStatus: "resolved", resolutionNote: `Marked resolved by ${user?.name ?? "user"}` });
                      toast({ tone: "success", title: "Finding resolved" });
                    }
                  }}
                >
                  {finding.reviewStatus === "resolved" ? "Reopen finding" : "Mark as resolved"}
                </button>
                <button className="btn-ghost !text-xs hover:text-warn" onClick={() => setFpOpen(true)}>
                  <ShieldAlert size={14} /> Mark false positive
                </button>
              </div>
            </div>
          )}
        </footer>
      </aside>

      {/* edit suggestion */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit suggested correction">
        <textarea className="input min-h-28" value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edited correction" />
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveEdit}><Check size={15} /> Save edit</button>
        </div>
      </Modal>

      {/* false positive */}
      <Modal open={fpOpen} onClose={() => setFpOpen(false)} title="Mark as false positive" description="A reason is required — it is stored with the finding for audit history.">
        <textarea
          className="input min-h-24"
          value={fpReason}
          onChange={(e) => setFpReason(e.target.value)}
          placeholder="Explain why this finding does not apply…"
          aria-label="False positive reason"
        />
        {fpReason.trim().length > 0 && fpReason.trim().length < 8 && (
          <p className="mt-1 text-xs text-bad">Please give a little more detail (at least 8 characters).</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setFpOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={markFalsePositive} disabled={fpReason.trim().length < 8}>
            <Check size={15} /> Record false positive
          </button>
        </div>
      </Modal>
    </div>
  );
}
