import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSeedState } from "./demoData";
import type {
  ActivityEvent,
  AnalysisMode,
  AppNotification,
  AppState,
  Approval,
  ApprovalStatus,
  Audit,
  Brand,
  BrandAsset,
  BrandDocument,
  BrandRule,
  Campaign,
  Disclaimer,
  ApprovedFact,
  ChecklistItem,
  Finding,
  Role,
  Rewrite,
  Session,
  User,
  Workspace,
} from "./types";
import { nowISO, uid } from "./utils";

const KEY = "veribrand.state.v1";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
export const apiEnabled = API_BASE.trim().length > 0;

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.audits)) return parsed;
    }
  } catch {
    /* corrupted storage — fall through to a fresh seed */
  }
  return createSeedState();
}

type Permission =
  | "manage_workspace"
  | "edit_brand"
  | "run_audit"
  | "edit_content"
  | "submit_review"
  | "decide_review"
  | "configure_checklist";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["manage_workspace", "edit_brand", "run_audit", "edit_content", "submit_review", "decide_review", "configure_checklist"],
  EDITOR: ["run_audit", "edit_content", "submit_review"],
  REVIEWER: ["run_audit", "decide_review"],
  VIEWER: [],
};

export interface StoreValue {
  state: AppState;
  user: User | null;
  workspace: Workspace | null;
  brand: Brand | null;
  role: Role;
  isSampleWorkspace: boolean;
  update: (fn: (s: AppState) => AppState) => void;
  can: (p: Permission) => boolean;
  denyReason: (p: Permission) => string;
  // session
  signIn: (email: string, name?: string) => { ok: boolean; error?: string };
  signUp: (name: string, email: string) => { ok: boolean; error?: string };
  signOut: () => void;
  requestPasswordReset: (email: string) => { ok: boolean; message: string };
  switchWorkspace: (id: string) => void;
  setRoleOverride: (r: Role | null) => void;
  // onboarding
  createWorkspace: (input: Partial<Workspace>) => string;
  createBrand: (input: Partial<Brand>) => string;
  finishOnboarding: () => void;
  // brand studio
  saveRule: (rule: Partial<BrandRule> & { brandId: string }) => void;
  deleteRule: (id: string) => void;
  setRuleStatus: (id: string, status: BrandRule["status"]) => void;
  saveFact: (fact: Partial<ApprovedFact> & { brandId: string }) => void;
  deleteFact: (id: string) => void;
  saveDocument: (doc: Partial<BrandDocument> & { brandId: string; filename: string }) => void;
  deleteDocument: (id: string) => void;
  saveAsset: (asset: Partial<BrandAsset> & { brandId: string }) => void;
  deleteAsset: (id: string) => void;
  saveDisclaimer: (d: Partial<Disclaimer> & { brandId: string }) => void;
  deleteDisclaimer: (id: string) => void;
  updateBrand: (id: string, patch: Partial<Brand>) => void;
  // audits
  createAudit: (audit: Audit) => void;
  updateAudit: (id: string, patch: Partial<Audit>) => void;
  updateFinding: (auditId: string, findingId: string, patch: Partial<Finding>) => void;
  addFindingComment: (auditId: string, findingId: string, body: string) => void;
  deleteAudit: (id: string) => void;
  saveRewrite: (rewrite: Rewrite) => void;
  // approvals
  submitForReview: (auditId: string, reviewerId?: string) => string;
  addApprovalComment: (approvalId: string, body: string) => void;
  decide: (
    approvalId: string,
    decision: "approve" | "reject" | "request_changes",
    opts: { comment?: string; overrideReason?: string },
  ) => { ok: boolean; error?: string };
  updateChecklist: (approvalId: string, items: ChecklistItem[]) => void;
  // campaigns
  saveCampaign: (campaign: Partial<Campaign> & { workspaceId: string; brandId: string }) => void;
  // notifications / activity
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  logActivity: (e: Omit<ActivityEvent, "id" | "at" | "workspaceId" | "userId" | "userName">) => void;
  notify: (n: Omit<AppNotification, "id" | "at" | "workspaceId" | "read">) => void;
  saveVisual: (v: AppState["visuals"][number]) => void;
  setVisualReview: (id: string, status: "pending" | "reviewed") => void;
  setChecklistConfig: (items: { key: string; label: string; required: boolean }[]) => void;
  resetDemoData: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded — keep running in memory */
    }
  }, [state]);

  const user = useMemo(
    () => state.users.find((u) => u.id === state.session?.userId) ?? null,
    [state.users, state.session],
  );
  const workspace = useMemo(
    () => state.workspaces.find((w) => w.id === state.session?.workspaceId) ?? null,
    [state.workspaces, state.session],
  );
  const brand = useMemo(
    () => state.brands.find((b) => b.workspaceId === workspace?.id) ?? null,
    [state.brands, workspace],
  );

  const membership = useMemo(() => {
    if (!state.session) return null;
    return (
      state.memberships.find(
        (m) => m.workspaceId === state.session!.workspaceId && m.userId === state.session!.userId,
      ) ?? null
    );
  }, [state.memberships, state.session]);

  const role: Role = state.roleOverride ?? membership?.role ?? "ADMIN";

  const can = useCallback(
    (p: Permission) => ROLE_PERMISSIONS[role].includes(p),
    [role],
  );

  const denyReason = useCallback(
    (p: Permission) => {
      const map: Record<Permission, string> = {
        manage_workspace: "Only administrators can manage workspace settings.",
        edit_brand: "Only administrators can change brand rules, facts and guidelines.",
        run_audit: "Your role does not permit running audits.",
        edit_content: "Your role does not permit editing content or rewrites.",
        submit_review: "Your role does not permit submitting content for review.",
        decide_review: "Only reviewers and administrators can record approval decisions.",
        configure_checklist: "Only administrators can configure mandatory checklist items.",
      };
      return map[p];
    },
    [],
  );

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const logActivity: StoreValue["logActivity"] = useCallback((e) => {
    setState((s) => ({
      ...s,
      activity: [
        {
          ...e,
          id: uid("act"),
          at: nowISO(),
          workspaceId: s.session?.workspaceId ?? "ws_sample",
          userId: s.session?.userId ?? "u_demo",
          userName: s.users.find((u) => u.id === s.session?.userId)?.name ?? "User",
        },
        ...s.activity,
      ].slice(0, 300),
    }));
  }, []);

  const notify: StoreValue["notify"] = useCallback((n) => {
    setState((s) => ({
      ...s,
      notifications: [
        { ...n, id: uid("ntf"), at: nowISO(), read: false, workspaceId: s.session?.workspaceId ?? "ws_sample" },
        ...s.notifications,
      ],
    }));
  }, []);

  const value: StoreValue = {
    state,
    user,
    workspace,
    brand,
    role,
    isSampleWorkspace: workspace?.isSample === true,
    can,
    denyReason,
    update,

    signIn: (email, name) => {
      const existing = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        const wsId =
          state.memberships.find((m) => m.userId === existing.id)?.workspaceId ?? state.workspaces[0]?.id;
        const session: Session = { userId: existing.id, workspaceId: wsId, mode: "demo", signedInAt: nowISO() };
        update((s) => ({ ...s, session }));
        return { ok: true };
      }
      return { ok: false, error: "No local account found for that email. Use Sign Up to create one in this browser." };
    },

    signUp: (name, email) => {
      if (state.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return { ok: false, error: "An account with that email already exists in this browser." };
      }
      const newUser: User = { id: uid("usr"), name: name.trim(), email: email.trim(), createdAt: nowISO() };
      const ws: Workspace = {
        id: uid("ws"),
        name: `${name.trim().split(" ")[0]}'s Workspace`,
        industry: "",
        website: "",
        language: "English (UK)",
        createdAt: nowISO(),
      };
      update((s) => ({
        ...s,
        users: [...s.users, newUser],
        workspaces: [...s.workspaces, ws],
        memberships: [...s.memberships, { id: uid("mbr"), workspaceId: ws.id, userId: newUser.id, role: "ADMIN" }],
        session: { userId: newUser.id, workspaceId: ws.id, mode: "demo", signedInAt: nowISO() },
        onboarded: false,
        roleOverride: null,
      }));
      return { ok: true };
    },

    signOut: () => update((s) => ({ ...s, session: null, roleOverride: null })),

    requestPasswordReset: (email) => ({
      ok: true,
      message: `No email service is configured in this deployment, so no message was sent. In demo mode you can sign in directly with any email you have already registered in this browser (${email}).`,
    }),

    switchWorkspace: (id) =>
      update((s) => (s.session ? { ...s, session: { ...s.session, workspaceId: id } } : s)),

    setRoleOverride: (r) => update((s) => ({ ...s, roleOverride: r })),

    createWorkspace: (input) => {
      const ws: Workspace = {
        id: uid("ws"),
        name: input.name?.trim() || "My Workspace",
        industry: input.industry ?? "",
        website: input.website ?? "",
        language: input.language ?? "English (UK)",
        createdAt: nowISO(),
      };
      update((s) => ({
        ...s,
        workspaces: [...s.workspaces, ws],
        memberships: [
          ...s.memberships,
          { id: uid("mbr"), workspaceId: ws.id, userId: s.session?.userId ?? "u_demo", role: "ADMIN" },
        ],
        session: s.session ? { ...s.session, workspaceId: ws.id } : s.session,
      }));
      return ws.id;
    },

    createBrand: (input) => {
      const b: Brand = {
        id: uid("br"),
        workspaceId: input.workspaceId ?? state.session?.workspaceId ?? "ws_sample",
        name: input.name ?? "Untitled brand",
        description: input.description ?? "",
        industry: input.industry ?? "",
        audience: input.audience ?? "",
        mission: input.mission ?? "",
        personality: input.personality ?? "",
        writingStyle: input.writingStyle ?? "",
        wordsToUse: input.wordsToUse ?? [],
        wordsAvoid: input.wordsAvoid ?? [],
        language: input.language ?? "English (UK)",
        website: input.website ?? "",
        tone: input.tone ?? {
          formality: 50,
          friendliness: 60,
          conciseness: 60,
          technicality: 40,
          sentenceStyle: "varied",
          preferredTerms: [],
          avoidPhrases: [],
        },
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      update((s) => ({ ...s, brands: [...s.brands, b] }));
      return b.id;
    },

    finishOnboarding: () => update((s) => ({ ...s, onboarded: true })),

    saveRule: (rule) =>
      update((s) => {
        const now = nowISO();
        if (rule.id && s.rules.some((r) => r.id === rule.id)) {
          return {
            ...s,
            rules: s.rules.map((r) => (r.id === rule.id ? { ...r, ...rule, updatedAt: now } as BrandRule : r)),
          };
        }
        const created: BrandRule = {
          id: uid("rule"),
          brandId: rule.brandId,
          title: rule.title ?? "Untitled rule",
          description: rule.description ?? "",
          category: rule.category ?? "Accuracy",
          severity: rule.severity ?? "medium",
          status: rule.status ?? "active",
          contentTypes: rule.contentTypes ?? [],
          sourceRef: rule.sourceRef,
          sourcePassage: rule.sourcePassage,
          explanation: rule.explanation,
          confidence: rule.confidence,
          origin: rule.origin ?? "manual",
          updatedAt: now,
        };
        return { ...s, rules: [created, ...s.rules] };
      }),

    deleteRule: (id) => update((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) })),

    setRuleStatus: (id, status) =>
      update((s) => ({
        ...s,
        rules: s.rules.map((r) => (r.id === id ? { ...r, status, updatedAt: nowISO() } : r)),
      })),

    saveFact: (fact) =>
      update((s) => {
        if (fact.id && s.facts.some((f) => f.id === fact.id)) {
          return { ...s, facts: s.facts.map((f) => (f.id === fact.id ? { ...f, ...fact } as ApprovedFact : f)) };
        }
        const created: ApprovedFact = {
          id: uid("fact"),
          brandId: fact.brandId,
          title: fact.title ?? "Untitled fact",
          value: fact.value ?? "",
          description: fact.description ?? "",
          category: fact.category ?? "Other",
          numericValue: fact.numericValue,
          unit: fact.unit,
          sourceLabel: fact.sourceLabel ?? "No source recorded",
          sourceDocId: fact.sourceDocId,
          sourceUrl: fact.sourceUrl,
          verificationStatus: fact.verificationStatus ?? "unverified",
          lastVerifiedAt: fact.lastVerifiedAt ?? nowISO(),
          expiresAt: fact.expiresAt,
          owner: fact.owner ?? "Unassigned",
        };
        return { ...s, facts: [created, ...s.facts] };
      }),

    deleteFact: (id) => update((s) => ({ ...s, facts: s.facts.filter((f) => f.id !== id) })),

    saveDocument: (doc) =>
      update((s) => {
        if (doc.id && s.documents.some((d) => d.id === doc.id)) {
          return { ...s, documents: s.documents.map((d) => (d.id === doc.id ? { ...d, ...doc } as BrandDocument : d)) };
        }
        const created: BrandDocument = {
          id: uid("doc"),
          brandId: doc.brandId,
          filename: doc.filename,
          kind: doc.kind ?? "txt",
          size: doc.size ?? 0,
          uploadedAt: nowISO(),
          processingStatus: doc.processingStatus ?? "processed",
          extracted: doc.extracted ?? true,
          passages: doc.passages ?? [],
          error: doc.error,
        };
        return { ...s, documents: [created, ...s.documents] };
      }),

    deleteDocument: (id) =>
      update((s) => ({
        ...s,
        documents: s.documents.filter((d) => d.id !== id),
        facts: s.facts.map((f) => (f.sourceDocId === id ? { ...f, sourceDocId: undefined } : f)),
      })),

    saveAsset: (asset) =>
      update((s) => {
        const created: BrandAsset = {
          id: uid("ast"),
          brandId: asset.brandId,
          kind: asset.kind ?? "reference",
          name: asset.name ?? "Asset",
          dataUrl: asset.dataUrl,
          palette: asset.palette,
          note: asset.note,
          uploadedAt: nowISO(),
        };
        return { ...s, assets: [...s.assets, created] };
      }),

    deleteAsset: (id) => update((s) => ({ ...s, assets: s.assets.filter((a) => a.id !== id) })),

    saveDisclaimer: (d) =>
      update((s) => {
        if (d.id && s.disclaimers.some((x) => x.id === d.id)) {
          return { ...s, disclaimers: s.disclaimers.map((x) => (x.id === d.id ? { ...x, ...d } as Disclaimer : x)) };
        }
        const created: Disclaimer = {
          id: uid("dis"),
          brandId: d.brandId,
          text: d.text ?? "",
          when: d.when ?? "",
          appliesTo: d.appliesTo ?? [],
          severity: d.severity ?? "medium",
          mandatory: d.mandatory ?? true,
        };
        return { ...s, disclaimers: [created, ...s.disclaimers] };
      }),

    deleteDisclaimer: (id) => update((s) => ({ ...s, disclaimers: s.disclaimers.filter((d) => d.id !== id) })),

    updateBrand: (id, patch) =>
      update((s) => ({
        ...s,
        brands: s.brands.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: nowISO() } : b)),
      })),

    createAudit: (audit) =>
      update((s) => ({
        ...s,
        audits: [audit, ...s.audits.filter((a) => a.id !== audit.id)],
      })),

    updateAudit: (id, patch) =>
      update((s) => ({
        ...s,
        audits: s.audits.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: nowISO() } : a)),
      })),

    updateFinding: (auditId, findingId, patch) =>
      update((s) => ({
        ...s,
        audits: s.audits.map((a) =>
          a.id === auditId
            ? { ...a, findings: a.findings.map((f) => (f.id === findingId ? { ...f, ...patch } : f)), updatedAt: nowISO() }
            : a,
        ),
      })),

    addFindingComment: (auditId, findingId, body) =>
      update((s) => ({
        ...s,
        audits: s.audits.map((a) =>
          a.id === auditId
            ? {
                ...a,
                findings: a.findings.map((f) =>
                  f.id === findingId
                    ? {
                        ...f,
                        comments: [
                          ...f.comments,
                          {
                            id: uid("cmt"),
                            authorId: s.session?.userId ?? "u_demo",
                            authorName: s.users.find((u) => u.id === s.session?.userId)?.name ?? "User",
                            body,
                            at: nowISO(),
                          },
                        ],
                      }
                    : f,
                ),
              }
            : a,
        ),
      })),

    deleteAudit: (id) =>
      update((s) => ({
        ...s,
        audits: s.audits.filter((a) => a.id !== id),
        approvals: s.approvals.filter((a) => a.auditId !== id),
      })),

    saveRewrite: (rewrite) =>
      update((s) => ({ ...s, rewrites: [rewrite, ...s.rewrites.filter((r) => r.id !== rewrite.id)] })),

    submitForReview: (auditId, reviewerId) => {
      const audit = state.audits.find((a) => a.id === auditId);
      if (!audit) return "";
      const reviewer = state.users.find((u) => u.id === reviewerId) ?? state.users.find((u) => u.id === "u_reviewer");
      const approval: Approval = {
        id: uid("apr"),
        auditId,
        workspaceId: audit.workspaceId,
        status: "pending_review",
        submitterId: state.session?.userId ?? "u_demo",
        submitterName: user?.name ?? "User",
        reviewerId: reviewer?.id,
        reviewerName: reviewer?.name,
        submittedAt: nowISO(),
        updatedAt: nowISO(),
        contentVersion: audit.version,
        comments: [
          {
            id: uid("cmt"),
            authorId: state.session?.userId ?? "u_demo",
            authorName: user?.name ?? "User",
            role,
            body: "Submitted for human review.",
            at: nowISO(),
            kind: "system",
          },
        ],
        decisions: [],
        checklist: [],
        history: [{ at: nowISO(), label: "Submitted for review", by: user?.name ?? "User" }],
      };
      update((s) => ({
        ...s,
        approvals: [approval, ...s.approvals.filter((a) => a.auditId !== auditId && a.status !== "approved")],
        audits: s.audits.map((a) => (a.id === auditId ? { ...a, status: "needs_review", reviewerId: reviewer?.id } : a)),
      }));
      logActivity({
        action: "submitted",
        resourceType: "approval",
        resourceId: approval.id,
        label: `Content submitted for approval — ${audit.title}`,
      });
      notify({
        type: "review_requested",
        title: "Review requested",
        body: `${audit.title} is waiting for a reviewer decision.`,
        link: `/app/approvals/${approval.id}`,
      });
      return approval.id;
    },

    addApprovalComment: (approvalId, body) =>
      update((s) => ({
        ...s,
        approvals: s.approvals.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                updatedAt: nowISO(),
                comments: [
                  ...a.comments,
                  {
                    id: uid("cmt"),
                    authorId: s.session?.userId ?? "u_demo",
                    authorName: s.users.find((u) => u.id === s.session?.userId)?.name ?? "User",
                    role: s.roleOverride ?? "ADMIN",
                    body,
                    at: nowISO(),
                    kind: "comment" as const,
                  },
                ],
              }
            : a,
        ),
      })),

    decide: (approvalId, decision, opts) => {
      if (!can("decide_review")) return { ok: false, error: denyReason("decide_review") };
      const approval = state.approvals.find((a) => a.id === approvalId);
      if (!approval) return { ok: false, error: "Approval record not found." };
      if (decision === "request_changes" && !opts.comment?.trim()) {
        return { ok: false, error: "A comment explaining the requested changes is required." };
      }
      const audit = state.audits.find((a) => a.id === approval.auditId);
      const unresolved = audit?.findings.filter(
        (f) => f.reviewStatus === "open" && (f.severity === "critical" || f.severity === "high"),
      ).length ?? 0;
      if (decision === "approve" && unresolved > 0 && !opts.overrideReason?.trim()) {
        return { ok: false, error: "An override explanation is required to approve with unresolved critical/high findings." };
      }
      const status: ApprovalStatus =
        decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";
      const historyLabel =
        decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Changes requested";
      update((s) => ({
        ...s,
        approvals: s.approvals.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                status,
                updatedAt: nowISO(),
                decisions: [
                  ...a.decisions,
                  {
                    id: uid("dec"),
                    decision,
                    reviewerId: s.session?.userId ?? "u_reviewer",
                    reviewerName: s.users.find((u) => u.id === s.session?.userId)?.name ?? "Reviewer",
                    at: nowISO(),
                    comment: opts.comment,
                    overrideReason: opts.overrideReason,
                    auditVersion: audit?.version ?? 1,
                    unresolvedAtDecision: unresolved,
                  },
                ],
                history: [...a.history, { at: nowISO(), label: historyLabel, by: user?.name ?? "Reviewer" }],
              }
            : a,
        ),
        audits: s.audits.map((a) =>
          a.id === approval.auditId
            ? { ...a, status: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "needs_review" }
            : a,
        ),
      }));
      logActivity({
        action: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested",
        resourceType: "approval",
        resourceId: approvalId,
        label: `${historyLabel} — ${audit?.title ?? "content"}`,
      });
      notify({
        type: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested",
        title: historyLabel,
        body: `${audit?.title ?? "Content"} — ${historyLabel.toLowerCase()} by ${user?.name ?? "Reviewer"}.`,
        link: `/app/approvals/${approvalId}`,
      });
      return { ok: true };
    },

    updateChecklist: (approvalId, items) =>
      update((s) => ({
        ...s,
        approvals: s.approvals.map((a) => (a.id === approvalId ? { ...a, checklist: items, updatedAt: nowISO() } : a)),
      })),

    saveCampaign: (campaign) =>
      update((s) => {
        if (campaign.id && s.campaigns.some((c) => c.id === campaign.id)) {
          return {
            ...s,
            campaigns: s.campaigns.map((c) => (c.id === campaign.id ? { ...c, ...campaign } as Campaign : c)),
          };
        }
        const created: Campaign = {
          id: uid("cmp"),
          workspaceId: campaign.workspaceId,
          brandId: campaign.brandId,
          name: campaign.name ?? "Untitled campaign",
          status: campaign.status ?? "planning",
          approvedMessages: campaign.approvedMessages ?? [],
          auditIds: campaign.auditIds ?? [],
          createdAt: nowISO(),
        };
        return { ...s, campaigns: [created, ...s.campaigns] };
      }),

    markNotificationRead: (id) =>
      update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

    markAllNotificationsRead: () =>
      update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

    logActivity,
    notify,

    saveVisual: (v) => update((s) => ({ ...s, visuals: [v, ...s.visuals.filter((x) => x.id !== v.id)] })),

    setVisualReview: (id, status) =>
      update((s) => ({ ...s, visuals: s.visuals.map((v) => (v.id === id ? { ...v, humanReview: status } : v)) })),

    setChecklistConfig: (items) => update((s) => ({ ...s, checklistConfig: items })),

    resetDemoData: () => {
      const seeded = createSeedState();
      update((s) => ({ ...seeded, session: s.session }));
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside StoreProvider");
  return v;
}

/** Findings helper shared across screens. */
export function unresolvedHigh(findings: Finding[]) {
  return findings.filter((f) => f.reviewStatus === "open" && (f.severity === "critical" || f.severity === "high"));
}
