import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Image as ImageIcon, Layers, ScanLine, UploadCloud, XCircle } from "lucide-react";
import { EmptyState, InlineNotice, SampleBadge, SectionHeader, SeverityBadge, useToast } from "../components/ui";
import { useApp } from "../lib/store";
import type { VisualAnalysis, VisualIssue } from "../lib/types";
import { cn, formatDateTime, uid } from "../lib/utils";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function distance(a: number[], b: number[]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export default function VisualGuard() {
  const { state, brand, can, denyReason, saveVisual, setVisualReview, isSampleWorkspace } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<VisualAnalysis | null>(null);

  const brandPalette = state.assets.find((a) => a.brandId === brand?.id && a.palette)?.palette ?? [];
  const logo = state.assets.find((a) => a.brandId === brand?.id && (a.kind === "primary_logo" || a.kind === "secondary_logo"));

  const analyse = async (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError(`${file.name}: unsupported format. Allowed: PNG, JPG, JPEG, WebP.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`${file.name}: larger than the 5 MB limit.`);
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("decode failed"));
        i.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 160 / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // dominant colours + luminance spread
      const buckets = new Map<string, number>();
      let lumSum = 0;
      let lumSq = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${r >> 4},${g >> 4},${b >> 4}`;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumSum += lum;
        lumSq += lum * lum;
      }
      const mean = lumSum / pixels;
      const sd = Math.sqrt(Math.max(0, lumSq / pixels - mean * mean));
      const dominant = [...buckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => {
          const [r, g, b] = k.split(",").map((v) => (parseInt(v, 10) << 4) + 8);
          return rgbToHex(r, g, b);
        });

      const issues: VisualIssue[] = [];

      // palette proximity
      if (brandPalette.length) {
        const distances = dominant.map((c) => Math.min(...brandPalette.map((p) => distance(hexToRgb(c), hexToRgb(p)))));
        const closest = Math.min(...distances);
        if (closest > 140) {
          issues.push({
            id: uid("vis"),
            title: "Colour palette appears outside the brand palette",
            detail: `Nearest brand colour distance is ${Math.round(closest)} (0 = identical). The dominant colours do not map closely to the approved palette.`,
            severity: "medium",
            kind: "potential",
            suggestion: "Recolour the creative using the approved palette, or add the new colour as an approved asset if it is intentional.",
            guideline: brandPalette.join(", "),
          });
        } else {
          issues.push({
            id: uid("vis"),
            title: "Dominant colours align with the brand palette",
            detail: `Nearest brand colour distance is ${Math.round(closest)}.`,
            severity: "informational",
            kind: "auto",
          });
        }
      }

      // contrast / readability heuristic
      if (sd < 38) {
        issues.push({
          id: uid("vis"),
          title: "Low tonal contrast across the image",
          detail: `Luminance standard deviation is ${Math.round(sd)}. Low tonal variation often means overlaid text may be hard to read.`,
          severity: "medium",
          kind: "potential",
          suggestion: "Check text contrast manually — aim for a 4.5:1 ratio against its background.",
        });
      } else if (mean < 45 || mean > 225) {
        issues.push({
          id: uid("vis"),
          title: "Very dark or very bright image",
          detail: `Mean luminance is ${Math.round(mean)}/255. Text overlays may fail contrast requirements.`,
          severity: "low",
          kind: "potential",
        });
      }

      // dimension guidance
      if (Math.abs(img.width / img.height - 1) < 0.05 && img.width < 1080) {
        issues.push({
          id: uid("vis"),
          title: "Small square asset",
          detail: `Dimensions are ${img.width}×${img.height}. Square social placements typically need at least 1080×1080.`,
          severity: "low",
          kind: "potential",
        });
      }

      const completedChecks = ["Image dimensions", "Dominant colour sampling", "Luminance / contrast heuristic"];
      if (brandPalette.length) completedChecks.push("Palette proximity");
      const unavailableChecks = [
        "Logo presence and pixel-level logo matching (requires a configured logo detection pipeline)",
        "OCR text extraction and clipping / overlap detection",
        "Automated WCAG accessibility scoring of overlaid text",
        logo ? "Visual disclaimer detection" : "Required visual disclaimer detection (no reference asset configured)",
      ];

      issues.push({
        id: uid("vis"),
        title: "Automated visual checks are partial in this environment",
        detail: `Completed: ${completedChecks.join(", ")}. Not available: ${unavailableChecks.join("; ")}.`,
        severity: "informational",
        kind: "unavailable",
      });

      const analysis: VisualAnalysis = {
        id: uid("vis_a"),
        filename: file.name,
        dataUrl,
        width: img.width,
        height: img.height,
        format: file.type.replace("image/", "").toUpperCase(),
        size: file.size,
        dominantColors: dominant,
        issues,
        completedChecks,
        unavailableChecks,
        humanReview: "pending",
        at: new Date().toISOString(),
      };
      saveVisual(analysis);
      setCurrent(analysis);
      toast({ tone: "success", title: "Image analysed", description: `${issues.length} observation(s) recorded.` });
    } catch (e) {
      setError(e instanceof Error ? `Could not analyse the image: ${e.message}` : "Could not analyse the image.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const kindChip = (kind: VisualIssue["kind"]) =>
    kind === "auto"
      ? "border-ok/35 bg-ok/10 text-ok"
      : kind === "potential"
        ? "border-warn/35 bg-warn/10 text-warn"
        : "border-white/15 bg-white/5 text-ink-muted";

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <SectionHeader
        title="VisualGuard"
        description="Upload marketing creative to check dimensions, colour palette proximity and basic readability observations."
        actions={isSampleWorkspace && <SampleBadge />}
      />

      <InlineNotice tone="warning" title="What this module can and cannot do here">
        Dimension, dominant-colour and contrast checks run <b>locally in your browser</b>. Logo detection, OCR text
        clipping and automated accessibility scoring need additional pipelines that are <b>not configured</b> in this
        deployment — they are reported as unavailable rather than faked.
      </InlineNotice>

      {!can("edit_brand") && <InlineNotice tone="warning">{denyReason("edit_brand")}</InlineNotice>}

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center transition-colors",
          can("edit_brand") ? "border-white/15 bg-white/[0.02] hover:border-accent/50 hover:bg-accent/[0.04]" : "cursor-not-allowed opacity-60",
        )}
      >
        <UploadCloud size={26} className="text-accent" />
        <span className="mt-3 text-sm font-semibold text-ink">{busy ? "Analysing image…" : "Upload a marketing image"}</span>
        <span className="mt-1 text-xs text-ink-muted">PNG, JPG, JPEG or WebP · max 5 MB</span>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          disabled={!can("edit_brand")}
          onChange={(e) => e.target.files?.[0] && analyse(e.target.files[0])}
        />
      </label>

      {error && <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

      {!current && state.visuals.length === 0 && (
        <EmptyState
          icon={<ImageIcon size={20} />}
          title="No images analysed yet"
          body="Upload a banner, social post or product graphic to see what the configured checks report."
        />
      )}

      {current && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="surface overflow-hidden">
            <div className="border-b border-white/[0.07] px-5 py-3">
              <p className="text-sm font-semibold text-ink">{current.filename}</p>
              <p className="text-xs text-ink-muted">
                {current.width}×{current.height} · {current.format} · {(current.size / 1024).toFixed(0)} KB · {formatDateTime(current.at)}
              </p>
            </div>
            <img src={current.dataUrl} alt={current.filename} className="max-h-[340px] w-full bg-base-soft object-contain" />
            <div className="flex flex-wrap items-center gap-2 p-4">
              <span className="text-[11px] uppercase tracking-wide text-ink-muted">Dominant colours</span>
              {current.dominantColors.map((c) => (
                <span key={c} className="h-6 w-6 rounded-md border border-white/10" style={{ background: c }} title={c} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-3">
              <span className="text-xs text-ink-muted">Human review: {current.humanReview}</span>
              <button
                className="btn-secondary !py-1.5 !text-xs"
                onClick={() => setVisualReview(current.id, current.humanReview === "pending" ? "reviewed" : "pending")}
              >
                {current.humanReview === "pending" ? "Mark reviewed" : "Reopen review"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink"><ScanLine size={15} className="text-accent" /> Completed checks</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {current.completedChecks.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-ok"><CheckCircle2 size={14} /> {c}</li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink"><XCircle size={15} className="text-ink-muted" /> Not available here</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                {current.unavailableChecks.map((c) => (
                  <li key={c} className="flex gap-2"><span>•</span>{c}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              {current.issues.map((iss) => (
                <article key={iss.id} className={cn("surface p-4", iss.kind === "unavailable" && "border-dashed")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{iss.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{iss.detail}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <span className={cn("chip", kindChip(iss.kind))}>{iss.kind === "auto" ? "auto-detected" : iss.kind === "potential" ? "potential" : "not available"}</span>
                      <SeverityBadge severity={iss.severity} />
                    </div>
                  </div>
                  {iss.suggestion && <p className="mt-2 rounded-lg border border-accent/30 bg-accent/[0.08] px-3 py-2 text-xs text-accent-cyan">Suggestion: {iss.suggestion}</p>}
                  {iss.guideline && <p className="mt-1 text-[11px] text-ink-muted">Approved palette: {iss.guideline}</p>}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.visuals.length > 1 && (
        <section className="surface p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Layers size={15} /> Previous analyses</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {state.visuals.map((v) => (
              <button key={v.id} onClick={() => setCurrent(v)} className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] text-left hover:border-accent/40">
                <img src={v.dataUrl} alt={v.filename} className="h-24 w-full object-cover" />
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium text-ink">{v.filename}</p>
                  <p className="text-[11px] text-ink-muted">{v.issues.length} observation(s) · {v.humanReview}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <AlertTriangle size={13} /> Findings from this module always state whether they were automatically detected, merely potential, or not available.
      </div>
    </div>
  );
}
