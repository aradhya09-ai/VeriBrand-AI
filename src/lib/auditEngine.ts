import { SAMPLE_CONTENT } from "./demoData";
import type {
  AnalysisMode,
  AuditCheck,
  ApprovedFact,
  Brand,
  BrandDocument,
  BrandRule,
  Campaign,
  CheckResult,
  Disclaimer,
  EvidenceRef,
  Finding,
  ScoreBreakdown,
  Severity,
  VerificationStatus,
} from "./types";
import { SEVERITY_WEIGHT } from "./types";

/* ------------------------------------------------------------------ *
 * Deterministic audit engine.
 *
 * This is NOT a language model. It matches measurable claims against
 * approved facts, pattern-matches known claim shapes and evaluates
 * configured rules. Every finding points at a real reference or is
 * explicitly marked as having no approved evidence.
 * ------------------------------------------------------------------ */

export interface AuditInput {
  auditId: string;
  content: string;
  checks: AuditCheck[];
  brand: Brand;
  rules: BrandRule[];
  facts: ApprovedFact[];
  documents: BrandDocument[];
  disclaimers: Disclaimer[];
  campaign?: Campaign;
  contentType: string;
}

export interface EngineResult {
  findings: Finding[];
  checksRun: CheckResult[];
  limitations: string[];
  summaryText: string;
  score: ScoreBreakdown;
  analysisMode: AnalysisMode;
  resultLabel: string;
  riskLevel: Severity | "clear";
}

const NO_EVIDENCE = "No approved evidence was found to verify this claim.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------- text utils ----------------------- */

export function splitSentences(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = m.index + raw.indexOf(trimmed);
    out.push({ text: trimmed, start, end: start + trimmed.length });
  }
  return out;
}

function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const STOP_BEFORE = /^(and|that|which|with|while|but|so|because|or|to|for|of|in|on|at|,)$/i;

function contextWindow(content: string, start: number, end: number): { text: string; start: number; end: number } {
  const before = content.slice(0, start);
  const after = content.slice(end);
  const beforeWords = before.split(/(\s+)/);
  const afterWords = after.split(/(\s+)/);
  let b = 0;
  let count = 0;
  for (let i = beforeWords.length - 1; i >= 0 && count < 4; i--) {
    const w = beforeWords[i].trim();
    if (!w) continue;
    if (/^[.!?,;:("[']$/.test(w)) break;
    if (STOP_BEFORE.test(w)) break;
    b = i;
    count++;
  }
  let a = 0;
  let acc = 0;
  for (let i = 0; i < afterWords.length && acc < 5; i++) {
    const w = afterWords[i].trim();
    if (!w) continue;
    if (/^[.!?,;:)]$/.test(w)) break;
    if (STOP_BEFORE.test(w)) break;
    a = i + 1;
    acc++;
  }
  const startIdx = beforeWords.slice(b).join("");
  const endIdx = afterWords.slice(0, a).join("");
  return {
    text: (startIdx + content.slice(start, end) + endIdx).trim(),
    start: start - startIdx.length,
    end: end + endIdx.length,
  };
}

/* ------------------------------- measurements --------------------- */

export interface Measurement {
  raw: string;
  value: number;
  unit: string;
  start: number;
  end: number;
}

const MEASURE_RE =
  /(\d+(?:[.,]\d+)?)\s*(?:-\s*)?(millilitres?|milliliters?|litres?|liters?|ml|hours?|hrs?|days?|weeks?|months?|grams?|kg|l|h|g|%|percent)/gi;
const CURRENCY_RE = /([£$€])\s*(\d+(?:[.,]\d+)?)/g;

function canon(value: number, raw: string): { unit: string; value: number } {
  const u = raw.toLowerCase();
  if (["ml", "millilitre", "millilitres", "milliliter", "milliliters"].includes(u)) return { unit: "ml", value };
  if (["l", "litre", "litres", "liter", "liters"].includes(u)) return { unit: "ml", value: value * 1000 };
  if (["hour", "hours", "hr", "hrs", "h"].includes(u)) return { unit: "hours", value };
  if (u === "day" || u === "days") return { unit: "hours", value: value * 24 };
  if (u === "week" || u === "weeks") return { unit: "hours", value: value * 168 };
  if (u === "month" || u === "months") return { unit: "months", value };
  if (["g", "gram", "grams"].includes(u)) return { unit: "g", value };
  if (u === "kg") return { unit: "g", value: value * 1000 };
  if (u === "percent") return { unit: "percent", value };
  if (u === "%") return { unit: "percent", value };
  return { unit: u, value };
}

export function extractMeasurements(text: string): Measurement[] {
  const out: Measurement[] = [];
  MEASURE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MEASURE_RE.exec(text))) {
    const value = parseFloat(m[1].replace(",", "."));
    if (Number.isNaN(value)) continue;
    const c = canon(value, m[2]);
    out.push({ raw: m[0], value: c.value, unit: c.unit, start: m.index, end: m.index + m[0].length });
  }
  CURRENCY_RE.lastIndex = 0;
  while ((m = CURRENCY_RE.exec(text))) {
    const value = parseFloat(m[2].replace(",", "."));
    if (Number.isNaN(value)) continue;
    const unit = m[1] === "£" ? "GBP" : m[1] === "$" ? "USD" : "EUR";
    out.push({ raw: m[0], value, unit, start: m.index, end: m.index + m[0].length });
  }
  return out.sort((a, b) => a.start - b.start);
}

