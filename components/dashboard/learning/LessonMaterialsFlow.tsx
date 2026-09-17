"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Check, ChevronRight, ClipboardList, FileText, FlaskConical, Lock, Presentation, Video } from "lucide-react";
import { lessonVideoUrl } from "@/lib/api/learning";
import { pickFileUrl, resolveMediaUrl } from "@/lib/api/media";
import type { LearningAssignment, LearningLessonDetail, LearningMaterial } from "@/lib/api/types/learning";
import LessonFileViewer from "@/components/dashboard/learning/LessonFileViewer";
import LessonVideoPlayer from "@/components/dashboard/learning/LessonVideoPlayer";
import {
  assignmentsForSeminar,
  materialsForTab,
  parseMaterialBody,
} from "@/lib/learning/material-tabs";
import {
  listRequiredMaterials,
  type RequiredLessonMaterial,
} from "@/lib/learning/required-materials";
import { cn } from "@/lib/cn";

type StepState = "completed" | "current" | "locked";

function stepState(index: number, completedKeys: Set<string>, steps: { key: string }[]): StepState {
  const prevDone = steps.slice(0, index).every((item) => completedKeys.has(item.key));
  if (completedKeys.has(steps[index].key)) return "completed";
  if (prevDone) return "current";
  return "locked";
}

function findMaterial(lesson: LearningLessonDetail, item: RequiredLessonMaterial): LearningMaterial | undefined {
  if (item.materialId) {
    return (lesson.materials ?? []).find((row) => row.id === item.materialId);
  }
  if (item.kind === "video") {
    return (lesson.materials ?? []).find((row) => {
      const type = String(row.material_type || row.type || "").toLowerCase();
      return type.includes("video");
    });
  }
  return materialsForTab(lesson, item.kind).find((row) => (row.title || "") === item.title);
}

function findAssignment(lesson: LearningLessonDetail, item: RequiredLessonMaterial): LearningAssignment | undefined {
  if (item.kind !== "seminar") return undefined;
  return assignmentsForSeminar(lesson).find((row) =>
    item.materialId ? row.id === item.materialId : row.title === item.title
  );
}

const KIND_ICON = {
  video: Video,
  presentation: Presentation,
  lecture: FileText,
  seminar: FileText,
  laboratory: FlaskConical,
} as const;

function iconForLabel(label: string, kind: RequiredLessonMaterial["kind"]) {
  const lower = label.toLowerCase();
  if (lower.includes("qo'llanma") || lower.includes("qollanma")) return BookOpen;
  if (lower.includes("mustaqil")) return ClipboardList;
  if (kind === "video" || kind === "presentation" || kind === "lecture" || kind === "seminar" || kind === "laboratory") {
    return KIND_ICON[kind];
  }
  return FileText;
}

