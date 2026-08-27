"use client";

import { useEffect, useRef, useState } from "react";
import { fetchMedia } from "@/lib/learning/fetch-media";
import { isPdfMagic } from "@/lib/learning/file-kind";
import ProtectedShell from "@/components/dashboard/learning/ProtectedShell";
import { cn } from "@/lib/cn";

type PdfLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDoc> };
};

type PdfDoc = {
  numPages: number;
  getPage: (page: number) => Promise<PdfPage>;
  destroy?: () => Promise<void>;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfLib;
  }
}

const PDFJS_VERSION = "3.11.174";

function loadPdfjs(): Promise<PdfLib> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser"));
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
    return Promise.resolve(window.pdfjsLib);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pdfjs]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.pdfjsLib) resolve(window.pdfjsLib);
        else reject(new Error("pdfjs"));
      });
      existing.addEventListener("error", () => reject(new Error("pdfjs")));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
    script.async = true;
    script.dataset.pdfjs = "true";
    script.onload = () => {
      const lib = window.pdfjsLib;
      if (!lib) {
        reject(new Error("pdfjs"));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("pdfjs"));
    document.head.appendChild(script);
  });
}

async function readPdfBytes(src: string): Promise<Uint8Array> {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`http-${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  const response = await fetchMedia(src);
  if (!response.ok) throw new Error(`http-${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

type PdfViewerProps = {
  src: string;
  title?: string;
  className?: string;
};

export default function PdfViewer({ src, title, className }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    void (async () => {
      // Ref birinchi paint dan keyin tayyor bo'lsin
      let container = containerRef.current;
      for (let i = 0; i < 20 && !container; i++) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        container = containerRef.current;
      }
      if (!container || cancelled) return;
      container.replaceChildren();

      try {
        const bytes = await readPdfBytes(src);
        if (cancelled) return;
        if (!isPdfMagic(bytes)) throw new Error("not-pdf");

        const pdfjs = await loadPdfjs();
        const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        if (cancelled) {
          await pdf.destroy?.();
          return;
        }

        const width = container.clientWidth || 800;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) {
            await pdf.destroy?.();
            return;
          }
          const unscaled = page.getViewport({ scale: 1 });
          const scale = Math.min(1.6, width / unscaled.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "mb-3 w-full rounded bg-white shadow-sm";
          canvas.setAttribute("aria-label", `${title || "Hujjat"} ${pageNumber}`);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) setLoading(false);
        else await pdf.destroy?.();
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
  }, [src, title]);

  return (
    <ProtectedShell className={cn("mt-3", className)}>
      {src && !src.startsWith("blob:") && !src.startsWith("data:") ? (
        <div className="mb-3 flex justify-end">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center rounded-lg border border-[#E8EDF5] px-3 text-sm font-medium text-[#2563EB]"
          >
            Yangi oynada ochish
          </a>
        </div>
      ) : null}
      {loading ? <p className="mb-3 text-sm text-[#64748B]">Yuklanmoqda...</p> : null}
      {error ? <p className="mb-3 text-sm text-[#64748B]">Fayl ochilmadi.</p> : null}
      <div
        ref={containerRef}
        className={cn(
          "w-full max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-[#E8EDF5] bg-[#F8FAFC] p-3",
          error ? "hidden" : null
        )}
      />
    </ProtectedShell>
  );
}
