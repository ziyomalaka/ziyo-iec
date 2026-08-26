"use client";

import { cn } from "@/lib/cn";
import type { ContentSource, QualificationDirection, QualificationLessonType, QualificationMaterialType } from "@/lib/api/types/qualification";
import { LESSON_TYPE_OPTIONS, MATERIAL_TYPE_OPTIONS, formatLessonCode, lessonTypeLabel } from "@/lib/qualification/constants";
import { directionKey } from "@/lib/qualification/it-bridge";
import type { MaterialWizardState } from "@/lib/api/types/qualification";

const field = "mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm";

export function DirectionStep({
  directions,
  loading,
  value,
  source,
  error,
  onChange,
  onCreate,
}: {
  directions: QualificationDirection[];
  loading: boolean;
  value: number | null;
  source?: ContentSource;
  error?: string;
  onChange: (id: number, title: string, source?: ContentSource) => void;
  onCreate?: () => void;
}) {
  return (
    <div className="max-w-xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#0C2340]">{"Yo'nalishni tanlash"}</h2>
        {onCreate ? (
          <button type="button" onClick={onCreate} className="text-sm font-medium text-[#0756F5]">
            {"+ Yangi yo'nalish"}
          </button>
        ) : null}
      </div>
      <label className="block text-sm" htmlFor="qualification-direction">
        {"Yo'nalish *"}
        <select
          id="qualification-direction"
          value={value ? `${source ?? "qualification"}-${value}` : ""}
          disabled={loading}
          onChange={(e) => {
            const raw = e.target.value;
            const item = directions.find((row) => `${row.source ?? "qualification"}-${row.id}` === raw);
            if (item) onChange(item.id, item.title, item.source);
          }}
          className={field}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "qualification-direction-error" : undefined}
        >
          <option value="">Tanlang</option>
          {directions.map((item) => (
            <option key={directionKey(item)} value={`${item.source ?? "qualification"}-${item.id}`}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p id="qualification-direction-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ModuleStep({
  directionTitle,
  moduleNumber,
  moduleTitle,
  errors,
  onNumber,
  onTitle,
}: {
  directionTitle?: string;
  moduleNumber: number | null;
  moduleTitle: string;
  errors?: { module_number?: string; title?: string };
  onNumber: (value: number) => void;
  onTitle: (value: string) => void;
}) {
  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-bold text-[#0C2340]">{"Modul qo'shish"}</h2>
      <p className="text-sm text-[#64748B]">
        {"Yo'nalish"}
        <br />
        <span className="font-medium text-[#0C2340]">{directionTitle}</span>
      </p>
      <label className="block text-sm">
        Modul raqami *
        <input
          type="number"
          min={1}
          value={moduleNumber ?? ""}
          onChange={(e) => onNumber(Number(e.target.value))}
          className={field}
        />
        {errors?.module_number ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.module_number}
          </p>
        ) : null}
      </label>
      <label className="block text-sm">
        Modul mavzusi *
        <input value={moduleTitle} onChange={(e) => onTitle(e.target.value)} className={field} />
        {errors?.title ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.title}
          </p>
        ) : null}
      </label>
    </div>
  );
}

export function LessonStep({
  state,
  errors,
  onType,
  onNumber,
  onTitle,
}: {
  state: MaterialWizardState;
  errors?: { lesson_number?: string; title?: string; lesson_type?: string };
  onType: (value: QualificationLessonType) => void;
  onNumber: (value: number) => void;
  onTitle: (value: string) => void;
}) {
  const preview = formatLessonCode(state.moduleNumber, state.lessonNumber);
  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-bold text-[#0C2340]">{"DARS QO'SHISH"}</h2>
      <p className="text-sm text-[#64748B]">
        Modul
        <br />
        <span className="font-medium text-[#0C2340]">
          {state.moduleNumber}-Modul — {state.moduleTitle}
        </span>
      </p>
      <fieldset>
        <legend className="text-sm">Dars turi *</legend>
        <div className="mt-2 flex gap-4">
          {LESSON_TYPE_OPTIONS.map((item) => (
            <label key={item.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="lessonType"
                checked={state.lessonType === item.value}
                onChange={() => onType(item.value)}
              />
              {item.label}
            </label>
          ))}
        </div>
        {errors?.lesson_type ? <p className="mt-1 text-sm text-red-600">{errors.lesson_type}</p> : null}
      </fieldset>
      <label className="block text-sm">
        Dars raqami *
        <input
          type="number"
          min={1}
          value={state.lessonNumber ?? ""}
          onChange={(e) => onNumber(Number(e.target.value))}
          className={field}
        />
        {errors?.lesson_number ? <p className="mt-1 text-sm text-red-600">{errors.lesson_number}</p> : null}
      </label>
      <label className="block text-sm">
        Dars mavzusi *
        <input value={state.lessonTitle} onChange={(e) => onTitle(e.target.value)} className={field} />
        {errors?.title ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.title}
          </p>
        ) : null}
      </label>
      {preview && state.lessonTitle.trim() ? (
        <p className="rounded-lg bg-[#F7F9FC] px-3 py-2 text-sm font-medium text-[#0C2340]">
          DARS {preview} — {state.lessonTitle.trim()}
        </p>
      ) : null}
    </div>
  );
}