export default function LessonMaterialsFlow({
  lesson,
  lessonCode,
  completedKeys,
  onMarkComplete,
  onFlowFinished,
  testSlot,
  hasTest,
  testDone,
  items,
  variant = "default",
}: {
  lesson: LearningLessonDetail;
  lessonCode: string;
  completedKeys: Set<string>;
  onMarkComplete: (opts: { key: string; materialId?: number }) => void | Promise<void>;
  /** Oxirgi material ko'rilgach — parent lesson-level complete/test oqimini boshlaydi. */
  onFlowFinished?: () => void;
  testSlot?: ReactNode;
  hasTest?: boolean;
  testDone?: boolean;
  items?: RequiredLessonMaterial[];
  variant?: "default" | "retraining";
}) {
  const required = useMemo(() => items ?? listRequiredMaterials(lesson), [items, lesson]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    setActiveKey(null);
  }, [lesson.id]);

  const active = required.find((item) => item.key === activeKey) ?? null;
  const activeIndex = active ? required.findIndex((item) => item.key === active.key) : -1;
  const doneCount = required.filter((item) => completedKeys.has(item.key)).length;
  const totalCount = required.length + (hasTest ? 1 : 0);
  const progressDone = doneCount + (testDone ? 1 : 0);
  const percent = totalCount ? Math.round((progressDone / totalCount) * 100) : 100;

  const openStep = (item: RequiredLessonMaterial, index: number) => {
    const state = stepState(index, completedKeys, required);
    if (state === "locked") return;
    setActiveKey(item.key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markViewed = (item: RequiredLessonMaterial) => {
    if (completedKeys.has(item.key)) return;
    void onMarkComplete({ key: item.key, materialId: item.materialId });
  };

  const goNext = async (item: RequiredLessonMaterial, index: number) => {
    if (!completedKeys.has(item.key)) {
      await onMarkComplete({ key: item.key, materialId: item.materialId });
    }
    const next = required[index + 1];
    if (next && stepState(index + 1, new Set([...completedKeys, item.key]), required) !== "locked") {
      setActiveKey(next.key);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setActiveKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (index >= required.length - 1) onFlowFinished?.();
  };

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0C2340]">
          {required.length ? "Dars materiallari" : "Materiallar"}
        </p>
        <p className="text-xs font-medium text-[#64748B]">
          {totalCount ? `${Math.min(progressDone, totalCount)} / ${totalCount}` : "0 / 0"}
          {totalCount ? ` · ${percent}%` : ""}
        </p>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#E8EDF5]">
        <div
          className={cn("h-full rounded-full", variant === "retraining" ? "bg-[#2563EB]" : "bg-[#0756F5]")}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      {active ? (
        <MaterialDetail
          lesson={lesson}
          lessonCode={lessonCode}
          item={active}
          index={activeIndex}
          total={required.length}
          done={completedKeys.has(active.key)}
          onBack={() => setActiveKey(null)}
          onNext={() => void goNext(active, activeIndex)}
          onViewed={() => markViewed(active)}
        />
      ) : (
        <ul className="space-y-3">
          {required.map((item, index) => {
            const state = stepState(index, completedKeys, required);
            const Icon = iconForLabel(item.label, item.kind);
            const subtitle =
              variant === "retraining"
                ? item.title && item.title.toLowerCase() !== item.label.toLowerCase()
                  ? item.title
                  : `${lessonCode} ${item.label.toLowerCase()}`
                : item.title;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={state === "locked"}
                  onClick={() => openStep(item, index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border text-left",
                    variant === "retraining" ? "min-h-16 px-3 py-3 sm:min-h-[72px] sm:px-4" : "min-h-11 items-start px-4 py-3",
                    state === "current" && "border-[#2563EB] bg-[#EEF4FF]",
                    state === "completed" && "border-[#BBF7D0] bg-white",
                    state === "locked" &&
                      cn(
                        "cursor-not-allowed border-[#E8EDF5] bg-[#F8FAFC] text-[#94A3B8]",
                        variant !== "retraining" && "opacity-70"
                      ),
                    state !== "current" && state !== "completed" && state !== "locked" && "border-[#E8EDF5] bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center",
                      variant === "retraining"
                        ? cn(
                            "h-9 w-9 rounded-xl sm:h-10 sm:w-10",
                            state === "locked" ? "bg-[#F1F5F9] text-[#94A3B8]" : "bg-[#EEF4FF] text-[#2563EB]"
                          )
                        : cn("mt-0.5 h-5 w-5", state === "locked" ? "text-[#94A3B8]" : "text-[#2563EB]")
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block font-semibold break-words",
                        variant === "retraining" ? "text-[14px] sm:text-[15px]" : "text-sm",
                        state === "locked" ? "text-[#94A3B8]" : "text-[#0C2340]"
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block break-words",
                        variant === "retraining" ? "text-[12px] sm:text-[13px]" : "text-xs",
                        "text-[#64748B]"
                      )}
                    >
                      {subtitle}
                    </span>
                  </span>
                  {state === "completed" ? (
                    <Check className="h-5 w-5 shrink-0 text-[#16A34A]" />
                  ) : state === "locked" ? (
                    <Lock className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#2563EB]" />
                  )}
                </button>
              </li>
            );
          })}
          {testSlot ? <li>{testSlot}</li> : null}
          {!required.length && !hasTest && !testSlot ? (
            <li className="rounded-2xl border border-[#E8EDF5] bg-[#F7F9FC] px-4 py-5 text-sm text-[#64748B]">
              Bu dars uchun materiallar mavjud emas.
            </li>
          ) : null}
        </ul>
      )}

    </div>
  );
}

