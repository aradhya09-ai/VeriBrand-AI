import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, GitCompare, Plus, Tags } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, Field, InlineNotice, Modal, SampleBadge, SectionHeader, useToast } from "../components/ui";
import { extractMeasurements } from "../lib/auditEngine";
import { useApp } from "../lib/store";
import { cn, formatDate } from "../lib/utils";
import type { Campaign } from "../lib/types";

interface Conflict {
  kind: string;
  detail: string;
  evidence: string;
  left: string;
  right: string;
}

export default function Campaigns() {
  const { state, workspace, brand, can, denyReason, saveCampaign, isSampleWorkspace } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [messages, setMessages] = useState("");
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);

  const campaigns = state.campaigns.filter((c) => c.workspaceId === workspace?.id || c.workspaceId === "ws_sample");

  const conflictsFor = (c: Campaign): Conflict[] => {
    const audits = state.audits.filter((a) => c.auditIds.includes(a.id) || a.campaignName === c.name);
    const out: Conflict[] = [];

    // numeric conflicts between approved messages and audit content
    const approvedMeasures = extractMeasurements(c.approvedMessages.join(" \n "));
    for (const a of audits) {
      const contentMeasures = extractMeasurements(a.revisedContent ?? a.content);
      for (const am of approvedMeasures) {
        const clash = contentMeasures.find((cm) => cm.unit === am.unit && Math.abs(cm.value - am.value) > 0.01);
        if (clash) {
          out.push({
            kind: "Conflicting specification",
            detail: `${a.title} states “${clash.raw}”, but approved campaign messaging states “${am.raw}”.`,
            evidence: `Approved message: ${c.approvedMessages.find((m) => m.includes(am.raw)) ?? c.approvedMessages.join(" | ")}`,
            left: a.title,
            right: "Approved campaign message",
          });
        }
      }
    }

    // terminology differences across pieces of content
    const termsPerAudit = audits.map((a) => {
      const text = (a.revisedContent ?? a.content).toLowerCase();
      return {
        title: a.title,
        has750: text.includes("750 ml") || text.includes("750ml"),
        hasLitre: /\b1[\s-]?litre\b|\b1l\b/.test(text),
        has48: text.includes("48 hours"),
        has72: text.includes("72 hours"),
      };
    });
    if (termsPerAudit.some((t) => t.has750) && termsPerAudit.some((t) => t.hasLitre)) {
      out.push({
        kind: "Inconsistent product specification",
        detail: "Pieces in this campaign describe the product with both “750 ml” and “1 litre”.",
        evidence: termsPerAudit.filter((t) => t.has750 || t.hasLitre).map((t) => `${t.title}: ${t.has750 ? "750 ml" : "1 litre"}`).join(" | "),
        left: "750 ml copy",
        right: "1 litre copy",
      });
    }
    if (termsPerAudit.some((t) => t.has48) && termsPerAudit.some((t) => t.has72)) {
      out.push({
        kind: "Conflicting performance claim",
        detail: "Pieces in this campaign state different insulation durations.",
        evidence: termsPerAudit.filter((t) => t.has48 || t.has72).map((t) => `${t.title}: ${t.has48 ? "48 hours" : "72 hours"}`).join(" | "),
        left: "48 hours",
        right: "72 hours",
      });
    }

    // missing approved messages
    for (const msg of c.approvedMessages) {
      const key = msg.trim().toLowerCase();
      if (!key) continue;
      const present = audits.some((a) => (a.revisedContent ?? a.content).toLowerCase().includes(key.slice(0, 24)));
      if (audits.length > 0 && !present && key.length > 12) {
        out.push({
          kind: "Possible missing required message",
          detail: `Approved message “${msg}” does not appear in any linked piece of content. Different wording is not automatically a conflict — this is flagged for human judgement.`,
          evidence: `Approved message list of “${c.name}”`,
          left: msg,
          right: "Not found in linked content",
        });
      }
    }

    return out;
  };

  const create = () => {
    if (!name.trim()) return toast({ tone: "error", title: "Campaign name is required" });
    saveCampaign({
      workspaceId: workspace?.id ?? "ws_sample",
      brandId: brand?.id ?? "br_nova",
      name: name.trim(),
      status: "active",
      approvedMessages: messages.split("\n").map((m) => m.trim()).filter(Boolean),
      auditIds: selectedAudits,
    });
    toast({ tone: "success", title: "Campaign created", description: "Consistency checks now run against its linked content." });
    setOpen(false);
    setName("");
    setMessages("");
    setSelectedAudits([]);
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <SectionHeader
        title="Campaign Consistency Checker"
        description="Group content into a campaign and compare it for conflicting specifications, dates, claims, terminology and missing required messages."
        actions={
          <>
            {isSampleWorkspace && <SampleBadge />}
            <button
              className="btn-primary"
              onClick={() => setOpen(true)}
              disabled={!can("edit_brand")}
              title={can("edit_brand") ? "Create a campaign" : denyReason("edit_brand")}
            >
              <Plus size={15} /> New campaign
            </button>
          </>
        }
      />

      <InlineNotice tone="info" title="Different wording is not automatically a conflict">
        The checker only reports differences it can evidence — numeric conflicts, contradictory specifications and
        approved messages that are missing from every linked piece. Everything else is left to human judgement.
      </InlineNotice>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Tags size={20} />}
          title="No campaigns yet"
          body="Create a campaign, link audits to it and define its approved messaging."
        />
      ) : (
        <div className="space-y-5">
          {campaigns.map((c) => {
            const audits = state.audits.filter((a) => c.auditIds.includes(a.id) || a.campaignName === c.name);
            const conflicts = conflictsFor(c);
            return (
              <section key={c.id} className="surface overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">{c.name}</h2>
                      <span className="chip border-white/15 bg-white/5 text-ink-muted">{c.status}</span>
                      {c.isSample && <SampleBadge />}
                    </div>
                    <p className="text-xs text-ink-muted">Created {formatDate(c.createdAt)} · {audits.length} linked piece(s)</p>
                  </div>
                  <span className={cn("chip", conflicts.length ? "border-warn/35 bg-warn/10 text-warn" : "border-ok/35 bg-ok/10 text-ok")}>
                    <GitCompare size={12} /> {conflicts.length ? `${conflicts.length} potential conflict(s)` : "No conflicts detected"}
                  </span>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Approved messaging</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                      {c.approvedMessages.length ? c.approvedMessages.map((m, i) => <li key={i} className="flex gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-ok" />{m}</li>) : <li>No approved messages defined.</li>}
                    </ul>

                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Linked content</p>
                    <ul className="mt-2 space-y-1.5">
                      {audits.map((a) => (
                        <li key={a.id}>
                          <Link to={`/app/audits/${a.id}`} className="flex items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2 text-sm hover:border-accent/40">
                            <span className="min-w-0 flex-1 truncate text-ink">{a.title}</span>
                            <span className="text-[11px] text-ink-muted">{a.contentType}</span>
                            <ArrowRight size={12} className="text-ink-muted" />
                          </Link>
                        </li>
                      ))}
                      {audits.length === 0 && <li className="text-sm text-ink-muted">No audits linked yet — set a campaign name on an audit or create one in New Audit.</li>}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Detected inconsistencies</p>
                    <div className="mt-2 space-y-3">
                      {conflicts.length === 0 && (
                        <div className="rounded-xl border border-ok/25 bg-ok/[0.06] p-3 text-sm text-ink">
                          Nothing conflicts between these pieces based on the available approved references.
                        </div>
                      )}
                      {conflicts.map((cf, i) => (
                        <div key={i} className="rounded-xl border border-warn/30 bg-warn/[0.06] p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="chip border-warn/35 bg-warn/10 text-warn">{cf.kind}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-ink">{cf.detail}</p>
                          <p className="mt-1.5 border-l-2 border-accent/60 pl-2.5 text-[11px] text-ink-muted">Evidence: {cf.evidence}</p>
                          <p className="mt-1 text-[11px] text-ink-muted">Pieces: {cf.left} ↔ {cf.right}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New campaign" size="lg">
        <div className="space-y-4">
          <Field label="Campaign name" required>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Winter Product Launch" />
          </Field>
          <Field label="Approved messaging" hint="One message per line. These are used as the consistency baseline.">
            <textarea className="input min-h-28" value={messages} onChange={(e) => setMessages(e.target.value)} placeholder={"Cold for your whole day.\n750 ml capacity, cold for up to 48 hours."} />
          </Field>
          <Field label="Link existing content" hint="Hold Ctrl/Cmd to select multiple.">
            <select multiple className="input min-h-32" value={selectedAudits} onChange={(e) => setSelectedAudits(Array.from(e.target.selectedOptions).map((o) => o.value))}>
              {state.audits.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4">
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={create}><CheckCircle2 size={15} /> Create campaign</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
