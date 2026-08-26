"use client";

import { useEffect, useState } from "react";
import PdfViewer from "@/components/dashboard/learning/PdfViewer";
import OfficeViewer from "@/components/dashboard/learning/OfficeViewer";
import LessonVideoPlayer from "@/components/dashboard/learning/LessonVideoPlayer";
import ProtectedShell from "@/components/dashboard/learning/ProtectedShell";
import { fetchMedia } from "@/lib/learning/fetch-media";
import { resolveMediaUrl } from "@/lib/api/media";
import {
  fileExtension,
  fileKindFromMeta,
  fileKindFromMime,
  isOleMagic,
  isPdfMagic,
  isZipMagic,
  ooxmlKindFromBytes,
  type LessonFileKind,
} from "@/lib/learning/file-kind";
import { cn } from "@/lib/cn";

type LessonFileViewerProps = {
  src: string;
  title?: string;
  mimeType?: string | null;
  fileName?: string | null;
  className?: string;
  onMediaError?: () => void;
};

async function detectKind(src: string, mimeType?: string | null, fileName?: string | null): Promise<LessonFileKind> {
  const fromMeta = fileKindFromMeta(src, mimeType, fileName);
  if (fromMeta === "image" || fromMeta === "video" || fromMeta === "audio" || fromMeta === "text") {
    return fromMeta;
  }
  if (fromMeta === "pdf" || fromMeta === "word" || fromMeta === "office") {
    return fromMeta;
  }

  try {
    const response = await fetchMedia(src, { headers: { Range: "bytes=0-262143" } });
    if (!response.ok) return fromMeta;
    const fromMime = fileKindFromMime(response.headers.get("content-type") ?? "");
    const bytes = new Uint8Array(await response.arrayBuffer());

    if (isPdfMagic(bytes)) return "pdf";
    if (isOleMagic(bytes)) {
      const ext = fileExtension(src, fileName);
      if (ext === "doc") return "word";
      return "office";
    }
    if (isZipMagic(bytes)) {
      const ooxml = ooxmlKindFromBytes(bytes);
      if (ooxml === "word") return "word";
      if (ooxml === "ppt" || ooxml === "excel") return "office";
      return "office";
    }
    if (fromMime) return fromMime;
    return fromMeta;
  } catch {
    return fromMeta;
  }
}

function ProtectedImage({
  src,
  title,
  className,
  onMediaError,
}: {
  src: string;
  title?: string;
  className?: string;
  onMediaError?: () => void;
}) {
  const resolved = resolveMediaUrl(src);
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let created = "";
    void fetchMedia(resolved)
      .then((response) => {
        if (!response.ok) throw new Error("fail");
        return response.blob();
      })
      .then((blob) => {
        created = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(created);
        else URL.revokeObjectURL(created);
      })
      .catch(() => {
        if (!cancelled) {
          setBlobUrl(resolved);
          onMediaError?.();
        }
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [resolved, onMediaError]);

  return (
    <ProtectedShell className={cn("mt-3 overflow-hidden rounded-lg border border-[#E8EDF5] bg-[#F8FAFC]", className)}>
      {blobUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={blobUrl} alt={title || "Material"} draggable={false} className="mx-auto max-h-[70vh] w-full object-contain" />
      ) : (
        <p className="p-4 text-sm text-[#64748B]">Yuklanmoqda...</p>
      )}
    </ProtectedShell>
  );
}

function WordViewer({ src, title, fileName, className }: { src: string; title?: string; fileName?: string | null; className?: string }) {
  const [html, setHtml] = useState("");
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHtml("");
    setFailed(false);
    setLoading(true);
    const resolved = resolveMediaUrl(src);
    const ext = fileExtension(resolved, fileName);

    void (async () => {
      try {
        const response = await fetchMedia(resolved);
        if (!response.ok) throw new Error("fail");
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        if (isOleMagic(bytes) || ext === "doc") {
          throw new Error("legacy-doc");
        }

        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        if (!cancelled) {
          setHtml(result.value || "<p>Matn yo'q.</p>");
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, fileName]);

  if (failed) {
    return (
      <p className="mt-3 text-sm text-[#64748B]">
        Hujjat ochilmadi. DOCX formatida yuklang.
      </p>
    );
  }

  return (
    <ProtectedShell className={cn("mt-3", className)}>
      {loading ? <p className="mb-3 text-sm text-[#64748B]">Yuklanmoqda...</p> : null}
      {!loading ? (
        <div
          className="max-h-[70vh] overflow-auto rounded-lg border border-[#E8EDF5] bg-white p-5 text-sm leading-6 text-[#0C2340] [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_img]:max-h-[480px] [&_img]:max-w-full [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </ProtectedShell>
  );
}

export default function LessonFileViewer({ src, title, mimeType, fileName, className, onMediaError }: LessonFileViewerProps) {
  const resolved = resolveMediaUrl(src);
  const initialKind = fileKindFromMeta(resolved, mimeType, fileName);
  const [kind, setKind] = useState<LessonFileKind>(initialKind);
  const [detected, setDetected] = useState(initialKind !== "unknown");
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const nextInitial = fileKindFromMeta(resolved, mimeType, fileName);
    setFailed(false);
    setText("");
    setKind(nextInitial);
    setDetected(nextInitial !== "unknown");
    void detectKind(resolved, mimeType, fileName).then((next) => {
      if (cancelled) return;
      setKind(next);
      setDetected(true);
    });
    return () => {
      cancelled = true;
    };
  }, [resolved, mimeType, fileName]);

  useEffect(() => {
    if (kind !== "text") return;
    let cancelled = false;
    void fetchMedia(resolved)
      .then((response) => response.text())
      .then((value) => {
        if (!cancelled) setText(value);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onMediaError?.();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind, resolved, onMediaError]);

  if (!detected) {
    return <p className="mt-3 text-sm text-[#64748B]">Fayl yuklanmoqda...</p>;
  }

  if (kind === "pdf") {
    return <PdfViewer src={resolved} title={title} className={className} />;
  }

  if (kind === "image") {
    return <ProtectedImage src={resolved} title={title} className={className} onMediaError={onMediaError} />;
  }

  if (kind === "video") {
    return <LessonVideoPlayer src={resolved} className={cn("mt-3 rounded-lg", className)} />;
  }

  if (kind === "audio") {
    return (
      <ProtectedShell className={cn("mt-3 rounded-lg border border-[#E8EDF5] px-3 py-4", className)}>
        <audio
          src={resolved}
          controls
          controlsList="nodownload noplaybackrate noremoteplayback"
          className="w-full"
          onError={() => onMediaError?.()}
        />
      </ProtectedShell>
    );
  }

  if (kind === "text") {
    return (
      <ProtectedShell>
        <pre className={cn("mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border border-[#E8EDF5] bg-[#F8FAFC] p-4 text-sm text-[#0C2340]", className)}>
          {text || (failed ? "Matn ochilmadi." : "Yuklanmoqda...")}
        </pre>
      </ProtectedShell>
    );
  }

  if (kind === "word") {
    return <WordViewer src={resolved} title={title} fileName={fileName} className={className} />;
  }

  return <OfficeViewer src={resolved} title={title} fileName={fileName} className={className} />;
}