function MaterialDetail({
  lesson,
  lessonCode,
  item,
  index,
  total,
  done,
  onBack,
  onNext,
  onViewed,
}: {
  lesson: LearningLessonDetail;
  lessonCode: string;
  item: RequiredLessonMaterial;
  index: number;
  total: number;
  done: boolean;
  onBack: () => void;
  onNext: () => void;
  onViewed: () => void;
}) {
  const material = findMaterial(lesson, item);
  const assignment = findAssignment(lesson, item);
  const videoUrl = item.kind === "video" ? lessonVideoUrl(lesson) : "";
  const fileHref = resolveMediaUrl(
    pickFileUrl(material ?? {}) || material?.url || material?.content_url || assignment?.file_url || ""
  );
  const parsed = parseMaterialBody(material?.content_text || assignment?.description);
  const nextLabel = index < total - 1 ? "Keyingi material" : "Materiallarga qaytish";

  return (
    <div className="rounded-2xl border border-[#E8EDF5] bg-white p-4 sm:p-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center text-sm font-medium text-[#2563EB]"
      >
        ← {lessonCode}
      </button>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{item.label}</p>
      <h2 className="mt-1 break-words text-lg font-bold text-[#0C2340]">{item.title}</h2>
      <p className="mt-1 text-xs text-[#94A3B8]">
        {index + 1} / {total}
      </p>

      {item.kind === "video" && videoUrl ? (
        <VideoBlock url={videoUrl} title={item.title} onEnded={onViewed} />
      ) : null}

      {item.kind === "lecture" ? (
        <article className="mt-4 space-y-4 text-base leading-[1.7] text-[#0C2340]">
          {parsed.text ? <p className="whitespace-pre-wrap">{parsed.text}</p> : null}
          {material?.title && material.title !== item.title ? (
            <h3 className="text-lg font-semibold">{material.title}</h3>
          ) : null}
        </article>
      ) : null}

      {item.kind === "seminar" || item.kind === "laboratory" ? (
        <div className="mt-4 space-y-4">
          <LabeledBlocks parsed={parsed} />
          {assignment?.description && !parsed.assignment && !parsed.text ? (
            <p className="whitespace-pre-wrap text-base leading-[1.7] text-[#0C2340]">{assignment.description}</p>
          ) : null}
          {fileHref ? (
            <a
              href={fileHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl border border-[#E8EDF5] px-4 text-sm font-medium text-[#2563EB]"
            >
              Faylni ochish
            </a>
          ) : null}
        </div>
      ) : null}

      {fileHref && (item.kind === "presentation" || item.kind === "lecture" || item.kind === "laboratory") ? (
        <LessonFileViewer
          src={fileHref}
          title={item.title}
          mimeType={material?.mime_type}
          fileName={material?.original_name || material?.title}
        />
      ) : null}

      <button
        type="button"
        onClick={onNext}
        className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
      >
        {done ? nextLabel : index < total - 1 ? "Tugatildi · Keyingi material" : "Tugatildi"}
      </button>
    </div>
  );
}

function VideoBlock({ url, title, onEnded }: { url: string; title: string; onEnded: () => void }) {
  const src = resolveMediaUrl(url);
  const yt = youtubeId(src);
  if (yt) {
    return (
      <div className="mt-4 overflow-hidden rounded-xl bg-black">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${yt}?modestbranding=1&rel=0`}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          />
        </div>
      </div>
    );
  }
  if (src.includes("vimeo.com")) {
    const id = src.split("/").filter(Boolean).pop();
    return (
      <div className="mt-4 overflow-hidden rounded-xl bg-black">
        <div className="aspect-video">
          <iframe
            src={`https://player.vimeo.com/video/${id}?pip=0`}
            title={title}
            className="h-full w-full"
            allow="autoplay; fullscreen"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-black">
      <div className="aspect-video">
        <LessonVideoPlayer src={src} fill className="h-full w-full" onEnded={onEnded} />
      </div>
    </div>
  );
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "");
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") ?? "";
  } catch {
    return "";
  }
  return "";
}

function LabeledBlocks({ parsed }: { parsed: ReturnType<typeof parseMaterialBody> }) {
  const rows = [
    ["Maqsad", parsed.goal],
    ["Topshiriq", parsed.assignment],
    ["Bajarish tartibi", parsed.procedure],
    ["Ko'rsatma", parsed.instruction],
  ] as const;
  return (
    <div className="space-y-3">
      {rows.map(([label, text]) =>
        text ? (
          <section key={label}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</h3>
            <p className="mt-1 whitespace-pre-wrap text-base leading-[1.7] text-[#0C2340]">{text}</p>
          </section>
        ) : null
      )}
      {parsed.text ? <p className="whitespace-pre-wrap text-base leading-[1.7] text-[#0C2340]">{parsed.text}</p> : null}
    </div>
  );
}
