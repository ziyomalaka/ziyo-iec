"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import type {
  QualificationDirection,
  QualificationLesson,
  QualificationModule,
  QualificationPublishStatus,
} from "@/lib/api/types/qualification";
import { cn } from "@/lib/cn";
import { formatLessonCode, lessonTypeLabel } from "@/lib/qualification/constants";
import { asLessonType, qualificationWizardPath } from "@/lib/qualification/wizard-state";
import type { RetrainingPanel } from "@/lib/retraining/admin-panels";
import { blockLabel, buildContentTree, type RetrainingBlock } from "@/lib/retraining/content-blocks";

type LessonHandler = (
  direction: QualificationDirection,
  block: RetrainingBlock,
  qualModule: QualificationModule,
  lesson: QualificationLesson,
  status: QualificationPublishStatus
) => void;

type RetrainingBlockTreeProps = {
  panel: RetrainingPanel;
  direction: QualificationDirection;
  loadingIds: string[];
  onLoadLesson?: (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void | Promise<void>;
  onLoadModuleLessons?: (qualModule: QualificationModule) => void | Promise<void>;
  onAddBlock: () => void;
  onAddModule: (block: RetrainingBlock) => void;
  onEditBlock?: (block: RetrainingBlock) => void;
  onDeleteBlock?: (block: RetrainingBlock) => void;
  onEditModule: (block: RetrainingBlock, qualModule: QualificationModule) => void;
  onDeleteModule: (block: RetrainingBlock, qualModule: QualificationModule) => void;
  onDeleteLesson: (
    block: RetrainingBlock,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => void;
  onChangeLessonStatus?: LessonHandler;
  onChangeModuleStatus?: (
    direction: QualificationDirection,
    block: RetrainingBlock,
    qualModule: QualificationModule,
    status: QualificationPublishStatus
  ) => void;
  buildLessonHref?: (
    direction: QualificationDirection,
    block: RetrainingBlock,
    qualModule: QualificationModule,
    lesson: QualificationLesson
  ) => string;
};

const PUBLISH_STATUSES: { value: QualificationPublishStatus; label: string }[] = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "PUBLISHED", label: "PUBLISHED" },
  { value: "INACTIVE", label: "INACTIVE" },
  { value: "ARCHIVED", label: "ARCHIVED" },
];

