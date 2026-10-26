import type { Disclaimer, Finding, RewriteEdit, RewriteMode } from "./types";
import { uid } from "./utils";

export interface RewriteContext {
  content: string;
  findings: Finding[];
  mode: RewriteMode;
  disclaimers: Disclaimer[];
  contentType: string;
  brandAvoid: string[];
}

const MODE_CATEGORIES: Record<RewriteMode, string[]> = {
  fix_brand_violations: ["factual_accuracy", "unsupported_claim", "terminology", "tone", "disclaimer"],
  factual_accuracy: ["factual_accuracy"],
  match_tone: ["tone", "terminology"],
  concise: [],
  clarity: ["ambiguous", "accessibility"],
  remove_superlatives: ["unsupported_claim"],
  add_disclaimers: ["disclaimer"],
  accessibility: ["accessibility"],
  simplify_language: ["accessibility", "tone"],
};

const FILLERS = [
  { re: /\bvery\s+/gi, after: "", what: "Removed the filler word “very”", why: "Adds emphasis without adding information." },
  { re: /\breally\s+/gi, after: "", what: "Removed the filler word “really”", why: "Adds emphasis without adding information." },
  { re: /\bbasically\s+,?\s*/gi, after: "", what: "Removed “basically”", why: "Filler word that slows the sentence down." },
  { re: /\bin order to\b/gi, after: "to", what: "Shortened “in order to” to “to”", why: "Same meaning, fewer words." },
  { re: /\bdue to the fact that\b/gi, after: "because", what: "Shortened “due to the fact that” to “because”", why: "Same meaning, fewer words." },
];

const JARGON = [
  { from: /\butilize\b/gi, to: "use", what: "Replaced “utilize” with “use”", why: "Plain language is easier to read." },
  { from: /\bleverage\b/gi, to: "use", what: "Replaced “leverage” with “use”", why: "Plain language is easier to read." },
  { from: /\bfacilitate\b/gi, to: "help", what: "Replaced “facilitate” with “help”", why: "Plain language is easier to read." },
  { from: /\bcommence\b/gi, to: "start", what: "Replaced “commence” with “start”", why: "Plain language is easier to read." },
  { from: /\bpurchase\b/gi, to: "buy", what: "Replaced “purchase” with “buy”", why: "Warmer, more conversational wording." },
];

const HYPE = ["revolutionary", "game-changing", "miracle", "unparalleled", "world-class", "best-in-class"];

function triggerDisclaimer(content: string, d: Disclaimer): boolean {
  const hay = `${d.text} ${d.when}`;
  if (/performance|insulation|temperature/i.test(hay)) {
    return /insulat|keeps? (drinks |water )?(cold|hot)|\bhours\b|temperature/i.test(content);
  }
  if (/price|vat/i.test(hay)) return /[£$€]\s?\d|\bprice\b/i.test(content);
  if (/warrant/i.test(hay)) return /warrant/i.test(content);
  return false;
}

