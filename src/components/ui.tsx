import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertOctagon, AlertTriangle, Check, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn, uid } from "../lib/utils";
import type { Severity, VerificationStatus } from "../lib/types";

/* ------------------------------- Toasts --------------------------- */

export type ToastTone = "success" | "error" | "info" | "warning";
export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);
const ConfirmCtx = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = uid("toast");
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  );

  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto w-full max-w-md animate-slideIn rounded-xl border px-4 py-3 shadow-card backdrop-blur-xl",
                t.tone === "success" && "border-ok/30 bg-[#0f2418]/95",
                t.tone === "error" && "border-bad/30 bg-[#2a1215]/95",
                t.tone === "warning" && "border-warn/30 static-bg bg-[#2a2110]/95",
                t.tone === "info" && "border-info/30 bg-[#101c33]/95",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5">
                  {t.tone === "success" && <CheckCircle2 size={17} className="text-ok" />}
                  {t.tone === "error" && <XCircle size={17} className="text-bad" />}
                  {t.tone === "warning" && <AlertTriangle size={17} className="text-warn" />}
                  {t.tone === "info" && <Info size={17} className="text-info" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{t.description}</p>}
                </div>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {confirmState && (
          <Modal open onClose={() => closeConfirm(false)} title={confirmState.title}>
            <div className="text-sm leading-relaxed text-ink-muted">{confirmState.body}</div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel ?? "Cancel"}
              </button>
              <button
                className={confirmState.tone === "danger" ? "btn-danger" : "btn-primary"}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </Modal>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within AppProviders");
  return ctx.push;
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within AppProviders");
  return ctx;
}

