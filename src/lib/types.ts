/* ------------------------------------------------------------------ *
 * VeriBrand AI — shared domain types
 * ------------------------------------------------------------------ */

export type Role = "ADMIN" | "EDITOR" | "REVIEWER" | "VIEWER";

export type Severity = "critical" | "high" | "medium" | "low" | "informational";

export type VerificationStatus = "SUPPORTED" | "NEEDS_REVIEW" | "CONTRADICTED";

export type ReviewStatus =
  | "open"
  | "reviewed"
  | "accepted"
  | "edited"
  | "rejected"
  | "false_positive"
  | "resolved";

export type AuditStatus = "draft" | "in_progress" | "needs_review" | "approved" | "rejected";

export type ApprovalStatus =
  | "draft"
  | "audit_completed"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "archived";

export type FindingCategory =
  | "factual_accuracy"
  | "unsupported_claim"
  | "tone"
  | "rule_violation"
  | "disclaimer"
  | "terminology"
  | "accessibility"
  | "consistency"
  | "ambiguous";

export type RuleCategory =
  | "Accuracy"
  | "Tone"
  | "Terminology"
  | "Compliance"
  | "Accessibility"
  | "Visual Identity"
  | "Required Disclaimers";

export type ContentType =
  | "Social media post"
  | "Advertisement"
  | "Marketing email"
  | "Website copy"
  | "Product description"
  | "Blog article"
  | "Press release"
  | "General marketing content";

export const CONTENT_TYPES: ContentType[] = [
  "Social media post",
  "Advertisement",
  "Marketing email",
  "Website copy",
  "Product description",
  "Blog article",
  "Press release",
  "General marketing content",
];

export type AuditCheck =
  | "brand_rules"
  | "factual_verification"
  | "tone"
  | "unsupported_claims"
  | "terminology"
  | "disclaimers"
  | "accessibility"
  | "consistency";

export const ALL_CHECKS: { key: AuditCheck; label: string; description: string }[] = [
  { key: "brand_rules", label: "Brand rule compliance", description: "Compare content with your active brand rules." },
  { key: "factual_verification", label: "Factual verification", description: "Match measurable claims against approved facts." },
  { key: "tone", label: "Tone of voice", description: "Check readability, register and configured tone settings." },
  { key: "unsupported_claims", label: "Unsupported claims", description: "Detect superlatives, absolutes and guarantees." },
  { key: "terminology", label: "Terminology", description: "Flag discouraged words and inconsistent product naming." },
  { key: "disclaimers", label: "Required disclaimers", description: "Confirm mandatory disclaimers are present." },
  { key: "accessibility", label: "Accessibility", description: "Heuristics for readable, inclusive text." },
  { key: "consistency", label: "Content consistency", description: "Compare with campaign-approved messaging." },
];

export type AnalysisMode = "predefined_demo" | "deterministic" | "live_ai";

/* ---------------------------------- identity ---------------------- */

export interface User {
  id: string;
  name: string;
  email: string;
  title?: string;
  createdAt: string;
  isSample?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  industry: string;
  website: string;
  language: string;
  createdAt: string;
  isSample?: boolean;
}

export interface Membership {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
}

export interface Session {
  userId: string;
  workspaceId: string;
  /** "demo" = browser-local session, no server authentication configured. */
  mode: "demo" | "server";
  signedInAt: string;
}

/* ---------------------------------- brand ------------------------- */

export interface ToneProfile {
  formality: number; // 0 casual … 100 formal
  friendliness: number; // 0 authoritative … 100 friendly
  conciseness: number; // 0 descriptive … 100 concise
  technicality: number; // 0 accessible … 100 technical
  sentenceStyle: "short" | "varied" | "formal";
  preferredTerms: string[];
  avoidPhrases: string[];
}

export interface Brand {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  industry: string;
  audience: string;
  mission: string;
  personality: string;
  writingStyle: string;
  wordsToUse: string[];
  wordsAvoid: string[];
  language: string;
  website: string;
  tone: ToneProfile;
  createdAt: string;
  updatedAt: string;
  isSample?: boolean;
}

export interface BrandRule {
  id: string;
  brandId: string;
  title: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  status: "active" | "draft" | "archived" | "suggested";
  contentTypes: ContentType[];
  sourceRef?: string;
  sourcePassage?: string;
  explanation?: string;
  confidence?: number;
  origin: "manual" | "suggested";
  updatedAt: string;
  isSample?: boolean;
}

