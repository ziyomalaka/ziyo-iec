"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import type {
  QualificationDirection,
  QualificationLesson,
  QualificationMaterial,
  QualificationModule,
  QualificationPublishStatus,
} from "@/lib/api/types/qualification";
import { resolveMediaUrl } from "@/lib/api/media";
import { cn } from "@/lib/cn";
import { formatLessonCode, lessonTypeLabel, materialTypeLabel } from "@/lib/qualification/constants";
import { displayEducationCategoryName } from "@/lib/dashboard/education-level";
import {
  directionKey,
  wizardDirectionId,
  wizardSource,
} from "@/lib/qualification/it-bridge";
import {
  asLessonType,
  nextLessonNumber,
  nextModuleNumber,
  qualificationWizardPath,
} from "@/lib/qualification/wizard-state";

const MATERIAL_ICONS: Record<string, string> = {
  VIDEO: "🎥",
  PRESENTATION: "📊",
  GUIDE: "📘",
  SEMINAR: "💬",
  LABORATORY: "🔬",
  TEST: "📝",
};

const PUBLISH_STATUSES: { value: QualificationPublishStatus; label: string }[] = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "PUBLISHED", label: "PUBLISHED" },
  { value: "INACTIVE", label: "INACTIVE" },
  { value: "ARCHIVED", label: "ARCHIVED" },
];

function statusBadge(status?: string, label?: string) {
  const upper = status?.toUpperCase();
  const text = label || upper || status;
  if (!text) return null;
  const variant = upper === "PUBLISHED" ? "success" : "neutral";
  return <DashboardBadge variant={variant}>{text}</DashboardBadge>;
}

function PublishStatusSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value?: string;
  onChange: (status: QualificationPublishStatus) => void;
  ariaLabel: string;
}) {
  const current = (value?.toUpperCase() || "DRAFT") as QualificationPublishStatus;
  const selected = PUBLISH_STATUSES.some((item) => item.value === current) ? current : "DRAFT";
  return (
    <select
      value={selected}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as QualificationPublishStatus)}
      className="rounded-lg border border-[#E8EDF5] bg-white px-2 py-1 text-[11px] font-medium text-[#0C2340]"
      aria-label={ariaLabel}
      title="DRAFT/ARCHIVED — yashirish; PUBLISHED — ochish (checklarsiz)"
    >
      {PUBLISH_STATUSES.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

type LessonStatusHandler = (
  direction: QualificationDirection,
  qualModule: QualificationModule,
  lesson: QualificationLesson,
  status: QualificationPublishStatus
) => void;

type ModuleStatusHandler = (
  direction: QualificationDirection,
  qualModule: QualificationModule,
  status: QualificationPublishStatus
) => void;

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query);
}

function materialLabel(type?: string) {
  const key = (type ?? "").toUpperCase();
  const icon = MATERIAL_ICONS[key] ?? (key === "LECTURE" ? "📘" : "•");
  if (key === "LECTURE") return `${icon} Qo'llanma`;
  if (key === "VIDEO" || key === "PRESENTATION" || key === "GUIDE" || key === "SEMINAR" || key === "LABORATORY" || key === "TEST") {
    return `${icon} ${materialTypeLabel(key)}`;
  }
  return `${icon} ${type || "Material"}`;
}

/** material.url to'liq bo'lsa resolveMediaUrl orqali ( /media → same-origin proxy ). */
function materialHref(material: QualificationMaterial) {
  const raw = (material.url || material.file_url || material.file?.url || "").trim();
  if (!raw) return "";
  return resolveMediaUrl(raw);
}

