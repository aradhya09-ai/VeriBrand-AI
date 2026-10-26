import { useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  FlaskConical,
  GitBranch,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  PenLine,
  ScanSearch,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Tags,
  User,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { cn, timeAgo, truncate } from "../lib/utils";
import { SampleBadge, useToast } from "./ui";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/brand", label: "Brand DNA Studio", icon: FlaskConical },
  { to: "/app/audit/new", label: "New Audit", icon: ScanSearch },
  { to: "/app/audits", label: "Audit History", icon: FileText },
  { to: "/app/rewrite", label: "Rewrite Studio", icon: PenLine },
  { to: "/app/approvals", label: "ApprovalFlow", icon: GitBranch },
  { to: "/app/pulse", label: "BrandPulse", icon: BarChart3 },
  { to: "/app/visual", label: "VisualGuard", icon: ImageIcon },
  { to: "/app/campaigns", label: "Campaigns", icon: Tags },
  { to: "/app/reports", label: "Reports", icon: ShieldCheck },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

interface SearchHit {
  type: string;
  title: string;
  subtitle: string;
  to: string;
}

export default function AppShell() {
  const { state, user, workspace, brand, role, signOut, switchWorkspace, markNotificationRead, markAllNotificationsRead, isSampleWorkspace } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const unread = state.notifications.filter((n) => !n.read).length;

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchHit[] = [];
    for (const a of state.audits) {
      if (a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q))
        out.push({ type: "Audit", title: a.title, subtitle: `${a.contentType} · ${timeAgo(a.createdAt)}`, to: `/app/audits/${a.id}` });
    }
    for (const r of state.rules) {
      if (r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
        out.push({ type: "Brand rule", title: r.title, subtitle: `${r.category} · ${r.severity}`, to: "/app/brand?tab=rules" });
    }
    for (const f of state.facts) {
      if (f.title.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))
        out.push({ type: "Approved fact", title: f.title, subtitle: f.value, to: "/app/brand?tab=facts" });
    }
    for (const d of state.documents) {
      if (d.filename.toLowerCase().includes(q))
        out.push({ type: "Document", title: d.filename, subtitle: d.processingStatus, to: "/app/brand?tab=documents" });
    }
    for (const c of state.campaigns) {
      if (c.name.toLowerCase().includes(q))
        out.push({ type: "Campaign", title: c.name, subtitle: `${c.auditIds.length} linked audits`, to: "/app/campaigns" });
    }
    for (const ap of state.approvals) {
      const audit = state.audits.find((a) => a.id === ap.auditId);
      if (audit && audit.title.toLowerCase().includes(q))
        out.push({ type: "Approval", title: audit.title, subtitle: ap.status, to: `/app/approvals/${ap.id}` });
    }
    return out.slice(0, 12);
  }, [query, state]);

  const closeAll = () => {
    setNotifOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4", collapsed && "justify-center px-2")}>
        <Link to="/app" className="flex items-center gap-2.5" aria-label="VeriBrand AI dashboard">
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="18" fill="#111827" />
            <path d="M32 14l15 6.6V32c0 10-6.5 17.7-15 20-8.5-2.3-15-10-15-20V20.6L32 14z" fill="none" stroke="url(#lg2)" strokeWidth="4" strokeLinejoin="round" />
            <path d="M24.5 32.5l5.5 5.5 10.5-11.5" fill="none" stroke="url(#lg2)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-ink">
              VeriBrand <span className="text-accent">AI</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Application">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? n.label : undefined}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive ? "bg-accent/15 text-ink shadow-[inset_0_0_0_1px_rgba(99,102,241,.35)]" : "text-ink-muted hover:bg-white/[0.05] hover:text-ink",
                collapsed && "justify-center px-2",
              )
            }
          >
            <n.icon size={17} className="shrink-0" />
            {!collapsed && <span className="flex-1">{n.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        {isSampleWorkspace && !collapsed && <div className="mb-2"><SampleBadge note="Sample workspace" /></div>}
        <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-xs font-bold text-white">
            {(user?.name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-ink-muted">{role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              className="btn-ghost !px-2"
              title="Sign out"
              aria-label="Sign out"
              onClick={() => {
                signOut();
                navigate("/");
              }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        <button
          className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink lg:flex"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-base">
      {/* desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-white/[0.06] bg-card/40 transition-all duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[264px] border-r border-white/10 bg-card animate-slideIn">
            <button className="absolute right-3 top-4 z-10 btn-ghost !px-2" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-white/[0.06] bg-base/85 px-3 backdrop-blur-xl sm:px-5">
          <button className="btn-ghost !px-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>

          {/* workspace selector */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/[0.07]"
              onClick={() => {
                setProfileOpen(false);
                setNotifOpen(false);
                setCollapsed((c) => !c);
              }}
              style={{ display: "none" }}
              aria-hidden
            />
            <Link
              to="/app/settings"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/[0.07]"
              title="Switch workspace"
            >
              <span className="hidden h-5 w-5 items-center justify-center rounded-md bg-accent/20 text-[10px] font-bold text-accent">
                {(workspace?.name ?? "W").slice(0, 2).toUpperCase()}
              </span>
              <span className="max-w-[140px] truncate">{workspace?.name ?? "Workspace"}</span>
              <ChevronDown size={14} className="text-ink-muted" />
            </Link>
          </div>

          {/* search */}
          <div className="relative ml-auto hidden sm:block">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="flex w-56 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-white/[0.07] md:w-72"
              aria-label="Search"
            >
              <Search size={15} />
              <span>Search audits, rules…</span>
              <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
          </div>
          <button className="btn-ghost !px-2 sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search size={18} />
          </button>

          {/* notifications */}
          <div className="relative">
            <button
              className="btn-ghost relative !px-2.5"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-[320px] animate-fadeUp overflow-hidden rounded-2xl border border-white/10 bg-card-elevated shadow-card">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                  <span className="text-sm font-semibold text-ink">Notifications</span>
                  <button className="text-xs font-medium text-accent hover:underline" onClick={markAllNotificationsRead}>
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {state.notifications.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-ink-muted">No notifications yet.</p>
                  )}
                  {state.notifications.slice(0, 12).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        setNotifOpen(false);
                        navigate(n.link);
                      }}
                      className={cn(
                        "flex w-full gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition-colors hover:bg-white/[0.04]",
                        !n.read && "bg-accent/[0.06]",
                      )}
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-white/20" : "bg-accent-cyan")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{n.title}</span>
                        <span className="block text-xs text-ink-muted">{n.body}</span>
                        <span className="mt-0.5 block text-[11px] text-ink-muted/70">
                          {timeAgo(n.at)}
                          {n.isSample ? " · sample data" : ""}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/[0.07] px-4 py-2.5 text-center">
                  <button className="text-xs font-medium text-accent hover:underline" onClick={() => { setNotifOpen(false); navigate("/app/settings"); }}>
                    Notification settings
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link to="/help" className="btn-ghost hidden !px-2.5 sm:inline-flex" aria-label="Help">
            <HelpCircle size={18} />
          </Link>

          {/* profile */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 transition-colors hover:bg-white/[0.07]"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              aria-label="Open profile menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-[11px] font-bold text-white">
                {(user?.name ?? "U").slice(0, 1).toUpperCase()}
              </span>
              <ChevronDown size={14} className="text-ink-muted" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-64 animate-fadeUp rounded-2xl border border-white/10 bg-card-elevated p-2 shadow-card">
                <div className="border-b border-white/[0.07] px-3 py-3">
                  <p className="text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-xs text-ink-muted">{user?.email}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-accent">{role}</p>
                </div>
                <Link to="/app/settings" onClick={closeAll} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink">
                  <User size={15} /> Profile &amp; preferences
                </Link>
                <Link to="/app/settings?tab=workspace" onClick={closeAll} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink">
                  <SettingsIcon size={15} /> Workspace settings
                </Link>
                <Link to="/help" onClick={closeAll} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink">
                  <HelpCircle size={15} /> Help &amp; documentation
                </Link>
                <button
                  onClick={() => {
                    closeAll();
                    signOut();
                    navigate("/");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-bad hover:bg-bad/10"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* demo banner */}
        {isSampleWorkspace && (
          <div className="flex flex-wrap items-center gap-2 border-b border-accent-cyan/20 bg-accent-cyan/[0.06] px-4 py-2 text-xs text-ink-muted sm:px-6">
            <FlaskConical size={13} className="text-accent-cyan" />
            <span>
              <b className="text-ink">Sample workspace.</b> All brands, audits, findings and activity below are
              fictional demonstration data. Sign up to create your own workspace.
            </span>
            <Link to="/signup" className="ml-auto font-semibold text-accent-cyan hover:underline">
              Create workspace
            </Link>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {/* global search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-xl animate-fadeUp overflow-hidden rounded-2xl border border-white/10 bg-card-elevated shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
              <Search size={17} className="text-ink-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search audits, rules, facts, documents, campaigns…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
                aria-label="Global search"
              />
              <button onClick={() => setSearchOpen(false)} aria-label="Close search" className="text-ink-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim() === "" && (
                <div className="px-4 py-6 text-center text-sm text-ink-muted">
                  <Sparkles size={16} className="mx-auto mb-2 text-accent" />
                  Search across audits, content titles, brand rules, approved facts, documents, campaigns and approval
                  records.
                </div>
              )}
              {query.trim() !== "" && hits.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-ink-muted">
                  No results for “{query}”. Try a different term or clear the filters.
                </div>
              )}
              {hits.map((h, i) => (
                <button
                  key={`${h.to}-${i}`}
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                    navigate(h.to);
                  }}
                  className="flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-3 text-left hover:bg-white/[0.04]"
                >
                  <span className="chip border-white/15 bg-white/5 text-ink-muted">{h.type}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{h.title}</span>
                    <span className="block truncate text-xs text-ink-muted">{truncate(h.subtitle, 60)}</span>
                  </span>
                  <ChevronRight size={15} className="text-ink-muted" />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5 text-[11px] text-ink-muted">
              <span>Results are scoped to your workspace.</span>
              <button className="flex items-center gap-1 hover:text-ink" onClick={() => setSearchOpen(false)}>
                Esc to close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="hidden">
        <CircleCheck size={1} />
      </div>
    </div>
  );
}
