import type { SourcePassage } from "./types";
import { uid } from "./utils";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface ExtractResult {
  ok: boolean;
  text: string;
  passages: SourcePassage[];
  error?: string;
}

const PDF_HINT =
  "PDF text extraction needs the backend document service (PyMuPDF). It is not available in local demo mode, so no text was extracted — paste the text directly or upload a TXT/DOCX version.";

function paragraphs(text: string): SourcePassage[] {
  return text
    .split(/\n{1,}/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .slice(0, 400)
    .map((t, i) => ({ id: uid("psg"), ref: `¶${i + 1}`, text: t.slice(0, 600) }));
}

async function readZipEntry(buf: ArrayBuffer, entryName: string): Promise<Uint8Array | null> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // Locate end-of-central-directory record (signature 0x06054b50), scanning back.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= 0 && i > buf.byteLength - 65558; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid DOCX (zip) file.");

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLen));

    if (name === entryName) {
      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Corrupt archive entry.");
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = bytes.slice(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) {
        if (typeof DecompressionStream === "undefined") {
          throw new Error("This browser cannot inflate DOCX archives.");
        }
        const ds = new DecompressionStream("deflate-raw");
        const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
        return new Uint8Array(await new Response(stream).arrayBuffer());
      }
      throw new Error(`Unsupported compression method ${method}.`);
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

export async function extractFile(file: File): Promise<ExtractResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, text: "", passages: [], error: `${file.name} is larger than the 5 MB upload limit.` };
  }

  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");
  const isTxt = file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");

  if (!isPdf && !isDocx && !isTxt) {
    return {
      ok: false,
      text: "",
      passages: [],
      error: `${file.name}: unsupported type. Allowed formats are PDF, TXT and DOCX.`,
    };
  }

  try {
    if (isTxt) {
      const text = await file.text();
      if (!text.trim()) return { ok: false, text: "", passages: [], error: `${file.name} appears to be empty.` };
      return { ok: true, text, passages: paragraphs(text) };
    }

    if (isDocx) {
      const buf = await file.arrayBuffer();
      const xmlBytes = await readZipEntry(buf, "word/document.xml");
      if (!xmlBytes) return { ok: false, text: "", passages: [], error: `${file.name}: no document body found in the DOCX.` };
      const xml = new TextDecoder("utf-8").decode(xmlBytes);
      const text = xml
        .replace(/<w:tab[^>]*\/>/g, "\t")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      if (!text.trim()) return { ok: false, text: "", passages: [], error: `${file.name}: no readable text found.` };
      return { ok: true, text: text.trim(), passages: paragraphs(text) };
    }

    // PDF — no client-side parser in this build; be explicit rather than pretend.
    return { ok: false, text: "", passages: [], error: `${file.name}: ${PDF_HINT}` };
  } catch (err) {
    return {
      ok: false,
      text: "",
      passages: [],
      error: `${file.name}: extraction failed — ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }
}

export function passageSummary(passages: SourcePassage[]): string {
  if (!passages.length) return "No extracted passages";
  return `${passages.length} passage${passages.length === 1 ? "" : "s"} available`;
}
