"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import ProtectedShell from "@/components/dashboard/learning/ProtectedShell";
import { fetchMedia } from "@/lib/learning/fetch-media";
import { resolveMediaUrl } from "@/lib/api/media";
import { cn } from "@/lib/cn";

type LessonVideoPlayerProps = {
  src: string;
  className?: string;
  fill?: boolean;
  onEnded?: () => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function isSameOriginMedia(url: string) {
  return url.startsWith("/media/") || url.startsWith("/uploads/");
}

export default function LessonVideoPlayer({ src, className, fill, onEnded }: LessonVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playSrc, setPlaySrc] = useState("");
  const [retry, setRetry] = useState(0);
  const blobTried = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let created = "";
    blobTried.current = false;
    setFailed(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setLoading(true);

    const resolved = resolveMediaUrl(src);

    // Same-origin proxy — brauzer Range stream (katta video uchun)
    if (isSameOriginMedia(resolved)) {
      setPlaySrc(resolved);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const response = await fetchMedia(resolved);
        if (!response.ok) throw new Error(`http-${response.status}`);
        const blob = await response.blob();
        if (cancelled) return;
        if (blob.type.includes("text/html")) throw new Error("html");
        created = URL.createObjectURL(blob);
        blobTried.current = true;
        setPlaySrc(created);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setPlaySrc(resolved);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src, retry]);

  const onVideoError = () => {
    const resolved = resolveMediaUrl(src);
    if (!blobTried.current && isSameOriginMedia(resolved)) {
      blobTried.current = true;
      setLoading(true);
      void fetchMedia(resolved)
        .then((response) => {
          if (!response.ok) throw new Error("fail");
          return response.blob();
        })
        .then((blob) => {
          if (blob.type.includes("text/html")) throw new Error("html");
          const url = URL.createObjectURL(blob);
          setPlaySrc(url);
          setLoading(false);
        })
        .catch(() => {
          setFailed(true);
          setLoading(false);
        });
      return;
    }
    setFailed(true);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setFailed(true));
    else video.pause();
  };

  if (failed) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 bg-black px-4 text-center text-sm text-white", fill ? "h-full" : "aspect-video", className)}>
        <p>Videoni yuklashda muammo yuz berdi.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setLoading(true);
            setPlaySrc("");
            blobTried.current = false;
            setRetry((n) => n + 1);
          }}
          className="min-h-11 rounded-lg bg-white px-4 font-medium text-black"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <ProtectedShell className={cn("relative overflow-hidden bg-black", fill ? "h-full" : "aspect-video", className)}>
      <div ref={boxRef} className="relative h-full w-full">
        {loading || !playSrc ? (
          <div className="flex h-full items-center justify-center text-sm text-white/80">Video yuklanmoqda...</div>
        ) : (
          <video
            key={playSrc}
            ref={videoRef}
            src={playSrc}
            playsInline
            preload="metadata"
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            draggable={false}
            className="h-full w-full object-contain"
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => setCurrent(videoRef.current?.currentTime ?? 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
            onEnded={() => onEnded?.()}
            onError={onVideoError}
          />
        )}
        {playSrc && !loading ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              aria-label="Video vaqti"
              className="h-1 w-full cursor-pointer accent-white"
              onChange={(event) => {
                const time = Number(event.target.value);
                if (videoRef.current) videoRef.current.currentTime = time;
                setCurrent(time);
              }}
            />
            <div className="mt-2 flex items-center gap-3 text-white">
              <button type="button" onClick={togglePlay} className="flex h-11 w-11 items-center justify-center rounded hover:bg-white/10" aria-label={playing ? "Pauza" : "Play"}>
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.muted = !video.muted;
                  setMuted(video.muted);
                }}
                className="flex h-11 w-11 items-center justify-center rounded hover:bg-white/10"
                aria-label={muted ? "Ovoz" : "Ovozsiz"}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <span className="text-xs tabular-nums text-white/80">
                {formatTime(current)} / {formatTime(duration)}
              </span>
              <button
                type="button"
                className="ml-auto flex h-11 w-11 items-center justify-center rounded hover:bg-white/10"
                aria-label="To'liq ekran"
                onClick={() => {
                  const box = boxRef.current;
                  if (!box) return;
                  if (document.fullscreenElement) void document.exitFullscreen();
                  else void box.requestFullscreen();
                }}
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedShell>
  );
}
