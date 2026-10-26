import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, FlaskConical, Lock, Mail, ShieldCheck, User2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../lib/store";
import { Field, InlineNotice, useToast } from "../components/ui";
import { cn } from "../lib/utils";

type Mode = "signin" | "signup" | "forgot";

export default function Auth() {
  const { signIn, signUp, requestPasswordReset, state } = useApp();
  const [params] = useSearchParams();
  const initial: Mode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const demoRequested = params.get("demo") === "1";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "forgot") {
      if (!email.trim()) return setError("Enter the email address for your account.");
      setBusy(true);
      const res = requestPasswordReset(email.trim());
      setBusy(false);
      setNotice(res.message);
      return;
    }

    if (!email.trim()) return setError("Enter your email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setBusy(true);
    const res = mode === "signin" ? signIn(email) : signUp(name.trim() || "New User", email);
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    toast({
      tone: "success",
      title: mode === "signin" ? "Signed in" : "Workspace created",
      description: "This session is stored in this browser only — demo mode.",
    });
    navigate(mode === "signup" ? "/onboarding" : "/app");
  };

  const enterSample = () => {
    const res = signIn("demo@veribrand.local");
    if (res.ok) {
      toast({ tone: "info", title: "Sample workspace opened", description: "All data below is fictional demonstration data." });
      navigate("/app");
    } else {
      setError(res.error ?? "Could not open the sample workspace.");
    }
  };

  return (
    <div className="grid min-h-screen bg-base lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden border-r border-white/[0.06] p-10 lg:flex lg:flex-col">
        <div className="grid-bg absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-accent/25 blur-[130px]" aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="18" fill="#111827" />
            <path d="M32 14l15 6.6V32c0 10-6.5 17.7-15 20-8.5-2.3-15-10-15-20V20.6L32 14z" fill="none" stroke="#6366F1" strokeWidth="4" strokeLinejoin="round" />
            <path d="M24.5 32.5l5.5 5.5 10.5-11.5" fill="none" stroke="#22D3EE" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-bold text-ink">VeriBrand <span className="text-accent">AI</span></span>
        </Link>

        <div className="relative mt-auto max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Your Brand. <span className="text-gradient">Verified Before It Goes Live.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Define your approved facts and rules once, then verify every campaign, email and product page against them —
            with the evidence attached to every finding.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Evidence-linked findings with source passages",
              "SUPPORTED / NEEDS REVIEW / CONTRADICTED, never blurred",
              "Rewrites you accept one edit at a time",
              "Human approvals with recorded decisions",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-ink-muted">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-auto pt-8 text-xs text-ink-muted">
          AI assists. Humans decide. Uncertainty is labelled, never hidden.
        </p>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink lg:hidden">
            <ArrowLeft size={15} /> Back to home
          </Link>

          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Sign in to VeriBrand AI" : mode === "signup" ? "Create your workspace" : "Reset your password"}
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            {mode === "signin"
              ? "Continue verifying content against your approved brand references."
              : mode === "signup"
                ? "Set up a workspace, define your brand, and run your first audit."
                : "We'll explain how access recovery works in this deployment."}
          </p>

          <div className="mt-5">
            <InlineNotice tone="warning" title="Demo mode — no server-side authentication configured">
              Accounts and data are stored <b>in this browser only</b> (localStorage). Sign-in is not a secure
              authentication system. For production, configure the FastAPI backend and set <code>VITE_API_BASE_URL</code>.
            </InlineNotice>
          </div>

          {demoRequested && mode === "signin" && (
            <div className="mt-4">
              <InlineNotice tone="info" title="Looking for the demo?">
                Open the fictional <b>Nova Bottle</b> sample workspace to explore audits, evidence and approvals without
                setting anything up.
              </InlineNotice>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Full name" htmlFor="name">
                <div className="relative">
                  <User2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input id="name" className="input pl-9" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" />
                </div>
              </Field>
            )}

            <Field label="Email address" htmlFor="email" required>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  id="email"
                  type="email"
                  className="input pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>
            </Field>

            {mode !== "forgot" && (
              <Field label="Password" htmlFor="password" required hint={mode === "signup" ? "Minimum 6 characters. Stored in this browser only — do not use a real password." : undefined}>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className="input pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            {notice && <InlineNotice tone="info">{notice}</InlineNotice>}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? "Working…" : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Workspace" : "Send reset instructions"}
              {mode !== "forgot" && <ArrowRight size={15} />}
            </button>
          </form>

          <button onClick={enterSample} className="btn-secondary mt-3 w-full py-3">
            <FlaskConical size={16} className="text-accent-cyan" />
            Open the Nova Bottle sample workspace
          </button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
            {mode !== "forgot" ? (
              <>
                <button
                  className="text-ink-muted hover:text-ink"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                  }}
                >
                  {mode === "signin" ? "New here? Create a workspace" : "Already have a workspace? Sign in"}
                </button>
                <button className="text-ink-muted hover:text-ink" onClick={() => { setMode("forgot"); setError(null); }}>
                  Forgot password?
                </button>
              </>
            ) : (
              <button className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink" onClick={() => { setMode("signin"); setError(null); }}>
                <ArrowLeft size={14} /> Back to sign in
              </button>
            )}
          </div>

          <p className={cn("mt-6 text-[11px] leading-relaxed text-ink-muted")}>
            {state.workspaces.length} workspace(s) exist in this browser. By continuing you acknowledge that demo-mode
            records never leave this device unless a backend is configured.
          </p>
        </div>
      </div>
    </div>
  );
}