export type FactCategory =
  | "Specification"
  | "Pricing"
  | "Availability"
  | "Performance"
  | "Dates & campaigns"
  | "Warranty"
  | "Other";

export interface ApprovedFact {
  id: string;
  brandId: string;
  title: string;
  value: string;
  description: string;
  category: FactCategory;
  /** numeric value + unit used by the deterministic claim matcher */
  numericValue?: number;
  unit?: string;
  sourceLabel: string;
  sourceDocId?: string;
  sourceUrl?: string;
  verificationStatus: "verified" | "unverified" | "disputed";
  lastVerifiedAt: string;
  expiresAt?: string;
  owner: string;
  isSample?: boolean;
}

export type DocStatus = "pending" | "processing" | "processed" | "failed";

export interface SourcePassage {
  id: string;
  ref: string; // e.g. "p.2" or "¶4"
  text: string;
}

export interface BrandDocument {
  id: string;
  brandId: string;
  filename: string;
  kind: "pdf" | "txt" | "docx";
  size: number;
  uploadedAt: string;
  processingStatus: DocStatus;
  extracted: boolean;
  passages: SourcePassage[];
  error?: string;
  isSample?: boolean;
}

export interface BrandAsset {
  id: string;
  brandId: string;
  kind: "primary_logo" | "secondary_logo" | "icon" | "palette" | "typography" | "reference";
  name: string;
  dataUrl?: string;
  palette?: string[];
  note?: string;
  uploadedAt: string;
  isSample?: boolean;
}

export interface Disclaimer {
  id: string;
  brandId: string;
  text: string;
  when: string;
  appliesTo: string[];
  severity: Severity;
  mandatory: boolean;
  isSample?: boolean;
}

/* ---------------------------------- audits ------------------------ */

export interface EvidenceRef {
  type: "fact" | "rule" | "document" | "campaign" | "none";
  refId?: string;
  label?: string;
  passage?: string;
  sourceLabel?: string;
}

export interface FindingComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  at: string;
}

export interface Finding {
  id: string;
  auditId: string;
  category: FindingCategory;
  severity: Severity;
  verificationStatus: VerificationStatus;
  originalExcerpt: string;
  explanation: string;
  evidence: EvidenceRef[];
  matchedRuleIds: string[];
  suggestedCorrection?: string;
  /** Exact text that replaces [charStart, charEnd) when applying an edit. */
  suggestedReplacement?: string;
  suggestedAction?: string;
  confidence: number;
  requiresHumanReview: boolean;
  reviewStatus: ReviewStatus;
  resolutionNote?: string;
  falsePositiveReason?: string;
  comments: FindingComment[];
  assigneeId?: string;
  charStart?: number;
  charEnd?: number;
}

export interface CheckResult {
  category: AuditCheck | "claim_extraction";
  status: "completed" | "skipped" | "failed";
  summary: string;
}

export interface ScoreBreakdown {
  score: number | null;
  reason: string;
  factors: { label: string; detail: string }[];
}

export interface Audit {
  id: string;
  workspaceId: string;
  brandId: string;
  title: string;
  contentType: ContentType;
  campaignName?: string;
  audience?: string;
  language: string;
  content: string;
  revisedContent?: string;
  version: number;
  status: AuditStatus;
  checks: AuditCheck[];
  findings: Finding[];
  checksRun: CheckResult[];
  limitations: string[];
  score: ScoreBreakdown;
  analysisMode: AnalysisMode;
  /** banner shown above results, e.g. demo labelling */
  resultLabel: string;
  riskLevel: Severity | "clear";
  summaryText: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reviewerId?: string;
  rewriteId?: string;
  parentAuditId?: string;
  isSample?: boolean;
}

/* ---------------------------------- rewrite ----------------------- */

export type RewriteMode =
  | "fix_brand_violations"
  | "factual_accuracy"
  | "match_tone"
  | "concise"
  | "clarity"
  | "remove_superlatives"
  | "add_disclaimers"
  | "accessibility"
  | "simplify_language";