function statusBadge(status?: string) {
  const upper = (status ?? "").toUpperCase();
  if (!upper) return null;
  return (
    <DashboardBadge variant={upper === "PUBLISHED" ? "success" : "neutral"}>{upper}</DashboardBadge>
  );
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
      title="DRAFT/ARCHIVED — yashirish; PUBLISHED — ochish"
    >
      {PUBLISH_STATUSES.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export default function RetrainingBlockTree({
  panel,
  direction,
  loadingIds,
  onLoadLesson,
  onLoadModuleLessons,
  onAddBlock,
  onAddModule,
  onEditBlock,
  onDeleteBlock,
  onEditModule,
  onDeleteModule,
  onDeleteLesson,
  onChangeLessonStatus,
  onChangeModuleStatus,
  buildLessonHref,
}: RetrainingBlockTreeProps) {
  const tree = useMemo(() => buildContentTree(direction, direction.modules ?? []), [direction]);

  if (!tree.blocks.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8EDF5] bg-white px-4 py-10 text-center">
        <p className="text-sm text-[#64748B]">Hozircha bloklar mavjud emas.</p>
        <button
          type="button"
          onClick={onAddBlock}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white"
        >
          <Plus className="h-4 w-4" />
          Blok qo&apos;shish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAddBlock}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs font-medium text-[#0756F5]"
        >
          <Plus className="h-3.5 w-3.5" />
          Blok qo&apos;shish
        </button>
      </div>

      {tree.blocks.map(({ block, modules }) => (
        <BlockNode
          key={block.id}
          panel={panel}
          direction={direction}
          block={block}
          modules={modules}
          loadingIds={loadingIds}
          onLoadLesson={onLoadLesson}
          onLoadModuleLessons={onLoadModuleLessons}
          onAddModule={() => onAddModule(block)}
          onEditBlock={onEditBlock ? () => onEditBlock(block) : undefined}
          onDeleteBlock={onDeleteBlock ? () => onDeleteBlock(block) : undefined}
          onEditModule={(qualModule) => onEditModule(block, qualModule)}
          onDeleteModule={(qualModule) => onDeleteModule(block, qualModule)}
          onDeleteLesson={(qualModule, lesson) => onDeleteLesson(block, qualModule, lesson)}
          onChangeLessonStatus={onChangeLessonStatus}
          onChangeModuleStatus={onChangeModuleStatus}
          buildLessonHref={buildLessonHref}
        />
      ))}

      {tree.unassignedModules.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Blokka biriktirilmagan modullar</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {tree.unassignedModules.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BlockNode({
  panel,
  direction,
  block,
  modules,
  loadingIds,
  onLoadLesson,
  onLoadModuleLessons,
  onAddModule,
  onEditBlock,
  onDeleteBlock,
  onEditModule,
  onDeleteModule,
  onDeleteLesson,
  onChangeLessonStatus,
  onChangeModuleStatus,
  buildLessonHref,
}: {
  panel: RetrainingPanel;
  direction: QualificationDirection;
  block: RetrainingBlock;
  modules: QualificationModule[];
  loadingIds: string[];
  onLoadLesson?: RetrainingBlockTreeProps["onLoadLesson"];
  onLoadModuleLessons?: RetrainingBlockTreeProps["onLoadModuleLessons"];
  onAddModule: () => void;
  onEditBlock?: () => void;
  onDeleteBlock?: () => void;
  onEditModule: (qualModule: QualificationModule) => void;
  onDeleteModule: (qualModule: QualificationModule) => void;
  onDeleteLesson: (qualModule: QualificationModule, lesson: QualificationLesson) => void;
  onChangeLessonStatus?: LessonHandler;
  onChangeModuleStatus?: RetrainingBlockTreeProps["onChangeModuleStatus"];
  buildLessonHref?: RetrainingBlockTreeProps["buildLessonHref"];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-[#E8EDF5] bg-white">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#64748B] transition-transform", !open && "-rotate-90")} />
          <span className="font-semibold text-[#0C2340]">{blockLabel(block)}</span>
        </button>
        {onEditBlock ? (
          <button
            type="button"
            title="Tahrirlash"
            aria-label="Tahrirlash"
            onClick={(event) => {
              event.stopPropagation();
              onEditBlock();
            }}
            className="rounded border border-[#E8EDF5] p-1.5 text-[#0756F5]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onDeleteBlock ? (
          <button
            type="button"
            title="O'chirish"
            aria-label="O'chirish"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteBlock();
            }}
            className="rounded border border-[#E8EDF5] p-1.5 text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAddModule();
          }}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#0756F5] px-3 py-1.5 text-xs font-medium text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Modul qo&apos;shish
        </button>
      </div>
      {open ? (
        <div className="space-y-1 border-t border-[#E8EDF5] px-4 py-2">
          {modules.length === 0 ? (
            <p className="px-2 py-2 text-sm text-[#64748B]">Hozircha modullar mavjud emas.</p>
          ) : (
            modules.map((qualModule) => (
              <ModuleNode
                key={qualModule.id}
                panel={panel}
                direction={direction}
                block={block}
                qualModule={qualModule}
                loading={loadingIds.includes(`module-${qualModule.id}`)}
                onLoadLesson={onLoadLesson}
                onLoadModuleLessons={onLoadModuleLessons}
                onEditModule={() => onEditModule(qualModule)}
                onDeleteModule={() => onDeleteModule(qualModule)}
                onDeleteLesson={(lesson) => onDeleteLesson(qualModule, lesson)}
                onChangeLessonStatus={onChangeLessonStatus}
                onChangeModuleStatus={onChangeModuleStatus}
                buildLessonHref={buildLessonHref}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ModuleNode({
  panel,
  direction,
  block,
  qualModule,
  loading,
  onLoadLesson,
  onLoadModuleLessons,
  onEditModule,
  onDeleteModule,
  onDeleteLesson,
  onChangeLessonStatus,
  onChangeModuleStatus,
  buildLessonHref,
}: {
  panel: RetrainingPanel;
  direction: QualificationDirection;
  block: RetrainingBlock;
  qualModule: QualificationModule;
  loading: boolean;
  onLoadLesson?: RetrainingBlockTreeProps["onLoadLesson"];
  onLoadModuleLessons?: RetrainingBlockTreeProps["onLoadModuleLessons"];
  onEditModule: () => void;
  onDeleteModule: () => void;
  onDeleteLesson: (lesson: QualificationLesson) => void;
  onChangeLessonStatus?: LessonHandler;
  onChangeModuleStatus?: RetrainingBlockTreeProps["onChangeModuleStatus"];
  buildLessonHref?: RetrainingBlockTreeProps["buildLessonHref"];
}) {
  const [open, setOpen] = useState(false);
  const lessonsLoaded = qualModule.lessons !== undefined;
  const lessons = qualModule.lessons ?? [];

  useEffect(() => {
    if (!open || lessonsLoaded || !onLoadModuleLessons) return;
    void onLoadModuleLessons(qualModule);
  }, [open, lessonsLoaded, onLoadModuleLessons, qualModule]);

  return (
    <div className="rounded-lg border border-[#EEF2F8] bg-[#FAFBFD] px-2 py-1">
      <div className="flex flex-wrap items-center gap-2 py-1">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className={cn("h-3.5 w-3.5 text-[#64748B]", !open && "-rotate-90")} />
          <span className="text-sm font-medium text-[#0C2340]">
            {qualModule.module_number ? `${qualModule.module_number}-modul. ` : ""}
            {qualModule.title}
          </span>
        </button>
        {onChangeModuleStatus ? (
          <PublishStatusSelect
            value={qualModule.status}
            onChange={(status) => onChangeModuleStatus(direction, block, qualModule, status)}
            ariaLabel="Modul holati"
          />
        ) : (
          statusBadge(qualModule.status)
        )}
        <button type="button" onClick={onEditModule} className="rounded border border-[#E8EDF5] p-1.5 text-[#0756F5]">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onDeleteModule} className="rounded border border-[#E8EDF5] p-1.5 text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <Link
          href={qualificationWizardPath({
            step: 3,
            source: "retraining",
            retrainingPanel: panel,
            directionId: direction.id,
            directionTitle: direction.title,
            blockId: block.id,
            moduleId: qualModule.id,
            moduleNumber: qualModule.module_number,
            moduleTitle: qualModule.title,
          })}
          className="rounded border border-[#E8EDF5] px-2 py-1 text-xs text-[#0756F5]"
        >
          + Dars
        </Link>
      </div>
      {open ? (
        <ul className="ml-6 space-y-1 pb-2">
          {loading || (!lessonsLoaded && open) ? (
            <li className="text-xs text-[#64748B]">Yuklanmoqda...</li>
          ) : null}
          {lessonsLoaded && !loading && lessons.length === 0 ? (
            <li className="text-xs text-[#94A3B8]">Hozircha darslar mavjud emas.</li>
          ) : null}
          {lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              direction={direction}
              block={block}
              qualModule={qualModule}
              lesson={lesson}
              onLoadLesson={onLoadLesson}
              onDelete={() => onDeleteLesson(lesson)}
              onChangeStatus={onChangeLessonStatus}
              detailHref={buildLessonHref?.(direction, block, qualModule, lesson)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LessonRow({
  direction,
  block,
  qualModule,
  lesson,
  onLoadLesson,
  onDelete,
  onChangeStatus,
  detailHref,
}: {
  direction: QualificationDirection;
  block: RetrainingBlock;
  qualModule: QualificationModule;
  lesson: QualificationLesson;
  onLoadLesson?: RetrainingBlockTreeProps["onLoadLesson"];
  onDelete: () => void;
  onChangeStatus?: LessonHandler;
  detailHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const code = lesson.lesson_code || formatLessonCode(qualModule.module_number ?? null, lesson.lesson_number ?? null);
  const kind = asLessonType(typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined);

  useEffect(() => {
    if (!open || lesson.materials !== undefined || !onLoadLesson || loading) return;
    setLoading(true);
    void Promise.resolve(onLoadLesson(direction, qualModule, lesson)).finally(() => setLoading(false));
  }, [open, lesson.materials, onLoadLesson, loading, direction, qualModule, lesson]);

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 py-1">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left text-xs">
          <span className="font-medium text-[#0C2340]">Dars {code}</span>
          <span className="text-[#64748B]"> — {lesson.title}</span>
          {kind ? <span className="ml-1 text-[#2563EB]">({lessonTypeLabel(kind)})</span> : null}
        </button>
        {onChangeStatus ? (
          <PublishStatusSelect
            value={lesson.status}
            onChange={(status) => onChangeStatus(direction, block, qualModule, lesson, status)}
            ariaLabel="Dars holati"
          />
        ) : (
          statusBadge(lesson.status)
        )}
        {detailHref ? (
          <Link href={detailHref} className="text-xs text-[#0756F5]">
            Batafsil
          </Link>
        ) : null}
        <button type="button" onClick={onDelete} className="text-xs text-red-600">
          O&apos;chirish
        </button>
      </div>
      {open && loading ? <p className="text-xs text-[#64748B]">Materiallar yuklanmoqda...</p> : null}
      {open && lesson.materials?.length ? (
        <ul className="ml-3 space-y-0.5 text-xs text-[#64748B]">
          {lesson.materials.map((m) => (
            <li key={m.id}>{m.title || m.type}</li>
          ))}
        </ul>
      ) : null}
      {open && !loading && lesson.materials && lesson.materials.length === 0 ? (
        <p className="text-xs text-[#94A3B8]">Hozircha materiallar mavjud emas.</p>
      ) : null}
    </li>
  );
}
