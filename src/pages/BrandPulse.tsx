import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, Info, TrendingUp } from "lucide-react";
import { computePulse, type PulseFilters } from "../lib/analytics";
import { useApp } from "../lib/store";
import { EmptyState, InlineNotice, SampleBadge, SectionHeader } from "../components/ui";
import { cn, titleCase } from "../lib/utils";

const SEV_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F87171",
  medium: "#F59E0B",
  low: "#60A5FA",
  informational: "#94A3B8",
};
const VER_COLORS: Record<string, string> = {
  SUPPORTED: "#22C55E",
  NEEDS_REVIEW: "#F59E0B",
  CONTRADICTED: "#EF4444",
};

const tooltipStyle = {
  backgroundColor: "#1C2740",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  color: "#F8FAFC",
  fontSize: 12,
};

export default function BrandPulse() {
  const { state, isSampleWorkspace } = useApp();
  const [days, setDays] = useState<number | null>(30);
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [campaign, setCampaign] = useState("");
  const [contentType, setContentType] = useState("");
  const [status, setStatus] = useState("");

  const filters: PulseFilters = useMemo(
    () => ({
      days: days ?? 30,
      from: days === null && custom.from ? custom.from : undefined,
      to: days === null && custom.to ? custom.to : undefined,
      campaignId: campaign || undefined,
      contentType: contentType || undefined,
      status: status || undefined,
    }),
    [days, custom, campaign, contentType, status],
  );

  const data = useMemo(
    () => computePulse(state.audits, state.approvals, state.rules, filters),
    [state.audits, state.approvals, state.rules, filters],
  );

  const activity = data.activity.map((d) => ({ ...d, label: d.date.slice(5) }));
  const campaignNames = [...new Set(state.audits.map((a) => a.campaignName).filter(Boolean))] as string[];
  const contentTypes = [...new Set(state.audits.map((a) => a.contentType))];

  const kpis = [
    { label: "Audits in range", value: data.audits.length },
    { label: "Findings", value: data.totalFindings },
    { label: "Resolution rate", value: `${data.resolution.percent}%` },
    { label: "Pending reviews", value: data.pendingReviews },
    { label: "Recurring unsupported claims", value: data.recurringClaims },
    { label: "Tone inconsistencies", value: data.toneIssues },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <SectionHeader
        title="BrandPulse"
        description="Recurring brand issues, violated rules and resolution trends across your workspace."
        actions={isSampleWorkspace && <SampleBadge />}
      />

      {/* filters */}
      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <div>
          <p className="field-label">Date range</p>
          <div className="flex flex-wrap gap-1.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => { setDays(d); setCustom({ from: "", to: "" }); }}
                className={cn("chip", days === d ? "border-accent/50 bg-accent/15 text-accent" : "border-white/15 bg-white/5 text-ink-muted hover:text-ink")}
              >
                Last {d} days
              </button>
            ))}
            <button
              onClick={() => setDays(null)}
              className={cn("chip", days === null ? "border-accent/50 bg-accent/15 text-accent" : "border-white/15 bg-white/5 text-ink-muted hover:text-ink")}
            >
              <CalendarRange size={11} /> Custom
            </button>
          </div>
        </div>

        {days === null && (
          <div className="flex gap-2">
            <label className="text-xs text-ink-muted">
              From
              <input type="date" className="input mt-1 !py-1.5" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            </label>
            <label className="text-xs text-ink-muted">
              To
              <input type="date" className="input mt-1 !py-1.5" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
            </label>
          </div>
        )}

        <label className="text-xs text-ink-muted">
          Campaign
          <select className="input mt-1 !py-1.5" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
            <option value="">All campaigns</option>
            {campaignNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-muted">
          Content type
          <select className="input mt-1 !py-1.5" value={contentType} onChange={(e) => setContentType(e.target.value)}>
            <option value="">All types</option>
            {contentTypes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-muted">
          Audit status
          <select className="input mt-1 !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["draft", "in_progress", "needs_review", "approved", "rejected"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <button
          className="btn-ghost !py-2"
          onClick={() => { setDays(30); setCustom({ from: "", to: "" }); setCampaign(""); setContentType(""); setStatus(""); }}
        >
          Clear filters
        </button>
      </div>

      {/* kpis */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="surface p-4">
            <p className="text-2xl font-bold text-ink">{k.value}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{k.label}</p>
          </div>
        ))}
      </div>

      {data.audits.length < 5 ? (
        <InlineNotice tone="warning" title="Insufficient data for a reliable trend">
          Only {data.audits.length} audit(s) match these filters. Widen the date range or clear filters to see
          meaningful trends — no statistics are shown for tiny samples.
        </InlineNotice>
      ) : null}

      {/* activity chart */}
      <section className="surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Audit activity over time</h2>
            <p className="text-xs text-ink-muted">Audits run and findings raised per day</p>
          </div>
          <TrendingUp size={16} className="text-accent" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activity} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="audits" name="Audits" stroke="#6366F1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="findings" name="Findings" stroke="#22D3EE" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* category + severity */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">Findings by category</h2>
          {data.byCategory.length === 0 ? (
            <EmptyState icon={<Info size={20} />} title="No findings in range" body="Run audits in this period to populate the chart." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(v) => titleCase(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Findings"]} labelFormatter={(l) => titleCase(String(l))} />
                  <Bar dataKey="value" fill="#6366F1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="surface p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">Findings by severity</h2>
          {data.bySeverity.length === 0 ? (
            <EmptyState icon={<Info size={20} />} title="No severity data" body="Findings raised in this period will appear here." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.bySeverity} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>
                    {data.bySeverity.map((s) => <Cell key={s.name} fill={SEV_COLORS[s.name] ?? "#6366F1"} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => titleCase(String(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* verification + rules */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-1 text-base font-semibold text-ink">Verification status distribution</h2>
          <p className="mb-3 text-xs text-ink-muted">How claims are resolving across your approved evidence</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byVerification} dataKey="value" nameKey="name" outerRadius={90}>
                  {data.byVerification.map((v) => <Cell key={v.name} fill={VER_COLORS[v.name] ?? "#6366F1"} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="text-xs text-ink-muted">
              Resolution: <b className="text-ink">{data.resolution.resolved}</b> resolved · <b className="text-ink">{data.resolution.open}</b> open ·{" "}
              <b className="text-ink">{data.resolution.percent}%</b> of findings in range.
            </p>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">Most frequently violated rules</h2>
          {data.topRules.length === 0 ? (
            <EmptyState icon={<Info size={20} />} title="No rule violations in range" body="Rules that generate findings will be ranked here." />
          ) : (
            <ol className="space-y-3">
              {data.topRules.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-bold text-ink-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{r.title}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-cyan" style={{ width: `${(r.count / data.topRules[0].count) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-ink">{r.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* insights */}
      <section className="surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
          <TrendingUp size={16} className="text-accent-cyan" /> Evidence-based insights
        </h2>
        <ul className="space-y-3">
          {data.insights.map((ins, i) => (
            <li
              key={i}
              className={cn(
                "rounded-xl border p-3.5 text-sm leading-relaxed",
                ins.tone === "warning" ? "border-warn/30 bg-warn/[0.07] text-ink"
                  : ins.tone === "positive" ? "border-ok/30 bg-ok/[0.07] text-ink"
                    : "border-white/[0.07] bg-white/[0.03] text-ink-muted",
              )}
            >
              {ins.text}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-ink-muted">
          Insights are computed from your stored records only. No business impact or performance claim is inferred
          without data to support it.
        </p>
      </section>
    </div>
  );
}
