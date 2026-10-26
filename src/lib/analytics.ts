import type { Audit, Approval, Finding, Severity } from "./types";

export interface PulseFilters {
  days: number | null; // null = custom range
  from?: string;
  to?: string;
  campaignId?: string;
  contentType?: string;
  status?: string;
}

export interface PulseData {
  audits: Audit[];
  activity: { date: string; audits: number; findings: number }[];
  byCategory: { name: string; value: number }[];
  bySeverity: { name: string; value: number }[];
  byVerification: { name: string; value: number }[];
  resolution: { resolved: number; open: number; percent: number };
  topRules: { id: string; title: string; count: number }[];
  byContentType: { name: string; value: number }[];
  recurringClaims: number;
  toneIssues: number;
  totalFindings: number;
  pendingReviews: number;
  insights: { tone: "positive" | "neutral" | "warning"; text: string }[];
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function filterAudits(audits: Audit[], f: PulseFilters): Audit[] {
  const now = new Date();
  const to = f.to ? new Date(f.to) : now;
  const from = f.from ? new Date(f.from) : new Date(now.getTime() - (f.days ?? 30) * 86400000);
  return audits.filter((a) => {
    if (!inRange(a.createdAt, from, to)) return false;
    if (f.campaignId && a.campaignName !== f.campaignId) return false;
    if (f.contentType && a.contentType !== f.contentType) return false;
    if (f.status && a.status !== f.status) return false;
    return true;
  });
}

export function computePulse(audits: Audit[], approvals: Approval[], allRules: { id: string; title: string }[], f: PulseFilters): PulseData {
  const filtered = filterAudits(audits, f);
  const now = new Date();
  const from = f.from ? new Date(f.from) : new Date(now.getTime() - ((f.days ?? 30) - 1) * 86400000);
  const days = Math.max(1, Math.min(365, Math.round((now.getTime() - from.getTime()) / 86400000) + 1));

  const bucket = new Map<string, { audits: number; findings: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    bucket.set(d.toISOString().slice(0, 10), { audits: 0, findings: 0 });
  }
  for (const a of filtered) {
    const key = a.createdAt.slice(0, 10);
    const b = bucket.get(key);
    if (b) {
      b.audits += 1;
      b.findings += a.findings.filter((x) => x.verificationStatus !== "SUPPORTED").length;
    }
  }

  const allFindings = filtered.flatMap((a) => a.findings);
  const countBy = (pick: (f: Finding) => string) => {
    const m = new Map<string, number>();
    for (const f of allFindings) {
      const k = pick(f);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const severityOrder: Severity[] = ["critical", "high", "medium", "low", "informational"];
  const bySeverity = severityOrder
    .map((s) => ({ name: s, value: allFindings.filter((f) => f.severity === s).length }))
    .filter((x) => x.value > 0);

  const resolvedSet = new Set(["accepted", "edited", "resolved", "false_positive"]);
  const resolved = allFindings.filter((f) => resolvedSet.has(f.reviewStatus)).length;
  const open = allFindings.length - resolved;

  const ruleCounts = new Map<string, number>();
  for (const f of allFindings) for (const r of f.matchedRuleIds) ruleCounts.set(r, (ruleCounts.get(r) ?? 0) + 1);
  const topRules = [...ruleCounts.entries()]
    .map(([id, count]) => ({
      id,
      title: allRules.find((r) => r.id === id)?.title ?? id,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const superlatives = allFindings.filter((f) => f.category === "unsupported_claim").length;
  const toneIssues = allFindings.filter((f) => f.category === "tone").length;
  const pendingReviews = approvals.filter((a) => a.status === "pending_review").length;
  const superlativeAudits = filtered.filter((a) => a.findings.some((f) => f.category === "unsupported_claim")).length;

  const insights: PulseData["insights"] = [];
  if (filtered.length >= 5 && superlatives > 0) {
    insights.push({
      tone: "warning",
      text: `Unsupported superlative or guarantee claims appeared in ${superlativeAudits} of the last ${filtered.length} audited drafts.`,
    });
  }
  if (filtered.length >= 5 && toneIssues > 0) {
    insights.push({ tone: "neutral", text: `${toneIssues} tone deviation(s) were recorded in this period, mostly from hype wording on the brand's avoid list.` });
  }
  if (filtered.length >= 5 && allFindings.length > 0) {
    const pct = Math.round((resolved / allFindings.length) * 100);
    insights.push({ tone: pct >= 60 ? "positive" : "neutral", text: `${pct}% of findings in this period were accepted, edited or dismissed with a reason.` });
  }
  if (topRules[0] && filtered.length >= 5) {
    insights.push({ tone: "neutral", text: `Most frequently violated rule: “${topRules[0].title}” (${topRules[0].count} findings).` });
  }
  if (filtered.length < 5) {
    insights.push({
      tone: "neutral",
      text: `Only ${filtered.length} audit(s) match these filters — there is insufficient data for a reliable trend. Widen the date range or clear filters.`,
    });
  }

  return {
    audits: filtered,
    activity: [...bucket.entries()].map(([date, v]) => ({ date, audits: v.audits, findings: v.findings })),
    byCategory: countBy((f) => f.category),
    bySeverity,
    byVerification: countBy((f) => f.verificationStatus),
    resolution: { resolved, open, percent: allFindings.length ? Math.round((resolved / allFindings.length) * 100) : 0 },
    topRules,
    byContentType: countBy((f) => f.category === "accessibility" ? "accessibility" : "content"),
    recurringClaims: superlatives,
    toneIssues,
    totalFindings: allFindings.length,
    pendingReviews,
    insights,
  };
}

export function dashboardTotals(audits: Audit[], approvals: Approval[]) {
  const totalAudits = audits.length;
  const approved = audits.filter((a) => a.status === "approved").length;
  const issues = audits.reduce((n, a) => n + a.findings.filter((f) => f.verificationStatus !== "SUPPORTED").length, 0);
  const pending = approvals.filter((a) => a.status === "pending_review").length;
  return { totalAudits, approved, issues, pending };
}