export default function QualificationTree({
  directions,
  query,
  loadingIds,
  onLoadDirection,
  onLoadLesson,
  onEditDirection,
  onDeleteDirection,
  onEditModule,
  onDeleteModule,
  onDeleteLesson,
  onChangeLessonStatus,
  onChangeModuleStatus,
  onAddModule,
}: {
  directions: QualificationDirection[];
  query: string;
  loadingIds: string[];
  onLoadDirection: (blogId: number) => void;
  onLoadLesson?: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void | Promise<void>;
  onEditDirection: (direction: QualificationDirection) => void;
  onDeleteDirection: (direction: QualificationDirection) => void;
  onAddModule?: (direction: QualificationDirection) => void;
  onEditModule: (direction: QualificationDirection, qualModule: QualificationModule) => void;
  onDeleteModule: (direction: QualificationDirection, qualModule: QualificationModule) => void;
  onDeleteLesson: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void;
  onChangeLessonStatus?: LessonStatusHandler;
  onChangeModuleStatus?: ModuleStatusHandler;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directions;
    const result: QualificationDirection[] = [];
    for (const direction of directions) {
      if (matchesQuery(direction.title, q)) {
        result.push(direction);
        continue;
      }
      const nested: QualificationModule[] = [];
      for (const qualModule of direction.modules ?? []) {
        if (matchesQuery(qualModule.title, q)) {
          nested.push(qualModule);
          continue;
        }
        const lessons = (qualModule.lessons ?? []).filter(
          (lesson) => matchesQuery(lesson.title, q) || matchesQuery(lesson.lesson_code ?? "", q)
        );
        if (lessons.length) nested.push({ ...qualModule, lessons });
      }
      if (nested.length) result.push({ ...direction, modules: nested });
    }
    return result;
  }, [directions, query]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#E8EDF5] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
        {query.trim()
          ? `“${query.trim()}” bo'yicha natija topilmadi.`
          : "Hozircha malaka oshirish yo'nalishlari mavjud emas."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((direction, index) => (
        <DirectionNode
          key={directionKey(direction)}
          direction={direction}
          defaultOpen={Boolean(query.trim()) || index === 0}
          loading={loadingIds.includes(directionKey(direction))}
          onLoadDirection={onLoadDirection}
          onLoadLesson={onLoadLesson}
          onEditDirection={onEditDirection}
          onDeleteDirection={onDeleteDirection}
          onAddModule={onAddModule}
          onEditModule={onEditModule}
          onDeleteModule={onDeleteModule}
          onDeleteLesson={onDeleteLesson}
          onChangeLessonStatus={onChangeLessonStatus}
          onChangeModuleStatus={onChangeModuleStatus}
        />
      ))}
    </div>
  );
}