export const REWRITE_MODES: { key: RewriteMode; label: string; description: string }[] = [
  { key: "fix_brand_violations", label: "Fix brand violations", description: "Address findings tied to active brand rules." },
  { key: "factual_accuracy", label: "Improve factual accuracy", description: "Align measurable claims with approved facts." },
  { key: "match_tone", label: "Match brand tone", description: "Adjust register toward the configured tone profile." },
  { key: "concise", label: "Make content more concise", description: "Trim filler words and redundant phrases." },
  { key: "clarity", label: "Improve clarity", description: "Split long sentences and simplify structure." },
  { key: "remove_superlatives", label: "Remove unsupported superlatives", description: "Rewrite absolute and superlative claims." },
  { key: "add_disclaimers", label: "Add required disclaimers", description: "Insert disclaimers required for this content type." },
  { key: "accessibility", label: "Improve accessibility", description: "Plain-language and readability improvements." },
  { key: "simplify_language", label: "Simplify technical language", description: "Replace jargon with accessible wording." },
];

export interface RewriteEdit {
  id: string;
  findingId?: string;
  what: string;
  why: string;
  basis: { type: "fact" | "rule" | "tone" | "readability" | "disclaimer"; label: string };
  before: string;
  after: string;
  start: number;
  end: number;
  accepted: boolean;
}

export interface Rewrite {
  id: string;
  auditId: string;
  originalContent: string;
  revisedContent: string;
  mode: RewriteMode;
  edits: RewriteEdit[];
  createdAt: string;
  createdBy: string;
  isSample?: boolean;
}

/* ---------------------------------- approvals -------------------- */

export type ChecklistStatus = "complete" | "incomplete" | "needs_review" | "not_applicable";

export interface ChecklistItem {
  key: string;
  label: string;
  required: boolean;
  status: ChecklistStatus;
  evidence: string;
  nextAction: string;
}

export interface ReviewComment {
  id: string;
  authorId: string;
  authorName: string;
  role: Role;
  body: string;
  at: string;
  kind: "comment" | "decision" | "system";
}

export interface ApprovalDecision {
  id: string;
  decision: "approve" | "reject" | "request_changes";
  reviewerId: string;
  reviewerName: string;
  at: string;
  comment?: string;
  overrideReason?: string;
  auditVersion: number;
  unresolvedAtDecision: number;
}

export interface Approval {
  id: string;
  auditId: string;
  workspaceId: string;
  status: ApprovalStatus;
  submitterId: string;
  submitterName: string;
  reviewerId?: string;
  reviewerName?: string;
  submittedAt?: string;
  updatedAt: string;
  contentVersion: number;
  comments: ReviewComment[];
  decisions: ApprovalDecision[];
  checklist: ChecklistItem[];
  history: { at: string; label: string; by: string }[];
  isSample?: boolean;
}

/* ---------------------------------- misc -------------------------- */

export interface Campaign {
  id: string;
  workspaceId: string;
  brandId: string;
  name: string;
  status: "planning" | "active" | "completed";
  approvedMessages: string[];
  auditIds: string[];
  createdAt: string;
  isSample?: boolean;
}

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: "audit" | "rule" | "fact" | "approval" | "document" | "rewrite" | "workspace";
  resourceId: string;
  label: string;
  at: string;
  isSample?: boolean;
}

export interface AppNotification {
  id: string;
  workspaceId: string;
  type:
    | "audit_completed"
    | "high_severity"
    | "review_requested"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "fact_review";
  title: string;
  body: string;
  link: string;
  at: string;
  read: boolean;
  isSample?: boolean;
}

export interface VisualIssue {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  kind: "auto" | "potential" | "unavailable";
  suggestion?: string;
  guideline?: string;
}

export interface VisualAnalysis {
  id: string;
  filename: string;
  dataUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
  dominantColors: string[];
  issues: VisualIssue[];
  completedChecks: string[];
  unavailableChecks: string[];
  humanReview: "pending" | "reviewed";
  at: string;
}

export interface AppState {
  version: number;
  session: Session | null;
  users: User[];
  workspaces: Workspace[];
  memberships: Membership[];
  brands: Brand[];
  rules: BrandRule[];
  facts: ApprovedFact[];
  documents: BrandDocument[];
  assets: BrandAsset[];
  disclaimers: Disclaimer[];
  audits: Audit[];
  rewrites: Rewrite[];
  approvals: Approval[];
  campaigns: Campaign[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  visuals: VisualAnalysis[];
  checklistConfig: { key: string; label: string; required: boolean }[];
  onboarded: boolean;
  roleOverride?: Role | null;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  informational: 1,
};

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 18,
  high: 12,
  medium: 7,
  low: 3,
  informational: 1,
};