export function MaterialTypeStep({
  lessonCode,
  lessonTitle,
  selected,
  onToggle,
}: {
  lessonCode: string;
  lessonTitle?: string;
  selected: QualificationMaterialType[];
  onToggle: (type: QualificationMaterialType) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#0C2340]">{"MATERIAL QO'SHISH"}</h2>
      <div>
        <p className="font-semibold text-[#0C2340]">DARS {lessonCode || "—"}</p>
        {lessonTitle ? <p className="text-sm text-[#64748B]">{lessonTitle}</p> : null}
      </div>
      <p className="text-sm text-[#64748B]">{"Qanday material qo'shiladi?"}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MATERIAL_TYPE_OPTIONS.map((item) => {
          const checked = selected.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onToggle(item.value)}
              className={cn(
                "rounded-xl border p-4 text-left",
                checked ? "border-[#0756F5] bg-[#EEF4FF]" : "border-[#E8EDF5] bg-white"
              )}
              aria-pressed={checked}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#0C2340]">{item.label}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{item.hint}</p>
                </div>
                <span
                  className={cn(
                    "mt-1 flex h-5 w-5 items-center justify-center rounded border text-xs",
                    checked ? "border-[#0756F5] bg-[#0756F5] text-white" : "border-[#CBD5E1] bg-white"
                  )}
                  aria-hidden
                >
                  {checked ? "✓" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewStep({
  state,
  onEdit,
}: {
  state: MaterialWizardState;
  onEdit: (step: number) => void;
}) {
  const code = state.lessonCode || formatLessonCode(state.moduleNumber, state.lessonNumber);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#0C2340]">Tekshirish</h2>
      <ReviewBlock title="Yo'nalish" onEdit={() => onEdit(1)}>
        {state.directionTitle}
      </ReviewBlock>
      <ReviewBlock title="Modul" onEdit={() => onEdit(2)}>
        {state.moduleNumber}-Modul
        <br />
        {state.moduleTitle}
      </ReviewBlock>
      <ReviewBlock title="Dars" onEdit={() => onEdit(3)}>
        DARS {code}
        <br />
        {state.lessonTitle}
        <br />
        Dars turi: {state.lessonType ? lessonTypeLabel(state.lessonType) : "—"}
      </ReviewBlock>
      <ReviewBlock title="Materiallar" onEdit={() => onEdit(4)}>
        <ul className="space-y-2">
          {state.materials.map((item) => (
            <li key={item.type}>
              ✓ {item.title || item.type}
              {item.durationLabel ? ` · ${item.durationLabel}` : ""}
              {item.fileSize ? ` · ${(item.fileSize / (1024 * 1024)).toFixed(0)} MB` : ""}
            </li>
          ))}
        </ul>
      </ReviewBlock>
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E8EDF5] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-[#64748B] uppercase">{title}</p>
        <button type="button" onClick={onEdit} className="text-sm text-[#0756F5]">
          Tahrirlash
        </button>
      </div>
      <div className="text-sm text-[#0C2340]">{children}</div>
    </div>
  );
}

export function SuccessStep({
  code,
  title,
  onView,
  onAgain,
  onHome,
}: {
  code: string;
  title: string;
  onView: () => void;
  onAgain: () => void;
  onHome: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[#E8EDF5] bg-white p-8 text-center">
      <p className="text-4xl text-emerald-600">✓</p>
      <h2 className="mt-3 text-xl font-bold text-[#0C2340]">Dars muvaffaqiyatli nashr qilindi</h2>
      <p className="mt-2 text-sm text-[#64748B]">
        DARS {code}
        <br />
        {title}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button type="button" onClick={onView} className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white">
          {"Darsni ko'rish"}
        </button>
        <button type="button" onClick={onAgain} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
          {"Yana material qo'shish"}
        </button>
        <button type="button" onClick={onHome} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
          Malaka oshirishga qaytish
        </button>
      </div>
    </div>
  );
}