export function generateRewrite(ctx: RewriteContext): { edits: RewriteEdit[]; revised: string } {
  const { content, findings, mode } = ctx;
  const edits: RewriteEdit[] = [];

  const categories = MODE_CATEGORIES[mode];
  for (const f of findings) {
    if (!categories.includes(f.category)) continue;
    if (f.suggestedReplacement === undefined) continue;
    if (f.charStart === undefined || f.charEnd === undefined) continue;
    if (f.charStart < 0 || f.charEnd > content.length || f.charEnd <= f.charStart) continue;
    const before = content.slice(f.charStart, f.charEnd);
    if (before === f.suggestedReplacement) continue;
    edits.push({
      id: uid("edt"),
      findingId: f.id,
      what:
        f.suggestedReplacement === ""
          ? `Removed “${before.trim()}”`
          : `Replaced “${before.trim()}” with “${f.suggestedReplacement.trim()}”`,
      why:
        f.verificationStatus === "CONTRADICTED"
          ? `Approved evidence conflicts with the original wording. ${f.explanation}`
          : f.explanation,
      basis:
        f.evidence.find((e) => e.type === "fact")
          ? { type: "fact", label: f.evidence.find((e) => e.type === "fact")!.label ?? "Approved fact" }
          : f.evidence.find((e) => e.type === "rule")
            ? { type: "rule", label: f.evidence.find((e) => e.type === "rule")!.label ?? "Brand rule" }
            : { type: "rule", label: "Brand policy" },
      before,
      after: f.suggestedReplacement,
      start: f.charStart,
      end: f.charEnd,
      accepted: true,
    });
  }

  if (mode === "add_disclaimers") {
    for (const d of ctx.disclaimers.filter((x) => x.mandatory)) {
      if (!d.appliesTo.includes(ctx.contentType as never) && d.appliesTo.length > 0) continue;
      if (!triggerDisclaimer(content, d)) continue;
      if (content.toLowerCase().includes(d.text.toLowerCase().slice(0, 30))) continue;
      const end = content.trimEnd().length;
      edits.push({
        id: uid("edt"),
        what: "Appended a required disclaimer",
        why: `Required when this claim type appears: ${d.when}`,
        basis: { type: "disclaimer", label: "Configured required disclaimer" },
        before: "",
        after: ` ${d.text}`,
        start: end,
        end,
        accepted: true,
      });
    }
  }

  if (mode === "concise") {
    for (const f of FILLERS) {
      f.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = f.re.exec(content))) {
        edits.push({
          id: uid("edt"),
          what: f.what,
          why: f.why,
          basis: { type: "tone", label: "Conciseness setting" },
          before: m[0],
          after: f.after,
          start: m.index,
          end: m.index + m[0].length,
          accepted: true,
        });
      }
    }
  }

  if (mode === "simplify_language") {
    for (const j of JARGON) {
      j.from.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = j.from.exec(content))) {
        edits.push({
          id: uid("edt"),
          what: j.what,
          why: j.why,
          basis: { type: "tone", label: "Accessibility-friendly wording" },
          before: m[0],
          after: j.to,
          start: m.index,
          end: m.index + m[0].length,
          accepted: true,
        });
      }
    }
  }

  if (mode === "match_tone" || mode === "fix_brand_violations") {
    for (const h of HYPE) {
      const re = new RegExp(`\\b${h}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(content))) {
        edits.push({
          id: uid("edt"),
          what: `Removed the hype word “${m[0]}”`,
          why: "The configured tone profile favours specific, non-exaggerated language.",
          basis: { type: "tone", label: "Brand tone profile" },
          before: m[0],
          after: "",
          start: m.index,
          end: m.index + m[0].length,
          accepted: true,
        });
      }
    }
  }

  if (mode === "clarity" || mode === "accessibility") {
    const re = /[^.!?]{80,}?([,;]\s+(?:and|which|that)\s+[^.!?]+)[.!?]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const whole = m[0];
      const gPos = m[0].indexOf(m[1]);
      const cleaned = m[1].replace(/^,\s+(?:and|which|that)\s+/, "");
      const afterText = `${m[0].slice(0, gPos)}. ${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
      edits.push({
        id: uid("edt"),
        what: "Split a long sentence into two",
        why: "Sentences over ~28 words are harder to read and to process with assistive technology.",
        basis: { type: "readability", label: "Readability heuristic" },
        before: whole,
        after: afterText,
        start: m.index,
        end: m.index + whole.length,
        accepted: true,
      });
    }
  }

  // Drop overlapping proposals: the earlier span wins, so applying every
  // accepted edit can never corrupt the text.
  edits.sort((a, b) => a.start - b.start || a.end - b.end);
  const kept: RewriteEdit[] = [];
  let lastEnd = -1;
  for (const e of edits) {
    if (e.start < lastEnd) continue;
    kept.push(e);
    lastEnd = Math.max(lastEnd, e.end);
  }

  return { edits: kept, revised: applyEdits(content, kept) };
}

export function applyEdits(content: string, edits: RewriteEdit[]): string {
  const active = edits.filter((e) => e.accepted).sort((a, b) => b.start - a.start);
  let out = content;
  for (const e of active) {
    out = out.slice(0, e.start) + e.after + out.slice(e.end);
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
}
