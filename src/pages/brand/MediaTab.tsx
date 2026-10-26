import { useState } from "react";
import {
  AlertTriangle,
  Check,
  FileText,
  Image as ImageIcon,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useApp } from "../../lib/store";
import { EmptyState, Field, InlineNotice, Modal, SampleBadge, SeverityBadge, useConfirm, useToast } from "../../components/ui";
import { cn, formatDate } from "../../lib/utils";
import { extractFile, MAX_UPLOAD_BYTES } from "../../lib/extract";
import type { BrandDocument, Disclaimer, Severity } from "../../lib/types";

export default function MediaTab({ active, tab }: { active: boolean; tab: "documents" | "assets" | "disclaimers" }) {
  const { state, brand, can, denyReason, saveDocument, deleteDocument, saveAsset, deleteAsset, saveDisclaimer, deleteDisclaimer } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const editable = can("edit_brand");
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<BrandDocument | null>(null);
  const [disclaimerDraft, setDisclaimerDraft] = useState<{ text: string; when: string; appliesTo: string; severity: Severity; mandatory: boolean } | null>(null);

  if (!active) return null;

  const docs = state.documents.filter((d) => d.brandId === brand?.id);
  const assets = state.assets.filter((a) => a.brandId === brand?.id);
  const disclaimers = state.disclaimers.filter((d) => d.brandId === brand?.id);

  /* ------------------------------ documents ----------------------- */
  const onDocFiles = async (files: FileList | null) => {
    if (!files?.length || !brand) return;
    setUploadError(null);
    for (const file of Array.from(files)) {
      setUploading(file.name);
      const result = await extractFile(file);
      saveDocument({
        brandId: brand.id,
        filename: file.name,
        kind: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : file.name.toLowerCase().endsWith(".docx") ? "docx" : "txt",
        size: file.size,
        processingStatus: result.ok ? "processed" : "failed",
        extracted: result.ok,
        passages: result.passages,
        error: result.error,
      });
      setUploading(null);
      if (result.ok) toast({ tone: "success", title: `${file.name} processed`, description: `${result.passages.length} passage(s) extracted and available as evidence.` });
      else setUploadError(result.error ?? `${file.name}: extraction failed.`);
    }
  };

  /* ------------------------------ assets -------------------------- */
  const onAssetFiles = async (files: FileList | null) => {
    if (!files?.length || !brand) return;
    for (const file of Array.from(files)) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        setUploadError(`${file.name}: unsupported format. Allowed: PNG, JPG, JPEG, WebP.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`${file.name}: larger than the 5 MB limit.`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      saveAsset({ brandId: brand.id, name: file.name, dataUrl, kind: "reference" });
      toast({ tone: "success", title: `${file.name} uploaded`, description: state.brands.length ? "Stored in this browser for the sample workspace." : undefined });
    }
  };

  if (tab === "documents") {
    return (
      <div className="space-y-4">
        <InlineNotice tone="warning" title="Document processing in local demo mode">
          TXT and DOCX files are parsed <b>in your browser</b>. PDF text extraction requires the backend document
          service (PyMuPDF) and is not available here — PDF uploads fail loudly rather than pretending to be processed.
          Uploaded files never leave this device unless a backend is configured.
        </InlineNotice>

        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-9 text-center transition-colors",
            editable ? "border-white/15 bg-white/[0.02] hover:border-accent/50 hover:bg-accent/[0.04]" : "cursor-not-allowed border-white/10 bg-white/[0.02] opacity-60",
          )}
        >
          <UploadCloud size={22} className={editable ? "text-accent" : "text-ink-muted"} />
          <span className="mt-2 text-sm font-semibold text-ink">
            {uploading ? `Processing ${uploading}…` : "Upload brand documents"}
          </span>
          <span className="mt-1 text-xs text-ink-muted">PDF, TXT or DOCX · max 5 MB each</span>
          <input
            type="file"
            accept=".pdf,.txt,.docx,application/pdf,text/plain"
            multiple
            className="hidden"
            disabled={!editable}
            onChange={(e) => onDocFiles(e.target.files)}
          />
        </label>

        {!editable && <InlineNotice tone="warning">{denyReason("edit_brand")}</InlineNotice>}
        {uploadError && (
          <div className="flex items-start gap-3 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Upload problem</p>
              <p className="text-ink-muted">{uploadError}</p>
            </div>
            <button className="ml-auto text-bad" onClick={() => setUploadError(null)} aria-label="Dismiss error"><X size={15} /></button>
          </div>
        )}

        {docs.length === 0 ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="No documents yet"
            body="Upload approved specifications, guidelines and campaign briefs so findings can quote real source passages."
          />
        ) : (
          <div className="surface overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Document</th>
                  <th className="px-3 py-3 font-semibold">Uploaded</th>
                  <th className="px-3 py-3 font-semibold">Processing</th>
                  <th className="px-3 py-3 font-semibold">Extracted text</th>
                  <th className="px-3 py-3 font-semibold">References</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{d.filename}</p>
                      <p className="text-xs uppercase text-ink-muted">{d.kind} · {(d.size / 1024).toFixed(0)} KB {d.isSample && "· sample"}</p>
                      {d.error && <p className="mt-1 max-w-md text-xs text-bad">{d.error}</p>}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">{formatDate(d.uploadedAt)}</td>
                    <td className="px-3 py-3.5">
                      <span className={cn("chip", d.processingStatus === "processed" ? "border-ok/35 bg-ok/10 text-ok" : d.processingStatus === "failed" ? "border-bad/35 bg-bad/10 text-bad" : "border-warn/35 bg-warn/10 text-warn")}>
                        {d.processingStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("text-xs", d.extracted ? "text-ok" : "text-bad")}>{d.extracted ? "Available" : "Not extracted"}</span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">{d.passages.length}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => setPreviewDoc(d)} disabled={!d.passages.length}>
                          Preview
                        </button>
                        <button
                          className="btn-danger !px-3 !py-1.5 !text-xs"
                          onClick={async () => {
                            const ok = await confirm({ title: "Remove document?", body: `${d.filename} will be removed. Facts referencing it keep their source label.`, confirmLabel: "Remove", tone: "danger" });
                            if (ok) {
                              deleteDocument(d.id);
                              toast({ tone: "info", title: "Document removed" });
                            }
                          }}
                          disabled={!editable}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal open={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.filename ?? "Document preview"} size="lg">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {previewDoc?.passages.map((p) => (
              <div key={p.id} className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{p.ref}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{p.text}</p>
              </div>
            ))}
            {!previewDoc?.passages.length && <p className="text-sm text-ink-muted">No extracted passages available.</p>}
          </div>
        </Modal>
      </div>
    );
  }

  /* ------------------------------ assets -------------------------- */
  if (tab === "assets") {
    return (
      <div className="space-y-4">
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-9 text-center transition-colors",
            editable ? "border-white/15 bg-white/[0.02] hover:border-accent/50" : "cursor-not-allowed opacity-60",
          )}
        >
          <ImageIcon size={22} className="text-accent" />
          <span className="mt-2 text-sm font-semibold text-ink">Upload brand assets</span>
          <span className="mt-1 text-xs text-ink-muted">PNG, JPG, JPEG, WebP · max 5 MB · stored in this browser</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" disabled={!editable} onChange={(e) => onAssetFiles(e.target.files)} />
        </label>

        {assets.length === 0 ? (
          <EmptyState icon={<ImageIcon size={20} />} title="No assets yet" body="Upload logos, palettes and typography references. VisualGuard compares uploaded creative against these assets." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((a) => (
              <figure key={a.id} className="surface overflow-hidden">
                {a.dataUrl ? (
                  <img src={a.dataUrl} alt={a.name} className="h-36 w-full object-contain bg-base-soft" />
                ) : a.palette ? (
                  <div className="flex h-36 w-full items-center justify-center gap-2 bg-base-soft">
                    {a.palette.map((c) => (
                      <span key={c} className="h-16 w-16 rounded-xl border border-white/10" style={{ background: c }} title={c} />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-base-soft px-4 text-center text-xs text-ink-muted">
                    {a.note ?? "Guidance asset"}
                  </div>
                )}
                <figcaption className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                    <p className="text-[11px] text-ink-muted">{a.kind.replace(/_/g, " ")} · {formatDate(a.uploadedAt)} {a.isSample && "· sample"}</p>
                  </div>
                  <button
                    className="text-ink-muted hover:text-bad"
                    aria-label={`Delete ${a.name}`}
                    disabled={!editable}
                    onClick={async () => {
                      const ok = await confirm({ title: "Delete asset?", body: `${a.name} will be removed from your brand library.`, confirmLabel: "Delete", tone: "danger" });
                      if (ok) {
                        deleteAsset(a.id);
                        toast({ tone: "info", title: "Asset deleted" });
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------ disclaimers --------------------- */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <InlineNotice tone="info" title="When are disclaimers checked?">
          During an audit, a disclaimer is required when its trigger keywords appear in the content for an applicable
          content type. Missing ones produce a finding with the exact wording to add.
        </InlineNotice>
        <button
          className="btn-primary shrink-0"
          disabled={!editable}
          title={editable ? "Add a disclaimer" : denyReason("edit_brand")}
          onClick={() => setDisclaimerDraft({ text: "", when: "", appliesTo: "", severity: "medium", mandatory: true })}
        >
          <Plus size={15} /> Add disclaimer
        </button>
      </div>

      {disclaimers.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={20} />} title="No disclaimers configured" body="Add required legal or performance disclaimers so they are checked automatically before publication." />
      ) : (
        <div className="space-y-3">
          {disclaimers.map((d) => (
            <article key={d.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">“{d.text}”</p>
                  <p className="mt-1 text-xs text-ink-muted">{d.when}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={d.severity} />
                    <span className="chip border-white/15 bg-white/5 text-ink-muted">{d.mandatory ? "mandatory" : "optional"}</span>
                    {d.appliesTo.length > 0 && <span className="chip border-white/15 bg-white/5 text-ink-muted">{d.appliesTo.length} content type(s)</span>}
                    {d.isSample && <SampleBadge />}
                  </div>
                </div>
                <button
                  className="text-ink-muted hover:text-bad"
                  aria-label="Delete disclaimer"
                  disabled={!editable}
                  onClick={async () => {
                    const ok = await confirm({ title: "Delete disclaimer?", body: "Future audits will stop requiring this text.", confirmLabel: "Delete", tone: "danger" });
                    if (ok) {
                      deleteDisclaimer(d.id);
                      toast({ tone: "info", title: "Disclaimer deleted" });
                    }
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!disclaimerDraft} onClose={() => setDisclaimerDraft(null)} title="Add required disclaimer">
        {disclaimerDraft && (
          <div className="space-y-4">
            <Field label="Disclaimer text" required>
              <textarea className="input min-h-20" value={disclaimerDraft.text} onChange={(e) => setDisclaimerDraft({ ...disclaimerDraft, text: e.target.value })} placeholder="Performance varies with ambient temperature, fill volume and usage." />
            </Field>
            <Field label="When must it appear?" hint="Describe the trigger — e.g. 'Whenever insulation duration is mentioned.'">
              <input className="input" value={disclaimerDraft.when} onChange={(e) => setDisclaimerDraft({ ...disclaimerDraft, when: e.target.value })} placeholder="Whenever a price is displayed." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Severity if missing">
                <select className="input" value={disclaimerDraft.severity} onChange={(e) => setDisclaimerDraft({ ...disclaimerDraft, severity: e.target.value as Severity })}>
                  {["critical", "high", "medium", "low", "informational"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Enforced">
                <select className="input" value={disclaimerDraft.mandatory ? "yes" : "no"} onChange={(e) => setDisclaimerDraft({ ...disclaimerDraft, mandatory: e.target.value === "yes" })}>
                  <option value="yes">Mandatory — always checked</option>
                  <option value="no">Optional — recorded only</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4">
              <button className="btn-secondary" onClick={() => setDisclaimerDraft(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!disclaimerDraft.text.trim() || !brand) return toast({ tone: "error", title: "Disclaimer text is required" });
                  saveDisclaimer({
                    brandId: brand.id,
                    text: disclaimerDraft.text.trim(),
                    when: disclaimerDraft.when.trim() || "When relevant claims appear.",
                    appliesTo: [],
                    severity: disclaimerDraft.severity,
                    mandatory: disclaimerDraft.mandatory,
                  });
                  toast({ tone: "success", title: "Disclaimer saved" });
                  setDisclaimerDraft(null);
                }}
              >
                <Check size={15} /> Save disclaimer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