function DirectionNode({
  direction,
  defaultOpen,
  loading,
  onLoadDirection,
  onLoadLesson,
  onEditDirection,
  onDeleteDirection,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onDeleteLesson,
  onChangeLessonStatus,
  onChangeModuleStatus,
}: {
  direction: QualificationDirection;
  defaultOpen: boolean;
  loading: boolean;
  onLoadDirection: (blogId: number) => void;
  onLoadLesson?: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void | Promise<void>;
  onEditDirection: (direction: QualificationDirection) => void;
  onDeleteDirection: (direction: QualificationDirection) => void;
  onAddModule?: (direction: QualificationDirection) => void;
  onEditModule: (direction: QualificationDirection, qualModule: QualificationModule) => void;
  onDeleteModule: (direction: QualificationDirection, qualModule: QualificationModule) => void;
  onDeleteLesson: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void;
  onChangeLessonStatus?: LessonStatusHandler;
  onChangeModuleStatus?: ModuleStatusHandler;
}) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? defaultOpen;
  const nested = direction.modules;
  const loaded = nested !== undefined;
  const blogId = direction.id;

  useEffect(() => {
    if (open && !loaded && !loading && blogId > 0) onLoadDirection(blogId);
  }, [open, loaded, loading, blogId, onLoadDirection]);

  const toggle = () => {
    const next = !open;
    setToggled(next);
    if (next && !loaded && blogId > 0) onLoadDirection(blogId);
  };

  return (
    <div className="rounded-xl border border-[#E8EDF5] bg-white">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left"
          aria-expanded={open}
        >
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#64748B] transition-transform", !open && "-rotate-90")} />
          <span className="break-words font-semibold text-[#0C2340]">{direction.title}</span>
          {direction.category_name || direction.category_id ? (
            <span className="truncate text-xs font-normal text-[#64748B]">
              {displayEducationCategoryName(direction.category_name) || direction.category_name}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onEditDirection(direction)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E8EDF5] text-[#0756F5]"
          aria-label="Tahrirlash"
          title="Tahrirlash"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {direction.id > 0 ? (
          <button
            type="button"
            onClick={() => onDeleteDirection(direction)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E8EDF5] text-red-600"
            aria-label="O'chirish"
            title="O'chirish"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onAddModule ? (
          <button
            type="button"
            onClick={() => onAddModule(direction)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[#0756F5] px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            {"Modul qo'shish"}
          </button>
        ) : direction.id > 0 ? (
          <Link
            href={qualificationWizardPath({
              step: 2,
              source: wizardSource(direction),
              directionId: wizardDirectionId(direction),
              directionTitle: direction.title,
              moduleNumber: nextModuleNumber(direction.modules),
            })}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[#0756F5] px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            {"Modul qo'shish"}
          </Link>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-1 border-t border-[#E8EDF5] px-4 py-2">
          {loading || !loaded ? (
            <div className="h-8 animate-pulse rounded-lg bg-[#E8EDF5]" />
          ) : nested.length === 0 ? (
            <p className="px-2 py-2 text-sm text-[#64748B]">{"Modul yo'q"}</p>
          ) : (
            nested.map((qualModule) => (
              <ModuleNode
                key={`${qualModule.source ?? "qualification"}-${qualModule.id}`}
                direction={direction}
                qualModule={qualModule}
                onLoadLesson={onLoadLesson}
                onEditModule={onEditModule}
                onDeleteModule={onDeleteModule}
                onDeleteLesson={onDeleteLesson}
                onChangeLessonStatus={onChangeLessonStatus}
                onChangeModuleStatus={onChangeModuleStatus}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ModuleNode({
  direction,
  qualModule,
  onLoadLesson,
  onEditModule,
  onDeleteModule,
  onDeleteLesson,
  onChangeLessonStatus,
  onChangeModuleStatus,
}: {
  direction: QualificationDirection;
  qualModule: QualificationModule;
  onLoadLesson?: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void | Promise<void>;
  onEditModule: (direction: QualificationDirection, qualModule: QualificationModule) => void;
  onDeleteModule: (direction: QualificationDirection, qualModule: QualificationModule) => void;
  onDeleteLesson: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void;
  onChangeLessonStatus?: LessonStatusHandler;
  onChangeModuleStatus?: ModuleStatusHandler;
}) {
  const [open, setOpen] = useState(true);
  const lessons = qualModule.lessons ?? [];
  const number = qualModule.module_number ?? "";
  return (
    <div className="rounded-lg">
      <div className="flex flex-wrap items-center gap-2 px-1 py-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left"
          aria-expanded={open}
        >
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#64748B] transition-transform", !open && "-rotate-90")} />
          <span className="break-words text-sm font-medium text-[#0C2340]">
            {number ? `${number}-Modul — ` : ""}
            {qualModule.title}
          </span>
        </button>
        {onChangeModuleStatus ? (
          <PublishStatusSelect
            value={qualModule.status}
            onChange={(status) => onChangeModuleStatus(direction, qualModule, status)}
            ariaLabel="Modul holati"
          />
        ) : (
          statusBadge(qualModule.status, qualModule.status_label)
        )}
        <Link
          href={qualificationWizardPath({
            step: 3,
            source: wizardSource(direction, qualModule),
            directionId: wizardDirectionId(direction, qualModule),
            directionTitle: direction.title,
            moduleId: qualModule.id,
            moduleNumber: qualModule.module_number,
            moduleTitle: qualModule.title,
            lessonNumber: nextLessonNumber(qualModule.lessons),
          })}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[#E8EDF5] px-2 py-1.5 text-xs font-medium text-[#0756F5]"
        >
          <Plus className="h-3.5 w-3.5" />
          {"Dars qo'shish"}
        </Link>
        <button
          type="button"
          onClick={() => onEditModule(direction, qualModule)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E8EDF5] text-[#0756F5]"
          aria-label="Tahrirlash"
          title="Tahrirlash"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDeleteModule(direction, qualModule)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E8EDF5] text-red-600"
          aria-label="O'chirish"
          title="O'chirish"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open ? (
        <ul className="ml-6 space-y-1 pb-2">
          {lessons.length === 0 ? <li className="text-sm text-[#64748B]">{"Dars yo'q"}</li> : null}
          {lessons.map((lesson) => (
            <LessonRow
              key={`${lesson.source ?? qualModule.source ?? "qualification"}-${lesson.id}`}
              direction={direction}
              qualModule={qualModule}
              lesson={lesson}
              onLoadLesson={onLoadLesson}
              onDeleteLesson={onDeleteLesson}
              onChangeLessonStatus={onChangeLessonStatus}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LessonRow({
  direction,
  qualModule,
  lesson,
  onLoadLesson,
  onDeleteLesson,
  onChangeLessonStatus,
}: {
  direction: QualificationDirection;
  qualModule: QualificationModule;
  lesson: QualificationLesson;
  onLoadLesson?: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void | Promise<void>;
  onDeleteLesson: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void;
  onChangeLessonStatus?: LessonStatusHandler;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const code = lesson.lesson_code || formatLessonCode(qualModule.module_number ?? null, lesson.lesson_number ?? null);
  const materials = lesson.materials;
  const kind = asLessonType(typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined);
  const directionId = direction.id;
  const moduleId = qualModule.id;
  const lessonId = lesson.id;

  useEffect(() => {
    if (!open || materials !== undefined || !onLoadLesson || loading || attempted) return;
    setLoading(true);
    void Promise.resolve(onLoadLesson(direction, qualModule, lesson))
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
        setAttempted(true);
      });
  }, [open, materials, onLoadLesson, loading, attempted, directionId, moduleId, lessonId]);

  return (
    <li>
      <div className="flex flex-col items-start justify-between gap-3 rounded-lg px-2 py-1.5 sm:flex-row">
        <button type="button" onClick={() => setOpen((value) => !value)} className="min-w-0 flex-1 text-left">
          <div className="flex items-start gap-2">
            <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-[#64748B] transition-transform", !open && "-rotate-90")} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#0C2340]">DARS {code || lesson.lesson_number || ""}</p>
              <p className="text-xs text-[#64748B]">{lesson.title}</p>
              {kind ? <p className="mt-1 text-[11px] font-semibold text-[#2563EB]">{lessonTypeLabel(kind)}</p> : null}
            </div>
          </div>
        </button>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {onChangeLessonStatus ? (
            <PublishStatusSelect
              value={lesson.status}
              onChange={(status) => onChangeLessonStatus(direction, qualModule, lesson, status)}
              ariaLabel="Dars holati"
            />
          ) : (
            statusBadge(lesson.status, lesson.status_label)
          )}
          <Link
            href={qualificationWizardPath({
              step: 4,
              source: wizardSource(direction, qualModule),
              directionId: wizardDirectionId(direction, qualModule),
              directionTitle: direction.title,
              moduleId: qualModule.id,
              moduleNumber: qualModule.module_number,
              moduleTitle: qualModule.title,
              lessonId: lesson.id,
              lessonNumber: lesson.lesson_number,
              lessonType: asLessonType(typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined),
              lessonTitle: lesson.title,
              lessonCode: lesson.lesson_code || code,
            })}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#E8EDF5] px-2 py-1 text-xs font-medium text-[#0756F5]"
          >
            <Plus className="h-3 w-3" />
            {"Material qo'shish"}
          </Link>
          <button
            type="button"
            onClick={() => onDeleteLesson(direction, qualModule, lesson)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#E8EDF5] text-red-600"
            aria-label="O'chirish"
            title="O'chirish"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && loading ? <p className="ml-8 text-xs text-[#64748B]">Materiallar yuklanmoqda...</p> : null}
      {open && materials && materials.length > 0 ? (
        <ul className="ml-8 space-y-1 text-xs text-[#64748B]">
          {materials.map((item) => {
            const type = typeof item.type === "string" ? item.type : undefined;
            const href = materialHref(item);
            return (
              <li key={`${item.source ?? "qualification"}-${item.id}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium text-[#0C2340]">{materialLabel(type)}</span>
                <span>{item.title || "Material"}</span>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[#0756F5] hover:underline"
                    title={href}
                  >
                    {type?.toUpperCase() === "VIDEO" ? "Video" : "Fayl"}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && !loading && materials && materials.length === 0 ? (
        <p className="ml-8 text-xs text-[#94A3B8]">Material yo'q.</p>
      ) : null}
    </li>
  );
}
