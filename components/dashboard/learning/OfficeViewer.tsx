"use client";

import { useEffect, useRef, useState } from "react";
import { fetchMedia } from "@/lib/learning/fetch-media";
import {
  fileExtension,
  isExcelExt,
  isOleMagic,
  isPdfMagic,
  isPptExt,
  isZipMagic,
  ooxmlKindFromBytes,
} from "@/lib/learning/file-kind";
import { resolveMediaUrl } from "@/lib/api/media";
import PdfViewer from "@/components/dashboard/learning/PdfViewer";
import ProtectedShell from "@/components/dashboard/learning/ProtectedShell";
import { cn } from "@/lib/cn";

type PptxPreviewer = {
  preview: (data: ArrayBuffer) => Promise<unknown> | unknown;
};

type OfficeViewerProps = {
  src: string;
  title?: string;
  fileName?: string | null;
  className?: string;
};

async function loadPptxPreviewer(container: HTMLElement): Promise<PptxPreviewer> {
  try {
    const mod = await import("pptx-preview");
    const width = Math.max(320, container.clientWidth || 800);
    return mod.init(container, { width, height: Math.round((width * 9) / 16), mode: "list" });
  } catch {
    const importer = new Function("url", "return import(url)") as (url: string) => Promise<{
      init: (el: HTMLElement, opts: { width: number; height: number; mode?: string }) => PptxPreviewer;
    }>;
    const mod = await importer("https://cdn.jsdelivr.net/npm/pptx-preview@1.0.6/+esm");
    const width = Math.max(320, container.clientWidth || 800);
    return mod.init(container, { width, height: Math.round((width * 9) / 16), mode: "list" });
  }
}

async function renderExcelTable(buffer: ArrayBuffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const parts: string[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    parts.push(`<h3 class="mb-2 mt-4 text-sm font-semibold text-[#0C2340] first:mt-0">${escapeHtml(name)}</h3>`);
    parts.push(
      XLSX.utils.sheet_to_html(sheet, {
        id: `sheet-${name}`,
        editable: false,
      })
    );
  }
  return parts.join("") || "<p>Jadval bo'sh.</p>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function waitForEl(ref: { current: HTMLDivElement | null }) {
  let el = ref.current;
  for (let i = 0; i < 20 && !el; i++) {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    el = ref.current;
  }
  return el;
}

export default function OfficeViewer({ src, title, fileName, className }: OfficeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfSrc, setPdfSrc] = useState("");
  const [excelHtml, setExcelHtml] = useState("");
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setPdfSrc("");
    setExcelHtml("");
    setPreviewReady(false);

    const resolved = resolveMediaUrl(src);
    const ext = fileExtension(resolved, fileName);

    void (async () => {
      try {
        const response = await fetchMedia(resolved);
        if (!response.ok) throw new Error(`http-${response.status}`);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (cancelled) return;

        if (isPdfMagic(bytes)) {
          setPdfSrc(resolved);
          setLoading(false);
          return;
        }

        const ooxml = isZipMagic(bytes) ? ooxmlKindFromBytes(bytes) : null;
        const asExcel = isExcelExt(ext) || ooxml === "excel" || ext === "csv";
        const asPpt = isPptExt(ext) || ooxml === "ppt";

        // Excel / CSV — sayt ichida jadval
        if (asExcel || (isOleMagic(bytes) && (ext === "xls" || !ext))) {
          try {
            const html = await renderExcelTable(buffer);
            if (!cancelled) {
              setExcelHtml(html);
              setLoading(false);
            }
            return;
          } catch {
            /* fallthrough */
          }
        }

        // PPTX — sayt ichida preview
        if ((asPpt || (isZipMagic(bytes) && !asExcel && ooxml !== "word")) && isZipMagic(bytes)) {
          const container = await waitForEl(containerRef);
          if (container && !cancelled) {
            try {
              container.replaceChildren();
              const previewer = await loadPptxPreviewer(container);
              await previewer.preview(buffer);
              if (!cancelled) {
                setPreviewReady(true);
                setLoading(false);
              }
              return;
            } catch {
              /* fallthrough */
            }
          }
        }

        // Eski .ppt (OLE) — brauzerda to'liq ochib bo'lmaydi
        if (isOleMagic(bytes) || ext === "ppt") {
          throw new Error("legacy-ppt");
        }

        throw new Error("unsupported");
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      containerRef.current?.replaceChildren();
    };
  }, [src, fileName]);

  if (pdfSrc) {
    return <PdfViewer src={pdfSrc} title={title} className={className} />;
  }

  if (excelHtml) {
    return (
      <ProtectedShell className={cn("mt-3", className)}>
        <div
          className="max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-[#E8EDF5] bg-white p-3 text-sm text-[#0C2340] [&_table]:w-full [&_table]:min-w-[480px] [&_table]:border-collapse [&_td]:border [&_td]:border-[#E8EDF5] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[#E8EDF5] [&_th]:bg-[#F8FAFC] [&_th]:px-2 [&_th]:py-1"
          dangerouslySetInnerHTML={{ __html: excelHtml }}
        />
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell className={cn("mt-3", className)}>
      {loading ? <p className="mb-3 text-sm text-[#64748B]">Fayl yuklanmoqda...</p> : null}
      {error ? (
        <p className="mb-3 text-sm text-[#64748B]">
          Fayl ochilmadi. PPTX, XLSX yoki PDF formatida yuklang.
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={cn(
          "max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-[#E8EDF5] bg-white p-3",
          error || (!loading && !previewReady) ? "hidden" : null
        )}
      />
    </ProtectedShell>
  );
}
