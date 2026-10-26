import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  FileSearch,
  GitBranch,
  Image as ImageIcon,
  Menu,
  PenLine,
  ScanSearch,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

const NAV = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#pricing" },
];

const TRUST = [
  "Evidence-linked content verification",
  "Brand-specific rules",
  "Human-controlled approvals",
  "Transparent uncertainty labels",
];

const STEPS = [
  { n: "01", title: "Define Your Brand", body: "Add approved facts, guidelines, tone, and assets." },
  { n: "02", title: "Submit Your Content", body: "Paste text or upload supported documents." },
  { n: "03", title: "Audit With Evidence", body: "Identify potential violations and verify claims against available references." },
  { n: "04", title: "Improve Your Content", body: "Review AI-generated suggestions and choose which changes to accept." },
  { n: "05", title: "Approve With Confidence", body: "Submit the final content for human review and approval." },
];

const FEATURES = [
  {
    icon: <ScanSearch size={20} />,
    title: "Brand DNA Studio",
    body: "Store the approved rules, facts, tone settings, assets and disclaimers your content is measured against.",
    to: "/app/brand",
  },
  {
    icon: <FileSearch size={20} />,
    title: "Evidence-Linked Auditor",
    body: "Every finding shows the original text, the matched rule and the approved source behind the verdict.",
    to: "/app/audit/new",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "TruthTrace",
    body: "Trace a single claim to its evidence: supported, contradicted, or needing review — with the reason spelled out.",
    to: "/app/truthtrace",
  },
  {
    icon: <PenLine size={20} />,
    title: "Rewrite Studio",
    body: "Review each proposed edit, see why it changed, and accept or reject them one by one before re-auditing.",
    to: "/app/rewrite",
  },
  {
    icon: <GitBranch size={20} />,
    title: "ApprovalFlow",
    body: "Send audited content to authorised reviewers, capture decisions, comments and override reasons.",
    to: "/app/approvals",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "BrandPulse",
    body: "See recurring finding categories, violated rules and resolution trends across your workspace.",
    to: "/app/pulse",
  },
  {
    icon: <ImageIcon size={20} />,
    title: "VisualGuard",
    body: "Upload marketing creative to check dimensions, palette proximity and basic readability observations.",
    to: "/app/visual",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "for evaluation",
    blurb: "Explore the full workflow with the sample workspace.",
    features: ["1 workspace", "Sample Nova Bottle brand", "Audits, rewrites and approvals", "CSV and JSON exports"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Team",
    price: "$49",
    period: "per workspace / month",
    blurb: "For marketing teams publishing every week.",
    features: ["Unlimited audits", "Brand rules, facts and documents", "ApprovalFlow with roles", "Campaign consistency checks", "BrandPulse analytics"],
    cta: "Start your first audit",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "annual agreement",
    blurb: "For organisations with governance and residency requirements.",
    features: ["SSO and role enforcement", "Private model routing", "Retention controls", "Audit log exports"],
    cta: "Talk to us",
    highlight: false,
  },
];

function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="#111827" />
        <path d="M32 14l15 6.6V32c0 10-6.5 17.7-15 20-8.5-2.3-15-10-15-20V20.6L32 14z" fill="none" stroke="url(#lg)" strokeWidth="4" strokeLinejoin="round" />
        <path d="M24.5 32.5l5.5 5.5 10.5-11.5" fill="none" stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[15px] font-bold tracking-tight text-ink">
        VeriBrand <span className="text-accent">AI</span>
      </span>
    </span>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-accent/25 via-transparent to-accent-cyan/20 blur-2xl" aria-hidden="true" />
      <div className="glass relative rounded-2xl p-4 shadow-glow sm:p-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
            <span className="ml-2 text-xs font-medium text-ink-muted">Audit — Winter launch copy</span>
          </div>
          <span className="chip border-accent/40 bg-accent/15 text-accent">Analysing</span>
        </div>

        <div className="grid gap-4 pt-4 sm:grid-cols-5">
          <div className="sm:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Submitted content</p>
            <p className="mt-2 rounded-xl border border-white/10 bg-base-soft/70 p-3 text-[13px] leading-relaxed text-ink">
              Meet the Nova Bottle, our{" "}
              <span className="rounded bg-bad/20 px-1 text-bad underline decoration-bad/50 decoration-dotted underline-offset-2">1-litre insulated bottle</span>{" "}
              that keeps drinks cold for{" "}
              <span className="rounded bg-bad/20 px-1 text-bad underline decoration-bad/50 decoration-dotted underline-offset-2">72 hours</span>. It is the{" "}
              <span className="rounded bg-warn/20 px-1 text-warn underline decoration-warn/50 decoration-dotted underline-offset-2">world&apos;s best-selling bottle</span>.
            </p>

            <div className="mt-3 rounded-xl border border-bad/30 bg-bad/[0.07] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="chip border-bad/35 bg-bad/10 text-bad">
                  <X size={12} /> Contradicted
                </span>
                <span className="text-[11px] text-ink-muted">factual_accuracy · high</span>
              </div>
              <p className="mt-2 text-[13px] text-ink">
                “72 hours” differs from the approved specification.
              </p>
              <div className="mt-2 rounded-lg border border-ok/30 bg-ok/10 p-2 text-[12px] text-ink">
                <span className="font-semibold text-ok">Suggested: </span>
                keeps drinks cold for up to 48 hours
              </div>
              <p className="mt-2 text-[11px] text-ink-muted">
                Evidence: Nova Bottle Product Specification.pdf — p.2
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-warn/30 bg-warn/[0.07] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="chip border-warn/35 bg-warn/10 text-warn">
                  <span aria-hidden="true">⚠</span> Needs review
                </span>
                <span className="text-[11px] text-ink-muted">unsupported_claim · high</span>
              </div>
              <p className="mt-2 text-[13px] text-ink">No approved source supports this sales-ranking claim.</p>
              <p className="mt-1 text-[11px] text-ink-muted">No approved evidence was found to verify this claim.</p>
            </div>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <div className="rounded-xl border border-white/10 bg-base-soft/70 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Brand compliance</p>
              <div className="relative mx-auto mt-2 h-24 w-24">
                <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#1C2740" strokeWidth="12" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - 0.62)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-ink">62</span>
                  <span className="text-[10px] text-ink-muted">/ 100</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-muted">Explainable: severity-weighted findings</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-base-soft/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Fact check</p>
              <ul className="mt-2 space-y-1.5 text-[12px]">
                <li className="flex items-center justify-between text-bad">
                  <span>Capacity</span> <span className="font-semibold">Contradicted</span>
                </li>
                <li className="flex items-center justify-between text-bad">
                  <span>Insulation</span> <span className="font-semibold">Contradicted</span>
                </li>
                <li className="flex items-center justify-between text-warn">
                  <span>Sales rank</span> <span className="font-semibold">Needs review</span>
                </li>
                <li className="flex items-center justify-between text-ok">
                  <span>Materials</span> <span className="font-semibold">Supported</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-base text-ink">
      {/* backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px]" />
        <div className="absolute right-[-10%] top-1/3 h-[380px] w-[520px] rounded-full bg-accent-cyan/10 blur-[130px]" />
      </div>

      {/* nav */}
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled ? "border-b border-white/[0.07] bg-base/85 backdrop-blur-xl" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="VeriBrand AI home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} className="nav-link">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/signin" className="btn-ghost">
              Sign In
            </Link>
            <Link to="/signup" className="btn-primary">
              Get Started <ArrowRight size={15} />
            </Link>
          </div>

          <button
            className="btn-ghost lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/[0.07] bg-base/95 px-4 py-4 backdrop-blur-xl lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {NAV.map((n) => (
                <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-white/5 hover:text-ink">
                  {n.label}
                </a>
              ))}
              <div className="mt-3 flex gap-3">
                <Link to="/signin" className="btn-secondary flex-1" onClick={() => setOpen(false)}>
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* hero */}
      <main>
        <section id="product" className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fadeUp">
              <span className="chip border-accent/40 bg-accent/10 text-accent">
                <Sparkles size={12} /> AI assists. Humans decide.
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl xl:text-6xl">
                Your Brand. <span className="text-gradient">Verified Before It Goes Live.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                Ensure every campaign, email, advertisement, and product description stays accurate, consistent, and
                aligned with your brand guidelines.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="btn-primary px-6 py-3 text-[15px]">
                  Start Your First Audit <ArrowRight size={16} />
                </Link>
                <Link to="/signin?demo=1" className="btn-secondary px-6 py-3 text-[15px]">
                  Explore Demo
                </Link>
              </div>
              <p className="mt-4 text-xs text-ink-muted">
                No credit card. Demo mode runs entirely in your browser with fictional sample data.
              </p>
            </div>

            <div className="animate-fadeUp" style={{ animationDelay: "120ms" }}>
              <HeroPreview />
            </div>
          </div>

          {/* trust */}
          <div className="mt-16 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Built on four commitments
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-card/60 px-3.5 py-3 text-sm text-ink">
                  <Check size={15} className="shrink-0 text-ok" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-cyan">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">From definition to approval in five steps</h2>
            <p className="mt-3 text-ink-muted">
              Every step keeps evidence attached to the claim and a human in charge of the final decision.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="surface group relative overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1">
                <span className="text-4xl font-black text-white/[0.06] transition-colors group-hover:text-accent/25">{s.n}</span>
                <h3 className="mt-2 text-sm font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{s.body}</p>
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-accent to-accent-cyan opacity-0 transition-opacity group-hover:opacity-100" />
              </li>
            ))}
          </ol>
        </section>

        {/* features */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-cyan">Features</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">One workspace for the whole verification loop</h2>
            </div>
            <Link to="/signup" className="btn-secondary">
              Explore the workspace <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                to={f.to}
                className="surface group flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent-cyan/15 text-accent transition-colors group-hover:text-accent-cyan">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-muted">{f.body}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                  Explore <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* security */}
        <section id="security" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="surface grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-cyan">Security &amp; responsible AI</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Uncertainty is labelled, never hidden</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Uploaded documents and submitted content are treated as untrusted data and never as instructions. The
                system keeps a clear line between your configured rules, your approved evidence and the content under
                review — and it says so plainly when a claim cannot be verified.
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  "No fabricated citations: evidence either points at an approved source or is explicitly marked unavailable.",
                  "Workspace-scoped records: one workspace cannot read another workspace's data.",
                  "File type and size validation on every upload, with clear failure states.",
                  "Exports contain audit data only — never credentials or secrets.",
                  "Roles and permissions for admins, editors, reviewers and viewers.",
                ].map((s) => (
                  <li key={s} className="flex gap-2.5 text-ink-muted">
                    <Shield size={15} className="mt-0.5 shrink-0 text-accent" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-base-soft/60 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Verification statuses</p>
              <div className="mt-4 space-y-3">
                {[
                  { s: "SUPPORTED", c: "border-ok/35 bg-ok/10 text-ok", d: "Available approved evidence supports the claim." },
                  { s: "NEEDS REVIEW", c: "border-warn/35 bg-warn/10 text-warn", d: "Evidence is missing, ambiguous, outdated or inconclusive. A missing source is never treated as a contradiction." },
                  { s: "CONTRADICTED", c: "border-bad/35 bg-bad/10 text-bad", d: "Approved evidence conflicts with the claim." },
                ].map((x) => (
                  <div key={x.s} className="rounded-xl border border-white/[0.07] bg-card/70 p-4">
                    <span className={cn("chip", x.c)}>{x.s}</span>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{x.d}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
                A score summarises findings for triage. It does not guarantee legal compliance or factual accuracy, and
                it is never presented as such.
              </p>
            </div>
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-cyan">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Start free, scale when the team does</h2>
            <p className="mt-2 text-sm text-ink-muted">Illustrative pricing for this demonstration build.</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "surface relative flex flex-col p-6",
                  p.highlight && "border-accent/50 shadow-glow",
                )}
              >
                {p.highlight && (
                  <span className="chip absolute -top-3 left-6 border-accent/40 bg-accent text-white">Most popular</span>
                )}
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-ink">{p.price}</span>
                  <span className="text-xs text-ink-muted">{p.period}</span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{p.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-ink-muted">
                      <Check size={15} className="mt-0.5 shrink-0 text-ok" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={cn(p.highlight ? "btn-primary mt-6" : "btn-secondary mt-6")}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* final CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card-elevated via-card to-[#131b33] p-8 text-center sm:p-14">
            <div className="absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full bg-accent/25 blur-[100px]" aria-hidden="true" />
            <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">Make Every Brand Message Count.</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-ink-muted sm:text-base">
              Define your brand once, then verify every piece of content against it before it ships.
            </p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="btn-primary px-6 py-3 text-[15px]">
                Get Started <ArrowRight size={16} />
              </Link>
              <Link to="/signin?demo=1" className="btn-secondary px-6 py-3 text-[15px]">
                Explore Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-white/[0.07] bg-base-soft/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              Evidence-linked brand governance for marketing teams. AI assists, humans decide, uncertainty is always
              labelled.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">Product</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li><Link to="/app/brand" className="hover:text-ink">Brand DNA Studio</Link></li>
              <li><Link to="/app/audit/new" className="hover:text-ink">Evidence-Linked Auditor</Link></li>
              <li><Link to="/app/truthtrace" className="hover:text-ink">TruthTrace</Link></li>
              <li><Link to="/app/rewrite" className="hover:text-ink">Rewrite Studio</Link></li>
              <li><Link to="/app/approvals" className="hover:text-ink">ApprovalFlow</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">Resources</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li><Link to="/docs" className="hover:text-ink">Documentation</Link></li>
              <li><Link to="/help" className="hover:text-ink">Help Center</Link></li>
              <li><Link to="/security" className="hover:text-ink">Security</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li><Link to="/privacy" className="hover:text-ink">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-ink">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06] py-5">
          <p className="mx-auto max-w-7xl px-4 text-xs text-ink-muted sm:px-6">
            © {new Date().getFullYear()} VeriBrand AI. Verification results are decision support, not a guarantee of
            legal compliance or factual accuracy.
          </p>
        </div>
      </footer>
    </div>
  );
}