/* ------------------------------- Modal ---------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "glass w-full animate-fadeUp rounded-t-2xl p-5 outline-none sm:rounded-2xl sm:p-6",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="btn-ghost -mr-2 -mt-1 !px-2">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------- Tabs ----------------------------- */

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export function Tabs({
  items,
  active,
  onChange,
  ariaLabel,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.04] p-1 scrollbar-thin">
      {items.map((it) => (
        <button
          key={it.key}
          role="tab"
          aria-selected={active === it.key}
          onClick={() => onChange(it.key)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
            active === it.key ? "bg-accent text-white shadow-[0_8px_24px_-12px_rgba(99,102,241,1)] " : "text-ink-muted hover:text-ink",
          )}
        >
          {it.icon}
          {it.label}
          {typeof it.badge === "number" && it.badge > 0 && (
            <span className={cn("rounded-full px-1.5 text-[10px] font-bold", active === it.key ? "bg-white/25" : "bg-white/10")}>
              {it.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- Badges --------------------------- */

const VERIF: Record<VerificationStatus, { cls: string; icon: React.ReactNode; label: string }> = {
  SUPPORTED: { cls: "border-ok/35 bg-ok/10 text-ok", icon: <CheckCircle2 size={12} />, label: "Supported" },
  NEEDS_REVIEW: { cls: "border-warn/35 bg-warn/10 text-warn", icon: <AlertTriangle size={12} />, label: "Needs review" },
  CONTRADICTED: { cls: "border-bad/35 bg-bad/10 text-bad", icon: <XCircle size={12} />, label: "Contradicted" },
};

export function VerificationBadge({ status, compact }: { status: VerificationStatus; compact?: boolean }) {
  const v = VERIF[status];
  return (
    <span className={cn("chip whitespace-nowrap", v.cls)} title={status}>
      {v.icon}
      {compact ? status : v.label}
    </span>
  );
}

const SEV: Record<Severity, { cls: string; dot: string; label: string; icon: React.ReactNode }> = {
  critical: { cls: "border-bad/40 bg-bad/10 text-bad", dot: "bg-bad", label: "Critical", icon: <AlertOctagon size={12} /> },
  high: { cls: "border-[#f87171]/35 bg-[#f87171]/10 text-[#f87171]", dot: "bg-[#f87171]", label: "High", icon: <AlertTriangle size={12} /> },
  medium: { cls: "border-warn/35 bg-warn/10 text-warn", dot: "bg-warn", label: "Medium", icon: <AlertTriangle size={12} /> },
  low: { cls: "border-info/35 bg-info/10 text-info", dot: "bg-info", label: "Low", icon: <Info size={12} /> },
  informational: { cls: "border-white/15 bg-white/5 text-ink-muted", dot: "bg-ink-muted", label: "Info", icon: <Info size={12} /> },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEV[severity];
  return (
    <span className={cn("chip whitespace-nowrap", s.cls)}>
      {s.icon}
      {s.label}
    </span>
  );
}

const AUDIT_STATUS: Record<string, { cls: string; label: string }> = {
  draft: { cls: "border-white/15 bg-white/5 text-ink-muted", label: "Draft" },
  in_progress: { cls: "border-info/35 bg-info/10 text-info", label: "In progress" },
  needs_review: { cls: "border-warn/35 bg-warn/10 text-warn", label: "Needs review" },
  approved: { cls: "border-ok/35 bg-ok/10 text-ok", label: "Approved" },
  rejected: { cls: "border-bad/35 bg-bad/10 text-bad", label: "Rejected" },
  pending_review: { cls: "border-warn/35 bg-warn/10 text-warn", label: "Pending review" },
  changes_requested: { cls: "border-warn/35 bg-warn/10 text-warn", label: "Changes requested" },
  audit_completed: { cls: "border-info/35 bg-info/10 text-info", label: "Audit completed" },
  archived: { cls: "border-white/15 bg-white/5 text-ink-muted", label: "Archived" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = AUDIT_STATUS[status] ?? { cls: "border-white/15 bg-white/5 text-ink-muted", label: status };
  return <span className={cn("chip whitespace-nowrap", s.cls)}>{s.label}</span>;
}

/* ------------------------------- Bits ----------------------------- */

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn("animate-spin", className)} />;
}

export function Progress({ value, label, tone = "accent" }: { value: number; label?: string; tone?: "accent" | "ok" | "warn" }) {
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-muted">
          <span>{label}</span>
          <span className="font-semibold text-ink">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-gradient-to-r from-accent to-accent-cyan")}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function Card({ children, className, as: As = "div" }: { children: React.ReactNode; className?: string; as?: any }) {
  return <As className={cn("surface p-5", className)}>{children}</As>;
}

export function SectionHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon ?? <Info size={22} />}
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && <span className="ml-1 text-bad">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        ?
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-card-elevated px-3 py-2 text-left text-xs font-normal leading-relaxed text-ink-muted shadow-card"
        >
          {label}
        </span>
      )}
      <span className="ml-1.5">{children}</span>
    </span>
  );
}

export function SampleBadge({ note = "Sample data" }: { note?: string }) {
  return (
    <span className="chip border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan" title="Fictional demonstration data">
      <Info size={11} />
      {note}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
        checked ? "border-accent/60 bg-accent" : "border-white/15 bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all",
          checked ? "left-[22px]" : "left-0.5",
        )}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

export function InlineNotice({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tone === "info" && "border-info/30 bg-info/10 text-info",
        tone === "warning" && "border-warn/30 bg-warn/10 text-warn",
        tone === "danger" && "border-bad/30 bg-bad/10 text-bad",
        tone === "success" && "border-ok/30 bg-ok/10 text-ok",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {tone === "success" ? <Check size={15} /> : tone === "danger" ? <XCircle size={15} /> : tone === "warning" ? <AlertTriangle size={15} /> : <Info size={15} />}
      </span>
      <div className="text-ink-muted [&_b]:font-semibold [&_b]:text-ink">
        {title && <p className="mb-0.5 font-semibold text-ink">{title}</p>}
        {children}
      </div>
    </div>
  );
}
