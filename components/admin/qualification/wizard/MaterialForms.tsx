"use client";

import { useState } from "react";
import { toast } from "sonner";
import FileUploader from "@/components/admin/qualification/wizard/FileUploader";
import { ApiError } from "@/lib/api/errors";
import { createItLessonTestWithQuestions } from "@/lib/api/admin-it";
import { createLessonTest } from "@/lib/api/qualification";
import type { MaterialFormData, TestQuestion, TestQuestionOptionKey } from "@/lib/api/types/qualification";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/qualification/constants";
import { emptyQuestions } from "@/lib/qualification/wizard-state";

const field = "mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm";
const KEYS: TestQuestionOptionKey[] = ["A", "B", "C", "D"];

type FormProps = {
  value: MaterialFormData;
  onChange: (value: MaterialFormData) => void;
  disabled?: boolean;
  onRetryUpload?: () => void;
  lessonId?: number;
  source?: string;
};

function patch(value: MaterialFormData, onChange: (value: MaterialFormData) => void, next: Partial<MaterialFormData>) {
  onChange({ ...value, ...next, uploaded: false, uploadError: undefined });
}

export function VideoMaterialForm({ value, onChange, disabled, onRetryUpload }: FormProps) {
  const onFile = async (file: File | null) => {
    if (!file) {
      patch(value, onChange, { file: null, fileName: "", fileSize: 0, durationSeconds: null, durationLabel: "" });
      return;
    }
    const duration = await readVideoDuration(file);
    patch(value, onChange, {
      file,
      fileName: file.name,
      fileSize: file.size,
      durationSeconds: duration,
      durationLabel: duration ? formatDuration(duration) : "",
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#E8EDF5] p-4">
      <h3 className="font-semibold text-[#0C2340]">VIDEO</h3>
      <label className="block text-sm">
        Video nomi *
        <input value={value.title} onChange={(e) => patch(value, onChange, { title: e.target.value })} className={field} />
      </label>
      <FileUploader
        label="Video fayli *"
        value={value.file}
        fileName={value.fileName}
        fileSize={value.fileSize}
        onChange={(file) => void onFile(file)}
        disabled={disabled}
      />
      <label className="block text-sm">
        Tavsif
        <textarea value={value.description ?? ""} onChange={(e) => patch(value, onChange, { description: e.target.value })} rows={3} className={field} />
      </label>
      <p className="text-sm text-[#64748B]">Davomiyligi: {value.durationLabel || "—"}</p>
      <UploadStatus value={value} onRetry={onRetryUpload} />
    </section>
  );
}

export function PresentationMaterialForm({ value, onChange, disabled, onRetryUpload }: FormProps) {
  return (
    <section className="space-y-3 rounded-xl border border-[#E8EDF5] p-4">
      <h3 className="font-semibold text-[#0C2340]">TAQDIMOT</h3>
      <label className="block text-sm">
        Taqdimot nomi *
        <input value={value.title} onChange={(e) => patch(value, onChange, { title: e.target.value })} className={field} />
      </label>
      <FileUploader
        label="Fayl *"
        value={value.file}
        fileName={value.fileName}
        fileSize={value.fileSize}
        onChange={(file) =>
          patch(value, onChange, { file, fileName: file?.name, fileSize: file?.size })
        }
        disabled={disabled}
      />
      <UploadStatus value={value} onRetry={onRetryUpload} />
    </section>
  );
}

export function GuideMaterialForm({ value, onChange, disabled, onRetryUpload }: FormProps) {
  return (
    <section className="space-y-3 rounded-xl border border-[#E8EDF5] p-4">
      <h3 className="font-semibold text-[#0C2340]">MA'RUZA MATNI</h3>
      <label className="block text-sm">
        Ma'ruza nomi *
        <input value={value.title} onChange={(e) => patch(value, onChange, { title: e.target.value })} className={field} />
      </label>
      <label className="block text-sm">
        Ma'ruza matni *
        <textarea
          value={value.description ?? ""}
          onChange={(e) => patch(value, onChange, { description: e.target.value })}
          rows={8}
          className={field}
        />
      </label>
      <FileUploader
        label="Qo'shimcha fayl"
        value={value.file}
        fileName={value.fileName}
        fileSize={value.fileSize}
        onChange={(file) => patch(value, onChange, { file, fileName: file?.name, fileSize: file?.size })}
        disabled={disabled}
      />
      <UploadStatus value={value} onRetry={onRetryUpload} />
    </section>
  );
}

export function SeminarMaterialForm({ value, onChange, disabled, onRetryUpload }: FormProps) {
  return (
    <section className="space-y-3 rounded-xl border border-[#E8EDF5] p-4">
      <h3 className="font-semibold text-[#0C2340]">SEMINAR</h3>
      <label className="block text-sm">
        Seminar mavzusi *
        <input value={value.title} onChange={(e) => patch(value, onChange, { title: e.target.value })} className={field} />
      </label>
      <label className="block text-sm">
        Topshiriq *
        <textarea value={value.assignment ?? ""} onChange={(e) => patch(value, onChange, { assignment: e.target.value })} rows={4} className={field} />
      </label>
      <label className="block text-sm">
        {"Ko'rsatma"}
        <textarea value={value.instruction ?? ""} onChange={(e) => patch(value, onChange, { instruction: e.target.value })} rows={3} className={field} />
      </label>
      <FileUploader
        label="Qo'shimcha fayl"
        value={value.file}
        fileName={value.fileName}
        fileSize={value.fileSize}
        onChange={(file) => patch(value, onChange, { file, fileName: file?.name, fileSize: file?.size })}
        disabled={disabled}
      />
      <UploadStatus value={value} onRetry={onRetryUpload} />
    </section>
  );
}

export function LaboratoryMaterialForm({ value, onChange, disabled, onRetryUpload }: FormProps) {
  return (
    <section className="space-y-3 rounded-xl border border-[#E8EDF5] p-4">
      <h3 className="font-semibold text-[#0C2340]">LABORATORIYA</h3>
      <label className="block text-sm">
        Laboratoriya mavzusi *
        <input value={value.title} onChange={(e) => patch(value, onChange, { title: e.target.value })} className={field} />
      </label>
      <label className="block text-sm">
        Maqsad *
        <textarea value={value.goal ?? ""} onChange={(e) => patch(value, onChange, { goal: e.target.value })} rows={2} className={field} />
      </label>
      <label className="block text-sm">
        Bajarish tartibi *
        <textarea value={value.procedure ?? ""} onChange={(e) => patch(value, onChange, { procedure: e.target.value })} rows={4} className={field} />
      </label>
      <label className="block text-sm">
        Topshiriq *
        <textarea value={value.assignment ?? ""} onChange={(e) => patch(value, onChange, { assignment: e.target.value })} rows={3} className={field} />
      </label>
      <FileUploader
        label="Qo'shimcha fayl"
        value={value.file}
        fileName={value.fileName}
        fileSize={value.fileSize}
        onChange={(file) => patch(value, onChange, { file, fileName: file?.name, fileSize: file?.size })}
        disabled={disabled}
      />
      <UploadStatus value={value} onRetry={onRetryUpload} />
    </section>
  );
}

export function TestMaterialForm({ value, onChange, disabled, lessonId, source }: FormProps) {
  const [testStep, setTestStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState("");

  const questions: TestQuestion[] = value.questions?.length ? value.questions : emptyQuestions();
  const isBusy = saving || Boolean(disabled);

  const updateQuestions = (next: TestQuestion[]) => {
    const safe = next.length ? next : emptyQuestions();
    onChange({ ...value, questions: safe, questionsCount: safe.length, uploaded: false, uploadError: undefined });
  };

  const goNext = () => {
    setStepError("");
    if (testStep === 1) {
      if (questions.some((q) => !q.question.trim())) {
        setStepError("Savol matnini kiriting");
        return;
      }
      setTestStep(2);
    } else if (testStep === 2) {
      if (questions.some((q) => q.options.some((o) => !o.text.trim()))) {
        setStepError("Barcha javob variantlarini kiriting");
        return;
      }
      setTestStep(3);
    }
  };

  const goBack = () => {
    setStepError("");
    setTestStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  const handleSave = async () => {
    setStepError("");
    if (questions.some((q) => !q.correctAnswer)) {
      setStepError("Har bir savol uchun to'g'ri javobni belgilang");
      return;
    }
    if (!lessonId) {
      setStepError("Dars ID topilmadi. Avval dars yarating.");
      return;
    }
    console.log("ADMIN TEST SAVE lessonId (form):", lessonId);
    console.log("ADMIN TEST SAVE source:", source ?? "qualification");
    setSaving(true);
    try {
      const isItSource = source === "it";
      const result = isItSource
        ? await createItLessonTestWithQuestions(lessonId, { ...value, questions })
        : await createLessonTest(lessonId, { ...value, questions });
      console.log("ADMIN TEST SAVE result:", result);
      onChange({
        ...value,
        questions,
        questionsCount: questions.length,
        uploaded: true,
        uploadProgress: 100,
        serverId: result.id,
        uploadError: undefined,
      });
      toast.success("✓ Test saqlandi");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Test saqlanmadi";
      setStepError(msg);
      onChange({ ...value, uploadError: msg });
    } finally {
      setSaving(false);
    }
  };

  if (value.uploaded) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-emerald-800">✓ Test saqlandi</p>
            <p className="mt-0.5 text-sm text-emerald-700">
              {questions.length} ta savol · {value.title || "Test"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTestStep(1);
              onChange({ ...value, uploaded: false, uploadProgress: 0, serverId: undefined, uploadError: undefined });
            }}
            className="text-xs text-emerald-700 underline hover:no-underline"
          >
            Tahrirlash
          </button>
        </div>
      </section>
    );
  }

  const stepLabels = ["Savollar", "Javoblar", "To'g'ri javoblar"] as const;

  return (
    <section className="rounded-xl border border-[#E8EDF5] p-4">
      <h3 className="mb-4 font-semibold text-[#0C2340]">TEST</h3>

      {/* Test sozlamalari */}
      <fieldset disabled={isBusy} className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          Test nomi *
          <input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value, uploaded: false })}
            className={field}
          />
        </label>
        <label className="block text-sm">
          {"O'tish bali (%)"}
          <input
            type="number"
            min={0}
            max={100}
            value={value.passingScore ?? 70}
            onChange={(e) => onChange({ ...value, passingScore: Number(e.target.value), uploaded: false })}
            className={field}
          />
        </label>
        <label className="block text-sm">
          Vaqt (daqiqa)
          <input
            type="number"
            min={1}
            value={value.durationMinutes ?? 30}
            onChange={(e) => onChange({ ...value, durationMinutes: Number(e.target.value), uploaded: false })}
            className={field}
          />
        </label>
        <label className="block text-sm">
          Urinishlar soni
          <input
            type="number"
            min={1}
            value={value.attempts ?? 2}
            onChange={(e) => onChange({ ...value, attempts: Number(e.target.value), uploaded: false })}
            className={field}
          />
        </label>
      </fieldset>

      {/* Bosqich ko'rsatkichi */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = testStep > n;
          const active = testStep === n;
          return (
            <span key={n} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className="text-[#CBD5E1]">→</span>}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  active
                    ? "bg-[#0756F5] text-white"
                    : done
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-[#94A3B8]"
                )}
              >
                {n}. {label}
              </span>
            </span>
          );
        })}
      </div>

      {/* 1-bosqich: Savol matnlari */}
      {testStep === 1 && (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div key={q.id} className="rounded-lg border border-[#E8EDF5] p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-[#0C2340]">{index + 1}-savol</p>
                {questions.length > 1 && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => updateQuestions(questions.filter((item) => item.id !== q.id))}
                    className="text-xs text-red-500 disabled:opacity-50"
                  >
                    {"O'chirish"}
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                placeholder="Savol matnini kiriting"
                value={q.question}
                disabled={isBusy}
                onChange={(e) =>
                  updateQuestions(
                    questions.map((item) =>
                      item.id === q.id ? { ...item, question: e.target.value } : item
                    )
                  )
                }
                className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => updateQuestions([...questions, ...emptyQuestions()])}
            className="rounded-lg border border-dashed border-[#CBD5E1] px-4 py-2 text-sm text-[#64748B] disabled:opacity-50"
          >
            + Savol qo&apos;shish
          </button>
        </div>
      )}

      {/* 2-bosqich: Javob variantlari */}
      {testStep === 2 && (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="rounded-lg border border-[#E8EDF5] p-3">
              <p className="mb-2 text-sm font-medium text-[#0C2340]">
                {index + 1}-savol:{" "}
                <span className="font-normal text-[#64748B]">{q.question}</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {KEYS.map((key) => (
                  <label key={key} className="block text-sm">
                    {key})
                    <input
                      placeholder={`${key} javob`}
                      disabled={isBusy}
                      value={q.options.find((o) => o.key === key)?.text ?? ""}
                      onChange={(e) => {
                        const text = e.target.value;
                        updateQuestions(
                          questions.map((item) =>
                            item.id === q.id
                              ? {
                                  ...item,
                                  options: item.options.map((o) =>
                                    o.key === key ? { ...o, text } : o
                                  ),
                                }
                              : item
                          )
                        );
                      }}
                      className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3-bosqich: To'g'ri javoblar */}
      {testStep === 3 && (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="rounded-lg border border-[#E8EDF5] p-3">
              <p className="mb-2 text-sm font-medium text-[#0C2340]">
                {index + 1}-savol:{" "}
                <span className="font-normal text-[#64748B]">{q.question}</span>
              </p>
              <div className="space-y-1.5">
                {KEYS.map((key) => {
                  const optText = q.options.find((o) => o.key === key)?.text ?? "";
                  const isCorrect = q.correctAnswer === key;
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-[#E8EDF5] hover:bg-[#F8FAFC]"
                      )}
                    >
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        value={key}
                        checked={isCorrect}
                        disabled={isBusy}
                        onChange={() =>
                          updateQuestions(
                            questions.map((item) =>
                              item.id === q.id ? { ...item, correctAnswer: key } : item
                            )
                          )
                        }
                        className="accent-emerald-600"
                      />
                      <span className="text-sm">
                        <span className="font-medium">{key})</span>{" "}
                        <span className={isCorrect ? "font-medium text-emerald-800" : "text-[#374151]"}>
                          {optText}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Xato xabari */}
      {stepError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{stepError}</p>
      )}

      {/* Navigatsiya */}
      <div className="mt-4 flex items-center justify-between">
        {testStep > 1 ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={goBack}
            className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-50"
          >
            ← Orqaga
          </button>
        ) : (
          <span />
        )}

        {testStep < 3 ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={goNext}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Keyingisi →
          </button>
        ) : (
          <button
            type="button"
            disabled={isBusy || !lessonId}
            onClick={() => void handleSave()}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda..." : "Testni saqlash"}
          </button>
        )}
      </div>
    </section>
  );
}

function UploadStatus({ value, onRetry }: { value: MaterialFormData; onRetry?: () => void }) {
  if (value.uploadProgress > 0 && value.uploadProgress < 100 && !value.uploaded) {
    return (
      <div>
        <p className="text-xs text-[#64748B]">Yuklanmoqda... {value.uploadProgress}%</p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E8EDF5]">
          <div className="h-full bg-[#0756F5]" style={{ width: `${value.uploadProgress}%` }} />
        </div>
      </div>
    );
  }
  if (value.uploadError) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        <span>✕ {value.uploadError}</span>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="font-medium">
            Qayta yuklash
          </button>
        ) : null}
      </div>
    );
  }
  if (value.uploaded) return <p className="text-sm text-emerald-700">✓ Fayl yuklandi</p>;
  return null;
}

function looksLikeVideo(file: File) {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(file.name);
}

function readVideoDuration(file: File) {
  if (!looksLikeVideo(file)) return Promise.resolve(null);
  return new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
