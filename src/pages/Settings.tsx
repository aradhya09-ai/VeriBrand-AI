import { useState } from "react";
import { AlertTriangle, Check, Database, RotateCcw, Shield, UserCog, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Field, InlineNotice, SampleBadge, SectionHeader, Tabs, Toggle, useConfirm, useToast } from "../components/ui";
import { apiEnabled, useApp } from "../lib/store";
import type { Role } from "../lib/types";
import { cn, formatDateTime } from "../lib/utils";

const ROLE_MATRIX: { action: string; roles: Role[] }[] = [
  { action: "Manage workspace & users", roles: ["ADMIN"] },
  { action: "Configure brand rules, facts & guidelines", roles: ["ADMIN"] },
  { action: "Create content, run audits, generate revisions", roles: ["ADMIN", "EDITOR"] },
  { action: "Submit content for approval", roles: ["ADMIN", "EDITOR"] },
  { action: "Record approval decisions", roles: ["ADMIN", "REVIEWER"] },
  { action: "Read permitted records & reports", roles: ["ADMIN", "EDITOR", "REVIEWER", "VIEWER"] },
];

export default function Settings() {
  const { state, user, workspace, role, can, denyReason, update, setRoleOverride, switchWorkspace, setChecklistConfig, resetDemoData, signOut } = useApp();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const tab = params.get("tab") ?? "profile";
  const [name, setName] = useState(user?.name ?? "");
  const [wsName, setWsName] = useState(workspace?.name ?? "");
  const [newChecklist, setNewChecklist] = useState(state.checklistConfig);

  const members = state.memberships.filter((m) => m.workspaceId === workspace?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SectionHeader
        title="Settings"
        description="Profile, workspace, roles, checklist requirements and demo-mode data controls."
        actions={workspace?.isSample && <SampleBadge note="Sample workspace" />}
      />

      <Tabs
        ariaLabel="Settings sections"
        active={tab}
        onChange={(k) => setParams({ tab: k })}
        items={[
          { key: "profile", label: "Profile" },
          { key: "workspace", label: "Workspace" },
          { key: "roles", label: "Roles & permissions" },
          { key: "checklist", label: "Checklist" },
          { key: "data", label: "Data & demo mode" },
        ]}
      />

      {/* profile */}
      {tab === "profile" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="surface p-5">
            <h2 className="text-base font-semibold text-ink">Your profile</h2>
            <div className="mt-4 space-y-4">
              <Field label="Display name">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email" hint="Demo mode: stored locally in this browser.">
                <input className="input" value={user?.email ?? ""} disabled />
              </Field>
              <Field label="Current role" hint="Roles are assigned per workspace by an administrator.">
                <input className="input" value={role} disabled />
              </Field>
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!name.trim()) return toast({ tone: "error", title: "Name cannot be empty" });
                    update((s) => ({ ...s, users: s.users.map((u) => (u.id === user?.id ? { ...u, name: name.trim() } : u)) }));
                    toast({ tone: "success", title: "Profile updated" });
                  }}
                >
                  <Check size={15} /> Save profile
                </button>
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><UserCog size={16} className="text-accent" /> Preview another role</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              A demonstration aid: switch the role this browser session acts as, to see how the interface restricts
              actions. In a configured deployment, authorisation is enforced on the server — hiding buttons is never the
              only control.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["ADMIN", "EDITOR", "REVIEWER", "VIEWER"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoleOverride(r === "ADMIN" ? null : r);
                    toast({ tone: "info", title: `Acting as ${r}`, description: r === "ADMIN" ? "Back to your assigned role." : denyReason("decide_review") === "" ? "" : "Permissions updated." });
                  }}
                  className={cn("chip", (state.roleOverride ?? "ADMIN") === r ? "border-accent/50 bg-accent/15 text-accent" : "border-white/15 bg-white/5 text-ink-muted hover:text-ink")}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <p className="text-xs text-ink-muted">Session</p>
              <p className="text-sm text-ink">Signed in {formatDateTime(state.session?.signedInAt)} · mode: demo (browser-local)</p>
            </div>
          </div>
        </div>
      )}

      {/* workspace */}
      {tab === "workspace" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="surface p-5">
            <h2 className="text-base font-semibold text-ink">Workspace details</h2>
            <div className="mt-4 space-y-4">
              <Field label="Workspace name">
                <input className="input" value={wsName} onChange={(e) => setWsName(e.target.value)} disabled={!can("manage_workspace")} />
              </Field>
              <Field label="Industry">
                <input className="input" defaultValue={workspace?.industry} disabled={!can("manage_workspace")} onChange={(e) => update((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === workspace?.id ? { ...w, industry: e.target.value } : w)) }))} />
              </Field>
              <Field label="Website">
                <input className="input" defaultValue={workspace?.website} disabled={!can("manage_workspace")} onChange={(e) => update((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === workspace?.id ? { ...w, website: e.target.value } : w)) }))} />
              </Field>
              <Field label="Default language">
                <input className="input" defaultValue={workspace?.language} disabled={!can("manage_workspace")} onChange={(e) => update((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === workspace?.id ? { ...w, language: e.target.value } : w)) }))} />
              </Field>
              {!can("manage_workspace") && <InlineNotice tone="warning">{denyReason("manage_workspace")}</InlineNotice>}
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  disabled={!can("manage_workspace")}
                  onClick={() => {
                    if (!wsName.trim()) return toast({ tone: "error", title: "Workspace name is required" });
                    update((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === workspace?.id ? { ...w, name: wsName.trim() } : w)) }));
                    toast({ tone: "success", title: "Workspace updated" });
                  }}
                >
                  <Check size={15} /> Save workspace
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Users size={16} className="text-accent" /> Members</h2>
              <ul className="mt-3 space-y-2">
                {members.map((m) => {
                  const u = state.users.find((x) => x.id === m.userId);
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{u?.name ?? "Unknown user"}</p>
                        <p className="truncate text-[11px] text-ink-muted">{u?.email}</p>
                      </div>
                      <select
                        className="input w-auto !py-1.5 !text-xs"
                        value={m.role}
                        disabled={!can("manage_workspace")}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            memberships: s.memberships.map((x) => (x.id === m.id ? { ...x, role: e.target.value as Role } : x)),
                          }))
                        }
                        aria-label={`Role for ${u?.name ?? "member"}`}
                      >
                        {(["ADMIN", "EDITOR", "REVIEWER", "VIEWER"] as Role[]).map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="surface p-5">
              <h2 className="text-base font-semibold text-ink">All workspaces in this browser</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => { switchWorkspace(w.id); toast({ tone: "info", title: "Workspace switched", description: w.name }); }}
                    className={cn("chip", workspace?.id === w.id ? "border-accent/50 bg-accent/15 text-accent" : "border-white/15 bg-white/5 text-ink-muted")}
                  >
                    {w.name} {w.isSample && "· sample"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* roles */}
      {tab === "roles" && (
        <div className="space-y-4">
          <InlineNotice tone="info" title="Enforcement model">
            This build enforces permissions in the client for demonstration. A configured backend enforces the same
            matrix on every request — frontend restrictions are never the only control.
          </InlineNotice>
          <div className="surface overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-3 py-3 text-center font-semibold">Admin</th>
                  <th className="px-3 py-3 text-center font-semibold">Editor</th>
                  <th className="px-3 py-3 text-center font-semibold">Reviewer</th>
                  <th className="px-3 py-3 text-center font-semibold">Viewer</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_MATRIX.map((r) => (
                  <tr key={r.action} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-5 py-3 text-ink">{r.action}</td>
                    {(["ADMIN", "EDITOR", "REVIEWER", "VIEWER"] as Role[]).map((roleKey) => (
                      <td key={roleKey} className="px-3 py-3 text-center">
                        {r.roles.includes(roleKey) ? <Check size={15} className="mx-auto text-ok" /> : <span className="text-ink-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Shield size={15} className="text-accent" /> Your effective permissions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["manage_workspace", "edit_brand", "run_audit", "edit_content", "submit_review", "decide_review", "configure_checklist"] as const).map((p) => (
                <span key={p} className={cn("chip", can(p) ? "border-ok/35 bg-ok/10 text-ok" : "border-white/15 bg-white/5 text-ink-muted")}>
                  {can(p) ? "✓" : "✗"} {p.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* checklist */}
      {tab === "checklist" && (
        <div className="space-y-4">
          <InlineNotice tone="warning" title="Administrator only">
            {can("configure_checklist") ? "Toggle which pre-flight items are mandatory before approval." : denyReason("configure_checklist")}
          </InlineNotice>
          <div className="space-y-3">
            {newChecklist.map((item, i) => (
              <div key={item.key} className="surface flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-[11px] text-ink-muted">{item.key}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-muted">{item.required ? "Mandatory" : "Optional"}</span>
                  <Toggle
                    checked={item.required}
                    label={`Mandatory: ${item.label}`}
                    onChange={(v) => setNewChecklist(newChecklist.map((x, j) => (j === i ? { ...x, required: v } : x)))}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              className="btn-primary"
              disabled={!can("configure_checklist")}
              onClick={() => { setChecklistConfig(newChecklist); toast({ tone: "success", title: "Checklist requirements saved" }); }}
            >
              <Check size={15} /> Save requirements
            </button>
          </div>
        </div>
      )}

      {/* data */}
      {tab === "data" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Database size={16} className="text-accent" /> Storage</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Persistence", "Browser localStorage (veribrand.state.v1)"],
                ["Backend", apiEnabled ? "Configured via VITE_API_BASE_URL" : "Not configured"],
                ["Audits stored", `${state.audits.length}`],
                ["Rules / facts", `${state.rules.length} / ${state.facts.length}`],
                ["Documents", `${state.documents.length}`],
                ["Notifications", `${state.notifications.length}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-white/[0.05] pb-2 last:border-0">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              No API keys are stored in the frontend. Clearing this browser&apos;s site data removes all records.
            </p>
          </div>

          <div className="space-y-5">
            <div className="surface p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><AlertTriangle size={16} className="text-warn" /> Demo mode</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                The Nova Bottle workspace, its brand, audits and activity are fictional sample data used for
                demonstration. Resetting restores the original sample state — your own workspace is kept.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-danger"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Reset sample workspace?",
                      body: "All local records are replaced with the original fictional Nova Bottle demonstration data.",
                      confirmLabel: "Reset data",
                      tone: "danger",
                    });
                    if (!ok) return;
                    resetDemoData();
                    toast({ tone: "success", title: "Sample data restored" });
                  }}
                >
                  <RotateCcw size={15} /> Reset sample data
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    signOut();
                    toast({ tone: "info", title: "Signed out", description: "Session cleared from this browser." });
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>

            <InlineNotice tone="warning" title="Authentication in demo mode">
              Accounts are stored in this browser only and are not a secure authentication system. Configure the
              FastAPI backend and set <code>VITE_API_BASE_URL</code> for server-side auth, sessions and permissions.
            </InlineNotice>
          </div>
        </div>
      )}
    </div>
  );
}
