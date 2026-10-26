import type { Audit, Brand, Workspace } from "./types";
import { csvEscape, downloadFile, formatDate, formatDateTime } from "./utils";

export function findingsCSV(audit: Audit, brand?: Brand | null): string {
  const header = [
    "finding_id",
    "status",
    "severity",
    "category",
    "original_text",
    "explanation",
    "suggested_fix",
    "evidence_source",
    "matched_rules",
    "confidence",
    "review_status",
    "reviewer_comment",
    "false_positive_reason",
  ];
  const rows = audit.findings.map((f) =>
    [
      f.id,
      f.verificationStatus,
      f.severity,
      f.category,
      f.originalExcerpt,
      f.explanation,
      f.suggestedCorrection ?? f.suggestedAction ?? "",
      f.evidence
        .filter((e) => e.type !== "none")
        .map((e) => [e.label, e.sourceLabel, e.passage].filter(Boolean).join(" — "))
        .join(" | "),
      f.matchedRuleIds.join(" | "),
      f.confidence,
      f.reviewStatus,
      f.comments.map((c) => `${c.authorName}: ${c.body}`).join(" | "),
      f.falsePositiveReason ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  const meta = [
    `# VeriBrand AI findings export`,
    `# Audit: ${audit.title}`,
    `# Brand: ${brand?.name ?? "unknown"}`,
    `# Audit date: ${formatDateTime(audit.createdAt)}`,
    `# Analysis: ${audit.resultLabel}`,
    `# This export contains no credentials or secrets.`,
  ];
  return `${meta.join("\n")}\n${header.join(",")}\n${rows.join("\n")}\n`;
}

export function auditJSON(audit: Audit, brand?: Brand | null, workspace?: Workspace | null): string {
  const payload = {
    export: "VeriBrand AI audit",
    exported_at: new Date().toISOString(),
    disclaimer: "This export contains audit data only — no credentials, secrets or personal contact details.",
    workspace: workspace ? { id: workspace.id, name: workspace.name } : null,
    brand: brand ? { id: brand.id, name: brand.name } : null,
    audit: {
      id: audit.id,
      title: audit.title,
      content_type: audit.contentType,
      campaign: audit.campaignName ?? null,
      language: audit.language,
      version: audit.version,
      status: audit.status,
      created_at: audit.createdAt,
      analysis_mode: audit.analysisMode,
      result_label: audit.resultLabel,
      compliance_score: audit.score,
      summary: audit.summaryText,
      limitations: audit.limitations,
      checks: audit.checksRun,
      content: audit.content,
      revised_content: audit.revisedContent ?? null,
    },
    findings: audit.findings.map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      verification_status: f.verificationStatus,
      review_status: f.reviewStatus,
      original_excerpt: f.originalExcerpt,
      explanation: f.explanation,
      evidence: f.evidence,
      matched_rules: f.matchedRuleIds,
      suggested_correction: f.suggestedCorrection ?? null,
      suggested_action: f.suggestedAction ?? null,
      confidence: f.confidence,
      requires_human_review: f.requiresHumanReview,
      reviewer_comments: f.comments.map((c) => ({ author: c.authorName, body: c.body, at: c.at })),
      false_positive_reason: f.falsePositiveReason ?? null,
      resolution_note: f.resolutionNote ?? null,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadAuditCSV(audit: Audit, brand?: Brand | null) {
  downloadFile(`veribrand-${slug(audit.title)}-findings.csv`, findingsCSV(audit, brand), "text/csv;charset=utf-8");
}

export function downloadAuditJSON(audit: Audit, brand?: Brand | null, workspace?: Workspace | null) {
  downloadFile(`veribrand-${slug(audit.title)}-audit.json`, auditJSON(audit, brand, workspace), "application/json");
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function reportFilename(audit: Audit): string {
  return `VeriBrand-AI-${slug(audit.title)}-${formatDate(audit.createdAt).replace(/\s+/g, "-")}`;
}
