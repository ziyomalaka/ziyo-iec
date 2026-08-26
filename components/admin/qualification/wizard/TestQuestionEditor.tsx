"use client";

import type { TestQuestion, TestQuestionOptionKey } from "@/lib/api/types/qualification";
import { emptyQuestions } from "@/lib/qualification/wizard-state";

const KEYS: TestQuestionOptionKey[] = ["A", "B", "C", "D"];

type TestQuestionEditorProps = {
  questions: TestQuestion[];
  onChange: (questions: TestQuestion[]) => void;
};

export default function TestQuestionEditor({ questions, onChange }: TestQuestionEditorProps) {
  const update = (id: string, patch: Partial<TestQuestion>) => {
    onChange(questions.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const updateOption = (id: string, key: TestQuestionOptionKey, text: string) => {
    onChange(
      questions.map((item) =>
        item.id === id
          ? { ...item, options: item.options.map((option) => (option.key === key ? { ...option, text } : option)) }
          : item
      )
    );
  };

  return (
    <div className="space-y-4">
      {questions.map((item, index) => (
        <div key={item.id} className="rounded-xl border border-[#E8EDF5] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0C2340]">{index + 1}-savol</p>
            {questions.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(questions.filter((question) => question.id !== item.id))}
                className="text-xs text-red-600"
              >
                {"Savolni o'chirish"}
              </button>
            ) : null}
          </div>
          <label className="block text-sm">
            Savol matni *
            <textarea
              value={item.question}
              onChange={(e) => update(item.id, { question: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
            />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {KEYS.map((key) => (
              <label key={key} className="block text-sm">
                {key}
                <input
                  value={item.options.find((option) => option.key === key)?.text ?? ""}
                  onChange={(e) => updateOption(item.id, key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
                />
              </label>
            ))}
          </div>
          <label className="mt-3 block text-sm">
            {"To'g'ri javob *"}
            <select
              value={item.correctAnswer}
              onChange={(e) => update(item.id, { correctAnswer: e.target.value as TestQuestionOptionKey })}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
            >
              {KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...questions, ...emptyQuestions()])}
        className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm"
      >
        + Savol
      </button>
    </div>
  );
}
