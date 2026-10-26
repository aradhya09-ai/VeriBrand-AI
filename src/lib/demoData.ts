import type {
  ActivityEvent,
  AppNotification,
  AppState,
  Approval,
  Audit,
  Brand,
  BrandAsset,
  BrandDocument,
  BrandRule,
  Campaign,
  Disclaimer,
  ApprovedFact,
  Membership,
  User,
  Workspace,
} from "./types";
import { uid } from "./utils";

export const SAMPLE_CONTENT =
  "Meet the Nova Bottle, our 1-litre insulated bottle that keeps drinks cold for 72 hours. It is the world's best-selling bottle and guarantees the best hydration experience for everyone.";

const DAY = 86400000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();

const logoSvg = (label: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96"><rect width="320" height="96" rx="18" fill="#0B1020"/><path d="M44 22l18 8v14c0 12-8 21-18 24-10-3-18-12-18-24V30l18-8z" fill="none" stroke="${accent}" stroke-width="4" stroke-linejoin="round"/><path d="M36 46l7 7 12-13" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="86" y="56" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#F8FAFC">${label}</text></svg>`
  )}`;

function seedUsers(): { users: User[]; workspaces: Workspace[]; memberships: Membership[] } {
  const users: User[] = [
    { id: "u_demo", name: "Demo User", email: "demo@veribrand.local", title: "Brand Manager", createdAt: iso(120), isSample: true },
    { id: "u_reviewer", name: "Jordan Blake", email: "reviewer@veribrand.local", title: "Content Reviewer", createdAt: iso(120), isSample: true },
    { id: "u_editor", name: "Sam Rivera", email: "editor@veribrand.local", title: "Content Editor", createdAt: iso(120), isSample: true },
  ];
  const workspaces: Workspace[] = [
    {
      id: "ws_sample",
      name: "Nova Bottle (Sample Workspace)",
      industry: "Consumer goods",
      website: "https://novabottle.example",
      language: "English (UK)",
      createdAt: iso(120),
      isSample: true,
    },
  ];
  const memberships: Membership[] = [
    { id: uid("mbr"), workspaceId: "ws_sample", userId: "u_demo", role: "ADMIN" },
    { id: uid("mbr"), workspaceId: "ws_sample", userId: "u_reviewer", role: "REVIEWER" },
    { id: uid("mbr"), workspaceId: "ws_sample", userId: "u_editor", role: "EDITOR" },
  ];
  return { users, workspaces, memberships };
}

function seedBrand(): Brand {
  return {
    id: "br_nova",
    workspaceId: "ws_sample",
    name: "Nova Bottle",
    description:
      "Nova Bottle makes double-wall insulated stainless steel water bottles for everyday carry. All public claims must trace back to approved product documentation.",
    industry: "Consumer goods — drinkware",
    audience: "Commuters, hikers and office workers aged 25–45 who buy direct-to-consumer.",
    mission: "Help people drink more water with bottles that keep drinks at temperature all day.",
    personality: "Friendly, practical, evidence-first, quietly confident.",
    writingStyle: "Plain English, short sentences, concrete numbers, no hype.",
    wordsToUse: ["insulated", "keeps cold", "up to", "stainless steel", "BPA-free"],
    wordsAvoid: ["world-class", "revolutionary", "miracle", "toxic", "chemical-laden"],
    language: "English (UK)",
    website: "https://novabottle.example",
    tone: {
      formality: 55,
      friendliness: 75,
      conciseness: 70,
      technicality: 35,
      sentenceStyle: "varied",
      preferredTerms: ["Nova Bottle", "insulated bottle", "keeps cold for up to"],
      avoidPhrases: ["world's best", "best-in-class", "guaranteed to", "100% risk-free"],
    },
    createdAt: iso(120),
    updatedAt: iso(6),
    isSample: true,
  };
}

function seedRules(brandId: string): BrandRule[] {
  const base = { brandId, origin: "manual" as const, status: "active" as const, contentTypes: [] as never[] };
  return [
    {
      ...base,
      id: "rule_superlative",
      title: "Avoid Unsupported Superlatives",
      description:
        'Do not use claims such as "world\'s best", "best-selling" or "number one" unless supported by an approved, current source.',
      category: "Accuracy",
      severity: "high",
      sourceRef: "Nova Bottle Brand Guidelines.pdf — p.4",
      updatedAt: iso(30),
      isSample: true,
    },
    {
      ...base,
      id: "rule_tone",
      title: "Maintain Friendly Professional Tone",
      description:
        "Use clear, helpful, professional language without unnecessary exaggeration or hype.",
      category: "Tone",
      severity: "medium",
      sourceRef: "Nova Bottle Brand Guidelines.pdf — p.2",
      updatedAt: iso(45),
      isSample: true,
    },
    {
      ...base,
      id: "rule_specs",
      title: "Verify Product Specifications",
      description:
        "Product performance and specification claims must match approved product documentation.",
      category: "Accuracy",
      severity: "high",
      sourceRef: "Nova Bottle Product Specification.pdf",
      updatedAt: iso(20),
      isSample: true,
    },
    {
      ...base,
      id: "rule_disclaimer",
      title: "Include Required Performance Disclaimer",
      description:
        "Any claim about insulation duration must appear alongside the approved performance disclaimer.",
      category: "Required Disclaimers",
      severity: "medium",
      sourceRef: "Nova Bottle Brand Guidelines.pdf — p.6",
      updatedAt: iso(12),
      isSample: true,
    },
    {
      ...base,
      id: "rule_terminology",
      title: "Use Approved Product Naming",
      description:
        'Refer to the product as "Nova Bottle" on first mention. Do not invent model names or sizes that are not approved.',
      category: "Terminology",
      severity: "medium",
      sourceRef: "Nova Bottle Brand Guidelines.pdf — p.3",
      updatedAt: iso(38),
      isSample: true,
    },
    {
      ...base,
      id: "rule_access",
      title: "Keep Sentences Short and Readable",
      description:
        "Keep sentences under 28 words and avoid dense clauses so content stays accessible.",
      category: "Accessibility",
      severity: "low",
      sourceRef: "Style annex — readability",
      updatedAt: iso(50),
      isSample: true,
    },
    {
      ...base,
      id: "rule_no_guarantees",
      title: "No Universal Guarantees",
      description:
        'Do not promise outcomes for every customer, e.g. "guarantees the best experience for everyone".',
      category: "Compliance",
      severity: "critical",
      sourceRef: "Claims policy — v2",
      updatedAt: iso(9),
      isSample: true,
    },
  ];
}

function seedFacts(brandId: string): ApprovedFact[] {
  return [
    {
      id: "fact_capacity",
      brandId,
      title: "Approved bottle capacity",
      value: "750 ml",
      description: "Fill capacity of the standard Nova Bottle.",
      category: "Specification",
      numericValue: 750,
      unit: "ml",
      sourceLabel: "Nova Bottle Product Specification.pdf — p.2",
      sourceDocId: "doc_spec",
      verificationStatus: "verified",
      lastVerifiedAt: iso(20),
      owner: "Demo User",
      isSample: true,
    },
    {
      id: "fact_insulation",
      brandId,
      title: "Approved insulation duration",
      value: "48 hours",
      description: "Cold retention when filled to capacity and sealed.",
      category: "Performance",
      numericValue: 48,
      unit: "hours",
      sourceLabel: "Nova Bottle Product Specification.pdf — p.2",
      sourceDocId: "doc_spec",
      verificationStatus: "verified",
      lastVerifiedAt: iso(20),
      owner: "Demo User",
      isSample: true,
    },
    {
      id: "fact_weight",
      brandId,
      title: "Empty bottle weight",
      value: "340 g",
      description: "Weight of the empty 750 ml bottle with cap.",
      category: "Specification",
      numericValue: 340,
      unit: "g",
      sourceLabel: "Nova Bottle Product Specification.pdf — p.3",
      sourceDocId: "doc_spec",
      verificationStatus: "verified",
      lastVerifiedAt: iso(45),
      owner: "Demo User",
      isSample: true,
    },
    {
      id: "fact_price",
      brandId,
      title: "Standard retail price",
      value: "£24.99",
      description: "Recommended retail price, single bottle.",
      category: "Pricing",
      numericValue: 24.99,
      unit: "GBP",
      sourceLabel: "Nova Bottle Q3 Price List.docx",
      sourceDocId: "doc_price",
      verificationStatus: "verified",
      lastVerifiedAt: iso(70),
      expiresAt: iso(-14),
      owner: "Demo User",
      isSample: true,
    },
    {
      id: "fact_warranty",
      brandId,
      title: "Warranty period",
      value: "24 months",
      description: "Manufacturer warranty from date of purchase.",
      category: "Warranty",
      numericValue: 24,
      unit: "months",
      sourceLabel: "Nova Bottle Product Specification.pdf — p.5",
      sourceDocId: "doc_spec",
      verificationStatus: "verified",
      lastVerifiedAt: iso(60),
      owner: "Demo User",
      isSample: true,
    },
    {
      id: "fact_materials",
      brandId,
      title: "Body material",
      value: "18/8 stainless steel, double-wall vacuum insulated",
      description: "Contact-safe materials, BPA-free lid.",
      category: "Specification",
      sourceLabel: "Nova Bottle Product Specification.pdf — p.3",
      sourceDocId: "doc_spec",
      verificationStatus: "verified",
      lastVerifiedAt: iso(35),
      owner: "Demo User",
      isSample: true,
    },
    {
      id: "fact_launch",
      brandId,
      title: "Winter campaign window",
      value: "3 – 24 December",
      description: "Approved promotional window for the winter campaign.",
      category: "Dates & campaigns",
      sourceLabel: "Winter Campaign Brief.docx",
      sourceDocId: "doc_brief",
      verificationStatus: "verified",
      lastVerifiedAt: iso(10),
      expiresAt: iso(-40),
      owner: "Demo User",
      isSample: true,
    },
    {
      id: "fact_leak",
      brandId,
      title: "Leakproof testing status",
      value: "Internal lab test only — not certified by a third party",
      description: "Do not present leakproofing as independently certified.",
      category: "Performance",
      sourceLabel: "Internal test memo (unverified)",
      verificationStatus: "unverified",
      lastVerifiedAt: iso(150),
      owner: "Unassigned",
      isSample: true,
    },
  ];
}

function seedDocuments(brandId: string): BrandDocument[] {
  return [
    {
      id: "doc_spec",
      brandId,
      filename: "Nova Bottle Product Specification.pdf",
      kind: "pdf",
      size: 184320,
      uploadedAt: iso(60),
      processingStatus: "processed",
      extracted: true,
      passages: [
        { id: uid("psg"), ref: "p.2", text: "Capacity: 750 ml. Cold retention: up to 48 hours when filled to capacity and sealed at room temperature." },
        { id: uid("psg"), ref: "p.3", text: "Body: 18/8 stainless steel with double-wall vacuum insulation. Empty weight: 340 g including cap." },
        { id: uid("psg"), ref: "p.5", text: "Warranty: 24 months from date of purchase against manufacturing defects." },
      ],
      isSample: true,
    },
    {
      id: "doc_guidelines",
      brandId,
      filename: "Nova Bottle Brand Guidelines.pdf",
      kind: "pdf",
      size: 241152,
      uploadedAt: iso(60),
      processingStatus: "processed",
      extracted: true,
      passages: [
        { id: uid("psg"), ref: "p.2", text: "Tone: friendly, professional, clear and informative. Avoid hype and exaggerated claims." },
        { id: uid("psg"), ref: "p.4", text: 'Superlatives such as "world\'s best" or "best-selling" require an approved, dated market source before use.' },
        { id: uid("psg"), ref: "p.6", text: "Performance claims must be accompanied by: 'Performance varies with ambient temperature, fill volume and usage.'" },
      ],
      isSample: true,
    },
    {
      id: "doc_price",
      brandId,
      filename: "Nova Bottle Q3 Price List.docx",
      kind: "docx",
      size: 18432,
      uploadedAt: iso(72),
      processingStatus: "processed",
      extracted: true,
      passages: [
        { id: uid("psg"), ref: "¶1", text: "Standard RRP: £24.99 per bottle. Trade price: £16.50 at 24 units." },
      ],
      isSample: true,
    },
    {
      id: "doc_brief",
      brandId,
      filename: "Winter Campaign Brief.docx",
      kind: "docx",
      size: 12288,
      uploadedAt: iso(12),
      processingStatus: "processed",
      extracted: true,
      passages: [
        { id: uid("psg"), ref: "¶3", text: "Campaign runs 3–24 December. Core message: 'Cold for your whole day.' Approved CTA: 'Shop the winter drop'." },
      ],
      isSample: true,
    },
    {
      id: "doc_failed",
      brandId,
      filename: "Vendor Certificates.pdf",
      kind: "pdf",
      size: 2891776,
      uploadedAt: iso(5),
      processingStatus: "failed",
      extracted: false,
      passages: [],
      error:
        "Text extraction failed: no readable text layer found (the file looks like a scanned image). Re-upload an OCR-readable PDF or a TXT/DOCX version.",
      isSample: true,
    },
  ];
}

function seedAssets(brandId: string): BrandAsset[] {
  return [
    {
      id: uid("ast"),
      brandId,
      kind: "primary_logo",
      name: "Nova Bottle — primary wordmark",
      dataUrl: logoSvg("Nova Bottle", "#22D3EE"),
      note: "Primary logo on dark backgrounds.",
      uploadedAt: iso(60),
      isSample: true,
    },
    {
      id: uid("ast"),
      brandId,
      kind: "secondary_logo",
      name: "Nova Bottle — indigo variant",
      dataUrl: logoSvg("Nova", "#6366F1"),
      note: "Secondary variant for co-branded placements.",
      uploadedAt: iso(60),
      isSample: true,
    },
    {
      id: uid("ast"),
      brandId,
      kind: "palette",
      name: "Brand colour palette",
      palette: ["#0EA5E9", "#0B1020", "#F8FAFC", "#22C55E", "#F59E0B"],
      note: "Approved colours for marketing creative.",
      uploadedAt: iso(58),
      isSample: true,
    },
    {
      id: uid("ast"),
      brandId,
      kind: "typography",
      name: "Typography guidance",
      note: "Headlines: Inter SemiBold, sentence case. Body: Inter Regular, minimum 16 px, contrast ratio ≥ 4.5:1.",
      uploadedAt: iso(58),
      isSample: true,
    },
  ];
}

function seedDisclaimers(brandId: string): Disclaimer[] {
  return [
    {
      id: uid("dis"),
      brandId,
      text: "Performance varies with ambient temperature, fill volume and usage.",
      when: "Whenever insulation duration or temperature retention is mentioned.",
      appliesTo: ["Advertisement", "Product description", "Website copy", "Social media post", "Marketing email"],
      severity: "medium",
      mandatory: true,
      isSample: true,
    },
    {
      id: uid("dis"),
      brandId,
      text: "Prices include VAT and may change without notice.",
      when: "Whenever a price is displayed.",
      appliesTo: ["Advertisement", "Website copy", "Marketing email"],
      severity: "low",
      mandatory: true,
      isSample: true,
    },
  ];
}

function seedCampaigns(): Campaign[] {
  return [
    {
      id: "cmp_winter",
      workspaceId: "ws_sample",
      brandId: "br_nova",
      name: "Winter Product Launch",
      status: "active",
      approvedMessages: [
        "Cold for your whole day.",
        "750 ml capacity, cold for up to 48 hours.",
        "Shop the winter drop",
      ],
      auditIds: ["aud_winter_email", "aud_winter_social"],
      createdAt: iso(12),
      isSample: true,
    },
  ];
}

interface SeedAuditSpec {
  id: string;
  title: string;
  contentType: Audit["contentType"];
  content: string;
  campaignName?: string;
  daysAgo: number;
  status: Audit["status"];
  findings: Partial<Audit["findings"][number]>[];
  reviewerId?: string;
  rewrite?: boolean;
  createdBy?: string;
}

function buildFinding(auditId: string, i: number, f: Partial<Audit["findings"][number]>) {
  return {
    id: f.id ?? `${auditId}_f${i + 1}`,
    auditId,
    category: f.category ?? "rule_violation",
    severity: f.severity ?? "medium",
    verificationStatus: f.verificationStatus ?? "NEEDS_REVIEW",
    originalExcerpt: f.originalExcerpt ?? "",
    explanation: f.explanation ?? "",
    evidence: f.evidence ?? [],
    matchedRuleIds: f.matchedRuleIds ?? [],
    suggestedCorrection: f.suggestedCorrection,
    suggestedAction: f.suggestedAction,
    confidence: f.confidence ?? 0.6,
    requiresHumanReview: f.requiresHumanReview ?? true,
    reviewStatus: f.reviewStatus ?? "open",
    resolutionNote: f.resolutionNote,
    falsePositiveReason: f.falsePositiveReason,
    comments: f.comments ?? [],
    assigneeId: f.assigneeId,
    charStart: f.charStart,
    charEnd: f.charEnd,
  };
}

function seedAudits(): Audit[] {
  const specs: SeedAuditSpec[] = [
    {
      id: "aud_winter_email",
      title: "Winter launch — email blast v2",
      contentType: "Marketing email",
      campaignName: "Winter Product Launch",
      content:
        "The Nova Bottle keeps drinks cold for 72 hours, and at just £19.99 it is the best value insulated bottle this winter. Buy now with free returns.",
      daysAgo: 6,
      status: "needs_review",
      createdBy: "u_editor",
      reviewerId: "u_reviewer",
      findings: [
        {
          category: "factual_accuracy",
          severity: "high",
          verificationStatus: "CONTRADICTED",
          originalExcerpt: "keeps drinks cold for 72 hours",
          explanation:
            "The submitted duration is 72 hours. The approved specification states 48 hours of cold retention.",
          evidence: [
            {
              type: "fact",
              refId: "fact_insulation",
              label: "Approved insulation duration — 48 hours",
              sourceLabel: "Nova Bottle Product Specification.pdf — p.2",
              passage: "Cold retention: up to 48 hours when filled to capacity and sealed at room temperature.",
            },
          ],
          matchedRuleIds: ["rule_specs"],
          suggestedCorrection: "keeps drinks cold for up to 48 hours",
          confidence: 0.95,
          reviewStatus: "accepted",
          resolutionNote: "Correction applied in v2.",
        },
        {
          category: "factual_accuracy",
          severity: "high",
          verificationStatus: "CONTRADICTED",
          originalExcerpt: "at just £19.99",
          explanation: "The submitted price is £19.99. The approved retail price is £24.99.",
          evidence: [
            {
              type: "fact",
              refId: "fact_price",
              label: "Standard retail price — £24.99",
              sourceLabel: "Nova Bottle Q3 Price List.docx",
              passage: "Standard RRP: £24.99 per bottle.",
            },
          ],
          matchedRuleIds: ["rule_specs"],
          suggestedCorrection: "at just £24.99",
          confidence: 0.92,
          reviewStatus: "open",
        },
        {
          category: "unsupported_claim",
          severity: "high",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: "the best value insulated bottle this winter",
          explanation:
            "No approved sales, pricing comparison or market source is available to support a 'best value' comparison.",
          evidence: [{ type: "none" }],
          matchedRuleIds: ["rule_superlative"],
          suggestedAction: "Provide an approved comparison source or remove the superlative.",
          confidence: 0.78,
          reviewStatus: "open",
        },
        {
          category: "disclaimer",
          severity: "medium",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: "keeps drinks cold for 72 hours",
          explanation:
            "Insulation duration is mentioned without the required performance disclaimer.",
          evidence: [
            { type: "rule", refId: "rule_disclaimer", label: "Include Required Performance Disclaimer" },
          ],
          matchedRuleIds: ["rule_disclaimer"],
          suggestedCorrection: "Performance varies with ambient temperature, fill volume and usage.",
          confidence: 0.9,
          reviewStatus: "accepted",
        },
        {
          category: "factual_accuracy",
          severity: "low",
          verificationStatus: "SUPPORTED",
          originalExcerpt: "free returns",
          explanation: "Returns policy statement matches the approved campaign brief messaging.",
          evidence: [
            { type: "campaign", refId: "cmp_winter", label: "Winter Product Launch — approved messages" },
          ],
          matchedRuleIds: [],
          confidence: 0.7,
          reviewStatus: "reviewed",
        },
      ],
    },
    {
      id: "aud_winter_social",
      title: "Instagram — chill day promo",
      contentType: "Social media post",
      campaignName: "Winter Product Launch",
      content:
        "Cold for your whole day. The Nova Bottle holds 750 ml and stays cold for up to 48 hours. Performance varies with ambient temperature, fill volume and usage. Shop the winter drop.",
      daysAgo: 4,
      status: "approved",
      createdBy: "u_editor",
      reviewerId: "u_reviewer",
      findings: [
        {
          category: "factual_accuracy",
          severity: "high",
          verificationStatus: "SUPPORTED",
          originalExcerpt: "holds 750 ml and stays cold for up to 48 hours",
          explanation: "Both values match approved specifications in the product documentation.",
          evidence: [
            {
              type: "fact",
              refId: "fact_capacity",
              label: "Approved bottle capacity — 750 ml",
              sourceLabel: "Nova Bottle Product Specification.pdf — p.2",
              passage: "Capacity: 750 ml.",
            },
            {
              type: "fact",
              refId: "fact_insulation",
              label: "Approved insulation duration — 48 hours",
              sourceLabel: "Nova Bottle Product Specification.pdf — p.2",
              passage: "Cold retention: up to 48 hours when filled to capacity and sealed at room temperature.",
            },
          ],
          matchedRuleIds: ["rule_specs"],
          confidence: 0.97,
          reviewStatus: "resolved",
        },
        {
          category: "disclaimer",
          severity: "medium",
          verificationStatus: "SUPPORTED",
          originalExcerpt: "Performance varies with ambient temperature, fill volume and usage.",
          explanation: "The required performance disclaimer is present.",
          evidence: [{ type: "rule", refId: "rule_disclaimer", label: "Include Required Performance Disclaimer" }],
          matchedRuleIds: ["rule_disclaimer"],
          confidence: 0.99,
          reviewStatus: "resolved",
        },
      ],
    },
    {
      id: "aud_pdp_hero",
      title: "Product page — hero copy refresh",
      contentType: "Website copy",
      content:
        "Meet the Nova Bottle: a revolutionary, chemical-free bottle that is 100% guaranteed to keep you hydrated all day long, every day.",
      daysAgo: 11,
      status: "needs_review",
      createdBy: "u_editor",
      reviewerId: "u_reviewer",
      findings: [
        {
          category: "unsupported_claim",
          severity: "critical",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: "100% guaranteed to keep you hydrated all day long, every day",
          explanation:
            "A universal guarantee cannot be verified with the available approved evidence and conflicts with the claims policy.",
          evidence: [{ type: "rule", refId: "rule_no_guarantees", label: "No Universal Guarantees" }],
          matchedRuleIds: ["rule_no_guarantees"],
          suggestedAction: "Replace with a specific, sourced statement about insulation performance.",
          confidence: 0.88,
          reviewStatus: "open",
          assigneeId: "u_reviewer",
        },
        {
          category: "terminology",
          severity: "medium",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: "chemical-free bottle",
          explanation:
            'All materials are chemicals; the approved claim is "BPA-free, 18/8 stainless steel". The wording is imprecise and unapproved.',
          evidence: [
            {
              type: "fact",
              refId: "fact_materials",
              label: "Body material — 18/8 stainless steel",
              sourceLabel: "Nova Bottle Product Specification.pdf — p.3",
              passage: "Body: 18/8 stainless steel with double-wall vacuum insulation.",
            },
          ],
          matchedRuleIds: ["rule_terminology"],
          suggestedCorrection: "a BPA-free bottle made from 18/8 stainless steel",
          confidence: 0.81,
          reviewStatus: "open",
        },
        {
          category: "tone",
          severity: "medium",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: "revolutionary",
          explanation: "The tone profile avoids hype language; this word appears on the brand's avoid list.",
          evidence: [{ type: "rule", refId: "rule_tone", label: "Maintain Friendly Professional Tone" }],
          matchedRuleIds: ["rule_tone"],
          suggestedCorrection: "thoughtfully designed",
          confidence: 0.74,
          reviewStatus: "rejected",
          falsePositiveReason: "Product team wants to keep this word for the launch.",
        },
      ],
    },
    {
      id: "aud_paid_search",
      title: "Paid search — winter ad variations",
      contentType: "Advertisement",
      campaignName: "Winter Product Launch",
      content:
        "Nova Bottle: 750 ml of cold for up to 48 hours. Winter price £24.99. Shop the winter drop.",
      daysAgo: 3,
      status: "approved",
      createdBy: "u_editor",
      reviewerId: "u_reviewer",
      findings: [
        {
          category: "disclaimer",
          severity: "low",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: "Winter price £24.99",
          explanation: "A price is displayed; the approved price disclaimer was not included in this variation.",
          evidence: [{ type: "rule", refId: "rule_disclaimer", label: "Include Required Performance Disclaimer" }],
          matchedRuleIds: ["rule_disclaimer"],
          suggestedCorrection: "Prices include VAT and may change without notice.",
          confidence: 0.85,
          reviewStatus: "resolved",
          resolutionNote: "Disclaimer added in final ad variation.",
        },
      ],
    },
    {
      id: "aud_blog_draft",
      title: "Blog — how insulation works (draft)",
      contentType: "Blog article",
      content:
        "Double-wall vacuum insulation slows heat transfer, so your drink stays at temperature far longer than a standard cup.",
      daysAgo: 1,
      status: "in_progress",
      createdBy: "u_demo",
      findings: [
        {
          category: "accessibility",
          severity: "low",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: "slows heat transfer",
          explanation:
            "The phrase may be unfamiliar to general readers; a short plain-language explanation would improve accessibility.",
          evidence: [{ type: "rule", refId: "rule_access", label: "Keep Sentences Short and Readable" }],
          matchedRuleIds: ["rule_access"],
          suggestedCorrection: "traps heat outside the bottle, so your drink stays at temperature",
          confidence: 0.6,
          reviewStatus: "open",
        },
      ],
    },
    {
      id: "aud_wholesale",
      title: "Wholesale one-pager — distributor version",
      contentType: "General marketing content",
      content:
        "Distributors receive 24-month warranty cover and trade pricing from £16.50 per unit.",
      daysAgo: 26,
      status: "draft",
      createdBy: "u_editor",
      findings: [
        {
          category: "factual_accuracy",
          severity: "medium",
          verificationStatus: "SUPPORTED",
          originalExcerpt: "24-month warranty cover",
          explanation: "Matches the approved warranty period in the product specification.",
          evidence: [
            {
              type: "fact",
              refId: "fact_warranty",
              label: "Warranty period — 24 months",
              sourceLabel: "Nova Bottle Product Specification.pdf — p.5",
              passage: "Warranty: 24 months from date of purchase against manufacturing defects.",
            },
          ],
          matchedRuleIds: ["rule_specs"],
          confidence: 0.93,
          reviewStatus: "reviewed",
        },
      ],
    },
  ];

  return specs.map((s) => {
    const createdAt = iso(s.daysAgo);
    const findings = s.findings.map((f, i) => buildFinding(s.id, i, f));
    const contradicted = findings.filter((f) => f.verificationStatus === "CONTRADICTED").length;
    const high = findings.filter((f) => f.severity === "critical" || f.severity === "high").length;
    return {
      id: s.id,
      workspaceId: "ws_sample",
      brandId: "br_nova",
      title: s.title,
      contentType: s.contentType,
      campaignName: s.campaignName,
      audience: "UK adults 25–45",
      language: "English (UK)",
      content: s.content,
      revisedContent: s.rewrite
        ? s.content
        : s.id === "aud_winter_email"
          ? "The Nova Bottle keeps drinks cold for up to 48 hours, and at just £24.99 it is a competitively priced insulated bottle this winter. Buy now with free returns."
          : undefined,
      version: s.status === "approved" || s.id === "aud_winter_email" ? 2 : 1,
      status: s.status,
      checks: [
        "brand_rules",
        "factual_verification",
        "tone",
        "unsupported_claims",
        "terminology",
        "disclaimers",
        "accessibility",
      ],
      findings,
      checksRun: [
        { category: "brand_rules", status: "completed", summary: `${findings.length} findings across active brand rules.` },
        { category: "factual_verification", status: "completed", summary: "Measurable claims compared with approved facts." },
        { category: "tone", status: "completed", summary: "Tone profile compared with the configured settings." },
      ],
      limitations:
        s.id === "aud_wholesale"
          ? ["No AI provider configured — deterministic rule matching only."]
          : [],
      score: {
        score: Math.max(0, 100 - findings.reduce((acc, f) => acc + (f.severity === "critical" ? 18 : f.severity === "high" ? 12 : f.severity === "medium" ? 7 : f.severity === "low" ? 3 : 1), 0)),
        reason: "100 minus severity-weighted findings; capped at 0.",
        factors: [
          { label: "Findings", detail: `${findings.length}` },
          { label: "High or critical", detail: `${high}` },
          { label: "Contradicted claims", detail: `${contradicted}` },
        ],
      },
      analysisMode: "deterministic",
      resultLabel: "Sample workspace data — deterministic rule engine (no AI provider configured).",
      riskLevel: high > 0 ? (findings.some((f) => f.severity === "critical") ? "critical" : "high") : findings.length ? "medium" : "clear",
      summaryText: `${findings.length} finding(s) recorded for this sample audit.`,
      createdBy: s.createdBy ?? "u_demo",
      createdAt,
      updatedAt: createdAt,
      reviewerId: s.reviewerId,
      isSample: true,
    } satisfies Audit;
  });
}

function seedApprovals(audits: Audit[]): Approval[] {
  const email = audits.find((a) => a.id === "aud_winter_email")!;
  const social = audits.find((a) => a.id === "aud_winter_social")!;
  const pdp = audits.find((a) => a.id === "aud_pdp_hero")!;
  return [
    {
      id: "apr_email",
      auditId: email.id,
      workspaceId: "ws_sample",
      status: "pending_review",
      submitterId: "u_editor",
      submitterName: "Sam Rivera",
      reviewerId: "u_reviewer",
      reviewerName: "Jordan Blake",
      submittedAt: iso(5),
      updatedAt: iso(5),
      contentVersion: 2,
      comments: [
        {
          id: uid("cmt"),
          authorId: "u_editor",
          authorName: "Sam Rivera",
          role: "EDITOR",
          body: "Spec and price corrected against the approved documents. Ready for review.",
          at: iso(5),
          kind: "comment",
        },
      ],
      decisions: [],
      checklist: [],
      history: [{ at: iso(5), label: "Submitted for review", by: "Sam Rivera" }],
      isSample: true,
    },
    {
      id: "apr_social",
      auditId: social.id,
      workspaceId: "ws_sample",
      status: "approved",
      submitterId: "u_editor",
      submitterName: "Sam Rivera",
      reviewerId: "u_reviewer",
      reviewerName: "Jordan Blake",
      submittedAt: iso(4),
      updatedAt: iso(4),
      contentVersion: 2,
      comments: [],
      decisions: [
        {
          id: uid("dec"),
          decision: "approve",
          reviewerId: "u_reviewer",
          reviewerName: "Jordan Blake",
          at: iso(4),
          comment: "All findings resolved, disclaimer present, claims match approved specs.",
          auditVersion: 2,
          unresolvedAtDecision: 0,
        },
      ],
      checklist: [],
      history: [
        { at: iso(4), label: "Submitted for review", by: "Sam Rivera" },
        { at: iso(4), label: "Approved", by: "Jordan Blake" },
      ],
      isSample: true,
    },
    {
      id: "apr_pdp",
      auditId: pdp.id,
      workspaceId: "ws_sample",
      status: "changes_requested",
      submitterId: "u_editor",
      submitterName: "Sam Rivera",
      reviewerId: "u_reviewer",
      reviewerName: "Jordan Blake",
      submittedAt: iso(10),
      updatedAt: iso(9),
      contentVersion: 1,
      comments: [
        {
          id: uid("cmt"),
          authorId: "u_reviewer",
          authorName: "Jordan Blake",
          role: "REVIEWER",
          body: "Remove the universal guarantee and replace 'chemical-free' with the approved material claim.",
          at: iso(9),
          kind: "decision",
        },
      ],
      decisions: [
        {
          id: uid("dec"),
          decision: "request_changes",
          reviewerId: "u_reviewer",
          reviewerName: "Jordan Blake",
          at: iso(9),
          comment: "Remove the universal guarantee and replace 'chemical-free' with the approved material claim.",
          auditVersion: 1,
          unresolvedAtDecision: 3,
        },
      ],
      checklist: [],
      history: [
        { at: iso(10), label: "Submitted for review", by: "Sam Rivera" },
        { at: iso(9), label: "Changes requested", by: "Jordan Blake" },
      ],
      isSample: true,
    },
  ];
}

function seedActivity(): ActivityEvent[] {
  const rows: Array<[string, string, ActivityEvent["resourceType"], string, string, number]> = [
    ["audit_completed", "u_demo", "audit", "aud_paid_search", "Audit completed — Paid search — winter ad variations", 3],
    ["submitted", "u_editor", "approval", "apr_email", "Content submitted for approval — Winter launch email blast v2", 5],
    ["finding_accepted", "u_editor", "audit", "aud_winter_email", "Finding accepted — insulation duration corrected to 48 hours", 6],
    ["approved", "u_reviewer", "approval", "apr_social", "Reviewer approved — Instagram chill day promo", 4],
    ["changes_requested", "u_reviewer", "approval", "apr_pdp", "Changes requested — Product page hero copy", 9],
    ["rule_created", "u_demo", "rule", "rule_no_guarantees", "Brand rule added — No Universal Guarantees", 9],
    ["fact_flagged", "u_demo", "fact", "fact_price", "Fact flagged for review — Standard retail price expired", 14],
    ["document_failed", "u_demo", "document", "doc_failed", "Document processing failed — Vendor Certificates.pdf", 5],
    ["audit_completed", "u_editor", "audit", "aud_pdp_hero", "Audit completed — Product page hero copy refresh", 11],
    ["fact_updated", "u_demo", "fact", "fact_launch", "Approved fact updated — Winter campaign window", 10],
  ];
  return rows.map(([action, userId, resourceType, resourceId, label, daysAgo]) => ({
    id: uid("act"),
    workspaceId: "ws_sample",
    userId,
    userName: userId === "u_reviewer" ? "Jordan Blake" : userId === "u_editor" ? "Sam Rivera" : "Demo User",
    action,
    resourceType,
    resourceId,
    label,
    at: iso(daysAgo),
    isSample: true,
  }));
}

function seedNotifications(): AppNotification[] {
  return [
    {
      id: uid("ntf"),
      workspaceId: "ws_sample",
      type: "review_requested",
      title: "Review requested",
      body: "Winter launch — email blast v2 is waiting for your decision.",
      link: "/app/approvals/apr_email",
      at: iso(5),
      read: false,
      isSample: true,
    },
    {
      id: uid("ntf"),
      workspaceId: "ws_sample",
      type: "high_severity",
      title: "High-severity finding detected",
      body: "Product page hero copy contains an unverifiable universal guarantee.",
      link: "/app/audits/aud_pdp_hero",
      at: iso(11),
      read: false,
      isSample: true,
    },
    {
      id: uid("ntf"),
      workspaceId: "ws_sample",
      type: "fact_review",
      title: "Approved fact needs verification",
      body: "Standard retail price passed its expiration date and should be re-verified.",
      link: "/app/brand?tab=facts",
      at: iso(14),
      read: true,
      isSample: true,
    },
    {
      id: uid("ntf"),
      workspaceId: "ws_sample",
      type: "approved",
      title: "Content approved",
      body: "Instagram — chill day promo was approved by Jordan Blake.",
      link: "/app/approvals/apr_social",
      at: iso(4),
      read: true,
      isSample: true,
    },
  ];
}

export function createSeedState(): AppState {
  const { users, workspaces, memberships } = seedUsers();
  const brand = seedBrand();
  const rules = seedRules(brand.id);
  const facts = seedFacts(brand.id);
  const documents = seedDocuments(brand.id);
  const assets = seedAssets(brand.id);
  const disclaimers = seedDisclaimers(brand.id);
  const campaigns = seedCampaigns();
  const audits = seedAudits();
  const approvals = seedApprovals(audits);

  return {
    version: 1,
    session: null,
    users,
    workspaces,
    memberships,
    brands: [brand],
    rules,
    facts,
    documents,
    assets,
    disclaimers,
    audits,
    rewrites: [],
    approvals,
    campaigns,
    activity: seedActivity(),
    notifications: seedNotifications(),
    visuals: [],
    checklistConfig: [
      { key: "rules", label: "Brand rules checked", required: true },
      { key: "facts", label: "Relevant facts verified", required: true },
      { key: "high", label: "High-severity findings resolved", required: true },
      { key: "disclaimers", label: "Required disclaimers present", required: true },
      { key: "tone", label: "Tone reviewed", required: false },
      { key: "accessibility", label: "Accessibility checks completed", required: false },
      { key: "visual", label: "Visual assets reviewed", required: false },
      { key: "audited", label: "Final content audited", required: true },
      { key: "human", label: "Human approval recorded", required: true },
    ],
    onboarded: true,
    roleOverride: null,
  };
}