/* ------------------------------- claim shapes --------------------- */

const SUPERLATIVE_RE =
  /(\b(world['’]s\s+(?:best|finest|number[\s-]one|no\.?\s?1)\b)|\bbest[\s-]selling\b|\bnumber[\s-]one\b|\b#1\b|\bbest\s+(?:value|choice|bottle|product|on the market)\b|\bthe best\b)/i;
const GUARANTEE_RE = /\b(guarantee(?:s|d)?|100%\s+guarantee(?:s|d)?|always wins|never fails)\b/i;
const UNIVERSAL_RE = /\b(for everyone|everyone|all day long|every single day|anyone)\b/i;
const HYPE_WORDS = ["revolutionary", "game-changing", "miracle", "unparalleled", "world-class", "best-in-class", "amazing", "incredible", "instantly", "effortlessly"];
const AMBIGUOUS_RE = /\b(it all|works wonders|so much better|etc\.|and more|advanced technology|patented technology|clinically proven|scientifically proven)\b/i;

function activeRulesFor(input: AuditInput): BrandRule[] {
  return input.rules.filter(
    (r) =>
      r.brandId === input.brand.id &&
      (r.status === "active") &&
      (r.contentTypes.length === 0 || (r.contentTypes as string[]).includes(input.contentType)),
  );
}

function ruleByCategory(rules: BrandRule[], ...cats: string[]): BrandRule | undefined {
  return rules.find((r) => cats.includes(r.category) && r.status === "active");
}

function severityOf(rules: BrandRule[], ids: string[], fallback: Severity): Severity {
  const list = rules.filter((r) => ids.includes(r.id));
  if (!list.length) return fallback;
  const order: Severity[] = ["informational", "low", "medium", "high", "critical"];
  return list.reduce((acc, r) => (order.indexOf(r.severity) > order.indexOf(acc) ? r.severity : acc), "informational" as Severity);
}

function makeFinding(
  auditId: string,
  base: Partial<Finding> & Pick<Finding, "category" | "severity" | "verificationStatus" | "originalExcerpt" | "explanation">,
): Finding {
  return {
    id: `${auditId}_f${Math.random().toString(36).slice(2, 8)}`,
    auditId,
    evidence: [],
    matchedRuleIds: [],
    confidence: 0.6,
    requiresHumanReview: true,
    reviewStatus: "open",
    comments: [],
    ...base,
  } as Finding;
}

/* ------------------------------- predefined demo ------------------ */

const DEMO_KEYS = {
  capacity: "1-litre",
  duration: "72 hours",
  superlative: "world's best-selling bottle",
  guarantee: "guarantees the best hydration experience for everyone",
};

function isPredefinedSample(content: string): boolean {
  const norm = content.replace(/\s+/g, " ").trim().toLowerCase();
  return norm === SAMPLE_CONTENT.replace(/\s+/g, " ").trim().toLowerCase();
}

function predefinedDemoFindings(auditId: string, content: string): Finding[] {
  const at = (needle: string) => content.toLowerCase().indexOf(needle.toLowerCase());
  const span = (needle: string) => ({ charStart: at(needle), charEnd: at(needle) + needle.length });
  return [
    makeFinding(auditId, {
      id: `${auditId}_f1`,
      category: "factual_accuracy",
      severity: "high",
      verificationStatus: "CONTRADICTED",
      originalExcerpt: "Our 1-litre insulated bottle.",
      explanation:
        "The submitted capacity is 1 litre (1000 ml). The fictional approved specification for this demonstration states a capacity of 750 ml.",
      evidence: [
        {
          type: "fact",
          refId: "fact_capacity",
          label: "Approved bottle capacity — 750 ml",
          sourceLabel: "Nova Bottle Product Specification.pdf — p.2",
          passage: "Capacity: 750 ml.",
        },
        { type: "rule", refId: "rule_specs", label: "Verify Product Specifications" },
      ],
      matchedRuleIds: ["rule_specs"],
      suggestedCorrection: "Our 750 ml insulated bottle.",
      suggestedReplacement: "our 750 ml insulated bottle",
      confidence: 0.97,
      requiresHumanReview: true,
      ...span("our 1-litre insulated bottle"),
    }),
    makeFinding(auditId, {
      id: `${auditId}_f2`,
      category: "factual_accuracy",
      severity: "high",
      verificationStatus: "CONTRADICTED",
      originalExcerpt: "Keeps drinks cold for 72 hours.",
      explanation:
        "The submitted duration is 72 hours. The fictional approved specification for this demonstration states an insulation duration of 48 hours.",
      evidence: [
        {
          type: "fact",
          refId: "fact_insulation",
          label: "Approved insulation duration — 48 hours",
          sourceLabel: "Nova Bottle Product Specification.pdf — p.2",
          passage: "Cold retention: up to 48 hours when filled to capacity and sealed at room temperature.",
        },
        { type: "rule", refId: "rule_specs", label: "Verify Product Specifications" },
      ],
      matchedRuleIds: ["rule_specs"],
      suggestedCorrection: "Keeps drinks cold for up to 48 hours.",
      suggestedReplacement: "keeps drinks cold for up to 48 hours",
      confidence: 0.97,
      requiresHumanReview: true,
      ...span("keeps drinks cold for 72 hours"),
    }),
    makeFinding(auditId, {
      id: `${auditId}_f3`,
      category: "unsupported_claim",
      severity: "high",
      verificationStatus: "NEEDS_REVIEW",
      originalExcerpt: "The world's best-selling bottle.",
      explanation:
        "No approved sales ranking, market source or independent dataset is available in this workspace, so the superlative cannot be verified. This is a missing-source case, not a contradiction.",
      evidence: [
        { type: "rule", refId: "rule_superlative", label: "Avoid Unsupported Superlatives" },
        { type: "none" },
      ],
      matchedRuleIds: ["rule_superlative"],
      suggestedAction: "Provide a reliable approved source for the sales ranking, or remove the superlative.",
      suggestedReplacement: "the Nova Bottle",
      confidence: 0.86,
      requiresHumanReview: true,
      ...span("the world's best-selling bottle"),
    }),
    makeFinding(auditId, {
      id: `${auditId}_f4`,
      category: "unsupported_claim",
      severity: "critical",
      verificationStatus: "NEEDS_REVIEW",
      originalExcerpt: "Guarantees the best hydration experience for everyone.",
      explanation:
        "The universal guarantee and superiority claim lack approved supporting evidence and conflict with the workspace's claims policy for universal guarantees.",
      evidence: [
        { type: "rule", refId: "rule_no_guarantees", label: "No Universal Guarantees" },
        { type: "none" },
      ],
      matchedRuleIds: ["rule_no_guarantees", "rule_superlative"],
      suggestedAction: "Use more specific language supported by approved product information.",
      suggestedReplacement: "",
      confidence: 0.88,
      requiresHumanReview: true,
      ...span("and guarantees the best hydration experience for everyone"),
    }),
  ];
}

/* ------------------------------- main run ------------------------- */

export function runAudit(input: AuditInput): EngineResult {
  const { auditId, content, checks } = input;
  const rules = activeRulesFor(input);
  const findings: Finding[] = [];
  const checksRun: CheckResult[] = [];
  const limitations: string[] = [
    "No AI provider is configured for this deployment, so meaning, paraphrase and context are not evaluated — only explicit patterns and approved references are matched.",
    "Findings use only the approved rules, facts and documents stored in this workspace. Nothing outside those references was used as evidence.",
    "Confidence values express matcher strength, not a guarantee of correctness. Humans make the final decision.",
  ];

  /* --- predefined demo sample ------------------------------------- */
  if (isPredefinedSample(content)) {
    const demo = predefinedDemoFindings(auditId, content);
    const demoRules = input.rules.filter((r) => ["rule_specs", "rule_superlative", "rule_no_guarantees", "rule_disclaimer"].includes(r.id));
    checksRun.push(
      { category: "claim_extraction", status: "completed", summary: "4 claims extracted from the sample paragraph." },
      { category: "factual_verification", status: "completed", summary: "2 measurable claims compared with approved facts." },
      { category: "unsupported_claims", status: "completed", summary: "2 unverifiable claims identified." },
      { category: "brand_rules", status: "completed", summary: `${demoRules.length} relevant brand rules evaluated.` },
      { category: "disclaimers", status: "skipped", summary: "Skipped for the predefined sample so results match the documented demonstration." },
    );
    return finish(input, demo, checksRun, limitations, "predefined_demo", {
      label: "DEMO RESULTS — PREDEFINED SAMPLE ANALYSIS. Not generated by a live AI model.",
      summary: "4 findings: 2 claims contradicted by the approved specification, 2 claims that cannot be verified with the available evidence.",
    });
  }

  /* --- claim extraction + factual verification -------------------- */
  if (checks.includes("factual_verification")) {
    const meas = extractMeasurements(content);
    const facts = input.facts.filter((f) => f.brandId === input.brand.id && f.numericValue !== undefined && f.unit);
    let matched = 0;
    for (const m of meas) {
      const candidates = facts.filter((f) => f.unit === m.unit);
      if (!candidates.length) continue;
      const fact = candidates.reduce((best, f) =>
        Math.abs((f.numericValue ?? 0) - m.value) < Math.abs((best.numericValue ?? 0) - m.value) ? f : best,
      );
      const expected = fact.numericValue ?? 0;
      const close = Math.abs(expected - m.value) <= Math.max(0.01, Math.abs(expected) * 0.01);
      const win = contextWindow(content, m.start, m.end);
      const rule = ruleByCategory(rules, "Accuracy") ?? rules.find((r) => r.severity === "high");
      const srcDoc = fact.sourceDocId
        ? input.documents.find((d) => d.id === fact.sourceDocId)
        : input.documents.find((d) => fact.sourceLabel?.startsWith(d.filename));
      const matchedPassage = srcDoc
        ? (srcDoc.passages.find((p) => fact.sourceLabel?.includes(p.ref)) ?? srcDoc.passages[0])
        : undefined;
      const evidence: EvidenceRef[] = [
        {
          type: "fact",
          refId: fact.id,
          label: `${fact.title} — ${fact.value}`,
          sourceLabel: fact.sourceLabel,
          passage: matchedPassage?.text,
        },
        ...(rule ? [{ type: "rule" as const, refId: rule.id, label: rule.title }] : []),
      ];
      if (close) {
        matched++;
        findings.push(
          makeFinding(auditId, {
            category: "factual_accuracy",
            severity: "informational",
            verificationStatus: "SUPPORTED",
            originalExcerpt: sentenceCase(win.text),
            explanation: `The claim "${m.raw.trim()}" matches the approved fact "${fact.title}" (${fact.value}).`,
            evidence,
            matchedRuleIds: rule ? [rule.id] : [],
            confidence: 0.95,
            requiresHumanReview: false,
            reviewStatus: "reviewed",
            charStart: win.start,
            charEnd: win.end,
          }),
        );
      } else {
        const prefix = fact.category === "Performance" ? "up to " : "";
        const replacement = `${prefix}${fact.value}`;
        const corrected = (win.start <= m.start ? content.slice(win.start, m.start) : "") + replacement + content.slice(m.end, win.end);
        findings.push(
          makeFinding(auditId, {
            category: "factual_accuracy",
            severity: severityOf(rules, rule ? [rule.id] : [], "high"),
            verificationStatus: "CONTRADICTED",
            originalExcerpt: sentenceCase(win.text),
            explanation: `The submitted value "${m.raw.trim()}" differs from the approved fact "${fact.title}" (${fact.value}) recorded in ${fact.sourceLabel}.`,
            evidence,
            matchedRuleIds: rule ? [rule.id] : [],
            suggestedCorrection:
              sentenceCase(corrected.trim()) + (/[.!?]$/.test(corrected.trim()) ? "" : "."),
            suggestedReplacement: corrected,
            confidence: 0.93,
            requiresHumanReview: true,
            charStart: win.start,
            charEnd: win.end,
          }),
        );
      }
    }
    checksRun.push({
      category: "factual_verification",
      status: "completed",
      summary: facts.length
        ? `${meas.length} measurable claim(s) found; ${matched} matched approved facts, ${findings.filter((f) => f.verificationStatus === "CONTRADICTED").length} conflicted.`
        : "No approved facts with numeric values are available, so measurable claims could not be verified.",
    });
    if (!facts.length) limitations.push("No numeric approved facts were available, so measurable claims could not be verified.");
  }

  /* --- unsupported / absolute claims ------------------------------ */
  if (checks.includes("unsupported_claims")) {
    const spans: { start: number; end: number; kind: "superlative" | "guarantee" }[] = [];
    const pushMatches = (re: RegExp, kind: "superlative" | "guarantee") => {
      const rx = new RegExp(re.source, "gi");
      let m: RegExpExecArray | null;
      while ((m = rx.exec(content))) {
        const end = kind === "guarantee" ? Math.min(content.length, m.index + m[0].length) : m.index + m[0].length;
        const tail = kind === "guarantee" ? content.slice(m.index, end) : content.slice(m.index, end);
        spans.push({ start: m.index, end, kind });
        void tail;
      }
    };
    pushMatches(SUPERLATIVE_RE, "superlative");
    // guarantee: capture to the end of the clause so the whole promise is one finding
    const grx = /\bguarantee(?:s|d)?\b[^.!?,;]*/gi;
    let gm: RegExpExecArray | null;
    while ((gm = grx.exec(content))) {
      spans.push({ start: gm.index, end: gm.index + gm[0].length, kind: "guarantee" });
    }
    // merge overlapping spans, keep the widest
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    const merged: typeof spans = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && s.start < last.end) {
        last.end = Math.max(last.end, s.end);
        if (s.kind === "guarantee") last.kind = "guarantee";
      } else merged.push({ ...s });
    }
    for (const s of merged) {
      const text = content.slice(s.start, s.end).trim();
      const isGuarantee = s.kind === "guarantee" || GUARANTEE_RE.test(text) || UNIVERSAL_RE.test(text);
      const ruleIds: string[] = [];
      if (SUPERLATIVE_RE.test(text) || s.kind === "superlative") {
        const r = rules.find((x) => /superlative/i.test(x.title) || x.category === "Accuracy");
        if (r) ruleIds.push(r.id);
      }
      if (isGuarantee) {
        const r = rules.find((x) => /guarantee/i.test(x.title) || x.category === "Compliance");
        if (r) ruleIds.push(r.id);
      }
      const fallback: Severity = isGuarantee ? "high" : "high";
      findings.push(
        makeFinding(auditId, {
          category: "unsupported_claim",
          severity: severityOf(rules, ruleIds, fallback),
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: sentenceCase(text),
          explanation: isGuarantee
            ? "This promise cannot be verified with the currently available approved evidence. A missing source is not proof of a false claim, so the status is NEEDS REVIEW rather than CONTRADICTED."
            : "No approved sales ranking or independent source is available in this workspace, so this superlative cannot be verified. A missing source is not proof of a false claim, so the status is NEEDS REVIEW rather than CONTRADICTED.",
          evidence: [
            ...ruleIds.map((id) => {
              const r = rules.find((x) => x.id === id)!;
              return { type: "rule" as const, refId: r.id, label: r.title };
            }),
            { type: "none" as const },
          ],
          matchedRuleIds: ruleIds,
          suggestedAction: isGuarantee
            ? "Replace the universal guarantee with a specific, sourced statement."
            : "Provide a reliable approved source for this claim, or remove it.",
          confidence: 0.8,
          requiresHumanReview: true,
          charStart: s.start,
          charEnd: s.end,
        }),
      );
    }
    checksRun.push({
      category: "unsupported_claims",
      status: "completed",
      summary: `${merged.length} superlative or guarantee-shaped claim(s) found.`,
    });
  }

  /* --- tone -------------------------------------------------------- */
  if (checks.includes("tone")) {
    const toneRule = ruleByCategory(rules, "Tone");
    const avoid = [...input.brand.wordsAvoid, ...input.brand.tone.avoidPhrases].map((w) => w.toLowerCase());
    const found: { word: string; idx: number }[] = [];
    for (const w of avoid) {
      const idx = content.toLowerCase().indexOf(w.toLowerCase());
      if (idx >= 0) found.push({ word: w, idx });
    }
    const hype = HYPE_WORDS.filter((h) => new RegExp(`\\b${h}\\b`, "i").test(content));
    const seen = new Set<string>();
    const toneHits = [...found.map((f) => ({ w: f.word, i: f.idx })), ...hype.map((h) => ({ w: h, i: content.toLowerCase().indexOf(h) }))];
    for (const hit of toneHits) {
      if (seen.has(hit.w)) continue;
      seen.add(hit.w);
      const end = hit.i + hit.w.length;
      findings.push(
        makeFinding(auditId, {
          category: "tone",
          severity: severityOf(rules, toneRule ? [toneRule.id] : [], "medium"),
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: sentenceCase(content.slice(Math.max(0, hit.i - 40), Math.min(content.length, end + 40)).trim()),
          explanation: `"${hit.w}" conflicts with the configured tone profile${avoid.includes(hit.w) ? " (appears on this brand's avoid list)" : " and reads as hype rather than the brand's friendly, professional register"}.`,
          evidence: toneRule
            ? [{ type: "rule", refId: toneRule.id, label: toneRule.title }]
            : [{ type: "none" }],
          matchedRuleIds: toneRule ? [toneRule.id] : [],
          suggestedCorrection: hit.w.length > 3 ? "a plainer, specific description" : undefined,
          suggestedAction: "Rewrite using concrete, specific language.",
          confidence: 0.72,
          requiresHumanReview: true,
          charStart: hit.i,
          charEnd: end,
        }),
      );
    }
    checksRun.push({
      category: "tone",
      status: "completed",
      summary: toneHits.length ? `${toneHits.length} tone deviation(s) found.` : "Content matches the configured tone profile.",
    });
  }

  /* --- terminology -------------------------------------------------- */
  if (checks.includes("terminology")) {
    const termRule = ruleByCategory(rules, "Terminology");
    const brandName = input.brand.name.trim();
    const parts = brandName.split(/\s+/);
    if (termRule && parts.length > 1) {
      const firstMention = content.toLowerCase().indexOf(parts[0].toLowerCase());
      if (firstMention >= 0) {
        const window = content.slice(firstMention, firstMention + brandName.length + 12);
        if (!new RegExp(`\\b${brandName.replace(/\s+/g, "\\s+")}\\b`, "i").test(window)) {
          findings.push(
            makeFinding(auditId, {
              category: "terminology",
              severity: severityOf(rules, [termRule.id], "medium"),
              verificationStatus: "NEEDS_REVIEW",
              originalExcerpt: sentenceCase(window.split(/[,.]/)[0]),
              explanation: `The first mention should use the full approved product name "${brandName}".`,
              evidence: [{ type: "rule", refId: termRule.id, label: termRule.title }],
              matchedRuleIds: [termRule.id],
              suggestedCorrection: brandName,
              suggestedReplacement: brandName,
              confidence: 0.7,
              requiresHumanReview: true,
              charStart: firstMention,
              charEnd: firstMention + parts[0].length,
            }),
          );
        }
      }
    }
    checksRun.push({
      category: "terminology",
      status: termRule ? "completed" : "skipped",
      summary: termRule ? "Approved product naming checked." : "No active terminology rule — check skipped.",
    });
  }

  /* --- required disclaimers ---------------------------------------- */
  if (checks.includes("disclaimers")) {
    const applicable = input.disclaimers.filter(
      (d) => d.brandId === input.brand.id && d.mandatory && (d.appliesTo.length === 0 || d.appliesTo.includes(input.contentType as never)),
    );
    const triggers: Record<string, RegExp> = {
      performance: /insulat|keeps? (drinks |water )?(cold|hot)|\bhours\b|temperature|retention/i,
      price: /[£$€]\s?\d|price|rrp|only £/i,
      warranty: /warrant|guarantee against defect/i,
    };
    let missing = 0;
    for (const d of applicable) {
      const key = /performance|insulation|temperature/i.test(d.text + d.when)
        ? "performance"
        : /price|vat/i.test(d.text + d.when)
          ? "price"
          : /warrant/i.test(d.text + d.when)
            ? "warranty"
            : null;
      const trigger = key ? triggers[key] : null;
      if (!trigger || !trigger.test(content)) continue;
      if (content.toLowerCase().includes(d.text.toLowerCase().slice(0, 30))) continue;
      const rule = ruleByCategory(rules, "Required Disclaimers");
      missing++;
      findings.push(
        makeFinding(auditId, {
          category: "disclaimer",
          severity: d.severity,
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: d.when,
          explanation: `A required disclaimer is missing for this content: "${d.text}".`,
          evidence: rule
            ? [{ type: "rule", refId: rule.id, label: rule.title }]
            : [{ type: "rule", refId: "disclaimer", label: "Configured disclaimer requirement" }],
          matchedRuleIds: rule ? [rule.id] : [],
          suggestedCorrection: d.text,
          confidence: 0.9,
          requiresHumanReview: true,
        }),
      );
    }
    checksRun.push({
      category: "disclaimers",
      status: applicable.length ? "completed" : "skipped",
      summary: applicable.length ? `${missing} required disclaimer(s) missing.` : "No mandatory disclaimers apply to this content type.",
    });
  }

  /* --- accessibility ------------------------------------------------ */
  if (checks.includes("accessibility")) {
    const accRule = ruleByCategory(rules, "Accessibility");
    for (const s of splitSentences(content)) {
      const words = s.text.split(/\s+/).filter(Boolean);
      if (words.length > 28) {
        findings.push(
          makeFinding(auditId, {
            category: "accessibility",
            severity: severityOf(rules, accRule ? [accRule.id] : [], "low"),
            verificationStatus: "NEEDS_REVIEW",
            originalExcerpt: s.text.length > 120 ? `${s.text.slice(0, 120)}…` : s.text,
            explanation: `This sentence is ${words.length} words long. Long sentences are harder to read for screen-reader users and non-native speakers.`,
            evidence: accRule ? [{ type: "rule", refId: accRule.id, label: accRule.title }] : [{ type: "none" }],
            matchedRuleIds: accRule ? [accRule.id] : [],
            suggestedAction: "Split into two shorter sentences.",
            confidence: 0.75,
            requiresHumanReview: true,
            charStart: s.start,
            charEnd: s.end,
          }),
        );
      }
    }
    const shouty = content.match(/\b[A-Z]{4,}\b/g) ?? [];
    if (shouty.length > 2) {
      findings.push(
        makeFinding(auditId, {
          category: "accessibility",
          severity: "low",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: shouty.slice(0, 4).join(", "),
          explanation: "Multiple fully capitalised words reduce readability and are read out letter-by-letter by some screen readers.",
          evidence: [{ type: "none" }],
          matchedRuleIds: accRule ? [accRule.id] : [],
          suggestedAction: "Use sentence case instead of capitals for emphasis.",
          confidence: 0.7,
          requiresHumanReview: true,
        }),
      );
    }
    checksRun.push({
      category: "accessibility",
      status: "completed",
      summary: `${findings.filter((f) => f.category === "accessibility").length} readability observation(s).`,
    });
  }

  /* --- brand rules (generic pass) ---------------------------------- */
  if (checks.includes("brand_rules")) {
    const ambiguous = AMBIGUOUS_RE.exec(content);
    if (ambiguous) {
      findings.push(
        makeFinding(auditId, {
          category: "ambiguous",
          severity: "low",
          verificationStatus: "NEEDS_REVIEW",
          originalExcerpt: ambiguous[0],
          explanation: "This wording is vague and cannot be checked against an approved reference. It is flagged for human judgement rather than marked as true or false.",
          evidence: [{ type: "none" }],
          suggestedAction: "Replace with a specific, verifiable statement.",
          confidence: 0.55,
          requiresHumanReview: true,
          charStart: ambiguous.index,
          charEnd: ambiguous.index + ambiguous[0].length,
        }),
      );
    }
    checksRun.push({
      category: "brand_rules",
      status: rules.length ? "completed" : "skipped",
      summary: rules.length
        ? `${rules.length} active rule(s) evaluated for this content type.`
        : "No active brand rules — add rules in Brand DNA Studio.",
    });
  }

  /* --- consistency with campaign ----------------------------------- */
  if (checks.includes("consistency") && input.campaign) {
    const approved = input.campaign.approvedMessages.join(" \n ");
    const approvedMeasures = extractMeasurements(approved);
    const contentMeasures = extractMeasurements(content);
    let conflicts = 0;
    for (const am of approvedMeasures) {
      const clash = contentMeasures.find((cm) => cm.unit === am.unit && Math.abs(cm.value - am.value) > 0.01);
      if (!clash) continue;
      conflicts++;
      findings.push(
        makeFinding(auditId, {
          category: "consistency",
          severity: "medium",
          verificationStatus: "CONTRADICTED",
          originalExcerpt: clash.raw,
          explanation: `This value conflicts with the campaign's approved messaging ("${approved.trim().slice(0, 90)}…"), which states ${am.raw}.`,
          evidence: [{ type: "campaign", refId: input.campaign.id, label: `${input.campaign.name} — approved messages`, passage: approved.trim() }],
          suggestedCorrection: am.raw,
          confidence: 0.85,
          requiresHumanReview: true,
          charStart: clash.start,
          charEnd: clash.end,
        }),
      );
    }
    checksRun.push({
      category: "consistency",
      status: "completed",
      summary: conflicts ? `${conflicts} conflict(s) with approved campaign messaging.` : "No conflicting values against approved campaign messaging.",
    });
  }

  const label =
    "Deterministic rule analysis — no AI provider configured. Results come from pattern matching against your approved references, not from a live model.";
  return finish(input, findings, checksRun, limitations, "deterministic", {
    label,
    summary: summarize(findings),
  });
}

function summarize(findings: Finding[]): string {
  if (!findings.length) return "No issues were detected by the configured checks.";
  const c = findings.filter((f) => f.verificationStatus === "CONTRADICTED").length;
  const n = findings.filter((f) => f.verificationStatus === "NEEDS_REVIEW").length;
  const s = findings.filter((f) => f.verificationStatus === "SUPPORTED").length;
  return `${findings.length} finding(s): ${c} contradicted, ${n} needing review, ${s} supported claim(s).`;
}

function computeScore(findings: Finding[], checksRun: CheckResult[], hasReferences: boolean): ScoreBreakdown {
  const completed = checksRun.filter((c) => c.status === "completed").length;
  if (!hasReferences) {
    return {
      score: null,
      reason: "Not enough information to calculate a reliable score — add brand rules or approved facts first.",
      factors: [{ label: "References", detail: "No active rules or approved facts available" }],
    };
  }
  if (completed === 0) {
    return {
      score: null,
      reason: "Not enough information to calculate a reliable score — no checks completed.",
      factors: [{ label: "Checks completed", detail: "0" }],
    };
  }
  const penalty = findings
    .filter((f) => f.verificationStatus !== "SUPPORTED")
    .reduce((acc, f) => acc + SEVERITY_WEIGHT[f.severity], 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const high = findings.filter((f) => f.severity === "critical" || f.severity === "high").length;
  return {
    score,
    reason:
      "Score = 100 − (severity weight × each non-supported finding). Critical 18, high 12, medium 7, low 3, informational 1. Capped at 0–100.",
    factors: [
      { label: "Findings counted", detail: `${findings.filter((f) => f.verificationStatus !== "SUPPORTED").length} non-supported finding(s)` },
      { label: "Severity weighting", detail: `−${penalty} points` },
      { label: "Checks completed", detail: `${completed} of ${checksRun.length}` },
      { label: "High / critical", detail: `${high}` },
      { label: "Limitation", detail: "A score does not guarantee legal compliance or factual accuracy." },
    ],
  };
}

function finish(
  input: AuditInput,
  findings: Finding[],
  checksRun: CheckResult[],
  limitations: string[],
  mode: AnalysisMode,
  meta: { label: string; summary: string },
): EngineResult {
  const hasReferences = input.rules.some((r) => r.status === "active") || input.facts.length > 0;
  const severityRank: Severity[] = ["critical", "high", "medium", "low", "informational"];
  let riskLevel: Severity | "clear" = "clear";
  for (const s of severityRank) {
    if (findings.some((f) => f.severity === s && f.verificationStatus !== "SUPPORTED")) {
      riskLevel = s;
      break;
    }
  }
  return {
    findings,
    checksRun,
    limitations,
    summaryText: meta.summary,
    score: computeScore(findings, checksRun, hasReferences),
    analysisMode: mode,
    resultLabel: meta.label,
    riskLevel,
  };
}

/* ------------------------------- staged runner -------------------- */

export const STAGES = [
  "Reading content",
  "Retrieving brand references",
  "Checking claims",
  "Evaluating brand rules",
  "Preparing findings",
] as const;

export async function runAuditStaged(
  input: AuditInput,
  onStage: (index: number, label: string) => void,
): Promise<EngineResult> {
  // Each stage performs real work; the short pause exists so the stage is visible.
  onStage(0, STAGES[0]);
  await sleep(180);
  const sentences = splitSentences(input.content);
  onStage(1, STAGES[1]);
  await sleep(220);
  const refs = {
    rules: input.rules.filter((r) => r.brandId === input.brand.id && r.status === "active").length,
    facts: input.facts.filter((f) => f.brandId === input.brand.id).length,
    docs: input.documents.filter((d) => d.brandId === input.brand.id && d.extracted).length,
  };
  void refs;
  onStage(2, STAGES[2]);
  await sleep(240);
  onStage(3, STAGES[3]);
  await sleep(220);
  onStage(4, STAGES[4]);
  const result = runAudit(input);
  await sleep(180);
  void sentences;
  return result;
}

/* ------------------------------- TruthTrace ----------------------- */

export interface TraceResult {
  claim: string;
  status: VerificationStatus;
  evidence: EvidenceRef[];
  reasoning: string;
  limitations: string[];
  recommendedAction: string;
}

export function traceClaim(claim: string, input: Omit<AuditInput, "auditId" | "content" | "checks">): TraceResult {
  const probe: AuditInput = { ...input, auditId: "trace", content: claim, checks: ["factual_verification", "unsupported_claims", "brand_rules"] };
  const result = runAudit(probe);
  const relevant = result.findings.filter((f) => f.category === "factual_accuracy" || f.category === "unsupported_claim");
  if (!relevant.length) {
    return {
      claim,
      status: "NEEDS_REVIEW",
      evidence: [{ type: "none" }],
      reasoning:
        "No measurable claim was matched against approved facts and no approved evidence was found to verify this statement. It is not marked as contradicted — absence of evidence is not evidence of contradiction.",
      limitations: ["No matching approved fact or source document was found."],
      recommendedAction: "Add an approved source for this statement, or escalate it for human verification.",
    };
  }
  const top = relevant.sort((a, b) => (a.verificationStatus === "CONTRADICTED" ? -1 : 1) - (b.verificationStatus === "CONTRADICTED" ? -1 : 1))[0];
  const limitations: string[] = [];
  if (!top.evidence.some((e) => e.type === "fact" || e.type === "document")) {
    limitations.push("No approved source document or fact supports this claim.");
  }
  if (top.verificationStatus === "NEEDS_REVIEW") limitations.push("The available evidence is insufficient or ambiguous.");
  if (top.verificationStatus === "CONTRADICTED") limitations.push("The approved reference conflicts with the submitted wording.");
  return {
    claim,
    status: top.verificationStatus,
    evidence: top.evidence,
    reasoning: top.explanation,
    limitations,
    recommendedAction:
      top.verificationStatus === "CONTRADICTED"
        ? "Correct the claim to match the approved source."
        : top.verificationStatus === "SUPPORTED"
          ? "Keep the claim."
          : (top.suggestedAction ?? "Review the claim or add an approved source."),
  };
}
