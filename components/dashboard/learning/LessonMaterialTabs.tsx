"use client";

import { useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { pickFileUrl, resolveMediaUrl } from "@/lib/api/media";
import type { LearningAssignment, LearningLessonDetail, LearningMaterial } from "@/lib/api/types/learning";
import {
  LESSON_MATERIAL_TABS,
  assignmentsForSeminar,
  materialsForTab,
  parseMaterialBody,
  type LessonMaterialTab,
} from "@/lib/learning/material-tabs";
import { visibleMaterialTabs } from "@/lib/learning/required-materials";
import LessonFileViewer from "@/components/dashboard/learning/LessonFileViewer";
import { cn } from "@/lib/cn";

type LessonMaterialTabsProps = {
  lesson: LearningLessonDetail;
  completedKeys?: Set<string>;
  onMarkComplete?: (opts: { key: string; materialId?: number }) => void;
};

function materialKey(item: LearningMaterial, tab: LessonMaterialTab, lessonId: number) {
  if (item.id) return `material:${item.id}`;
  return `${tab}:${lessonId}:${item.title ?? "x"}`;
}

export default function LessonMaterialTabs({
  lesson,
  completedKeys,
  onMarkComplete,
}: LessonMaterialTabsProps) {
  const tabs = useMemo(() => {
    // Test alohida LessonTest bo'limida — tabda takrorlamaymiz
    const visible = visibleMaterialTabs(lesson).filter((id) => id !== "test");
    return LESSON_MATERIAL_TABS.filter((t) => visible.includes(t.id));
  }, [lesson]);

  const counts = useMemo(() => {
    const map = {} as Record<LessonMaterialTab, number>;
    for (const tab of tabs) {
      map[tab.id] = materialsForTab(lesson, tab.id).length;
      if (tab.id === "seminar") map[tab.id] += assignmentsForSeminar(lesson).length;
    }
    return map;
  }, [lesson, tabs]);

  const firstWithContent = tabs[0]?.id ?? "presentation";
  const [tab, setTab] = useState<LessonMaterialTab>(firstWithContent);

  if (!tabs.length) {
    return (
      <p className="mt-6 text-sm text-[#64748B]">
        Bu darsda qo&apos;shimcha materiallar yo&apos;q.
      </p>
    );
  }

  return (
    <Tabs.Root
      value={tabs.some((t) => t.id === tab) ? tab : firstWithContent}
      onValueChange={(value) => setTab(value as LessonMaterialTab)}
      className="mt-6"
    >
      <Tabs.List className="flex flex-wrap gap-2 border-b border-[#E8EDF5] pb-3">
        {tabs.map((item) => (
          <Tabs.Trigger
            key={item.id}
            value={item.id}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] data-[state=active]:bg-[#EEF4FF] data-[state=active]:text-[#2563EB]"
            )}
          >
            {item.label}
            {counts[item.id] ? <span className="ml-1 text-xs text-[#94A3B8]">{counts[item.id]}</span> : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {tabs.map((item) => (
        <Tabs.Content key={item.id} value={item.id} className="space-y-3 pt-4">
          <TabBody
            lesson={lesson}
            tab={item.id}
            completedKeys={completedKeys}
            onMarkComplete={onMarkComplete}
          />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

function TabBody({
  lesson,
  tab,
  completedKeys,
  onMarkComplete,
}: {
  lesson: LearningLessonDetail;
  tab: LessonMaterialTab;
  completedKeys?: Set<string>;
  onMarkComplete?: (opts: { key: string; materialId?: number }) => void;
}) {
  const materials = materialsForTab(lesson, tab);
  const assignments = tab === "seminar" ? assignmentsForSeminar(lesson) : [];

  if (!materials.length && !assignments.length) {
    return null;
  }

  return (
    <>
      {materials.map((item, index) => (
        <MaterialCard
          key={item.id ?? `${tab}-${index}`}
          item={item}
          tab={tab}
          lessonId={lesson.id}
          done={completedKeys?.has(materialKey(item, tab, lesson.id)) === true}
          onMarkComplete={onMarkComplete}
        />
      ))}
      {assignments.map((item, index) => {
        const key = item.id ? `seminar-asg:${item.id}` : `seminar-asg:${lesson.id}:${item.title}`;
        return (
          <AssignmentCard
            key={item.id ?? `asg-${index}`}
            item={item}
            done={completedKeys?.has(key) === true}
            onMarkComplete={
              onMarkComplete
                ? () => onMarkComplete({ key, materialId: item.id })
                : undefined
            }
          />
        );
      })}
    </>
  );
}

function MaterialCard({
  item,
  tab,
  lessonId,
  done,
  onMarkComplete,
}: {
  item: LearningMaterial;
  tab: LessonMaterialTab;
  lessonId: number;
  done?: boolean;
  onMarkComplete?: (opts: { key: string; materialId?: number }) => void;
}) {
  if (tab === "test") {
    return <TestCard item={item} />;
  }

  const href = resolveMediaUrl(
    item.file_url || pickFileUrl(item) || item.url || item.content_url
  );
  const parsed = parseMaterialBody(item.content_text);
  const fileName = item.original_name || item.title;
  const mimeType = item.mime_type || undefined;
  const key = materialKey(item, tab, lessonId);

  return (
    <div className="rounded-lg border border-[#E8EDF5] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[#0C2340]">{item.title || tabLabel(tab)}</p>
          <p className="text-xs text-[#64748B]">{tabLabel(tab)}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
            done ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
          )}
        >
          {done ? "Tugatildi" : "Kutilmoqda"}
        </span>
      </div>
      {tab === "lecture" && parsed.text ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-[#64748B]">{parsed.text}</p>
      ) : null}
      {tab === "seminar" || tab === "laboratory" ? <LabeledBlocks parsed={parsed} /> : null}
      {href ? (
        <LessonFileViewer
          src={href}
          title={item.title || tabLabel(tab)}
          mimeType={mimeType}
          fileName={fileName}
        />
      ) : null}
      {!done && onMarkComplete ? (
        <button
          type="button"
          onClick={() => onMarkComplete({ key, materialId: item.id })}
          className="mt-3 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]"
        >
          Tugatildi deb belgilash
        </button>
      ) : null}
    </div>
  );
}

function AssignmentCard({
  item,
  done,
  onMarkComplete,
}: {
  item: LearningAssignment;
  done?: boolean;
  onMarkComplete?: () => void;
}) {
  const href = resolveMediaUrl(item.file_url);
  return (
    <div className="rounded-lg border border-[#E8EDF5] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[#0C2340]">{item.title || "Seminar"}</p>
          {item.description ? <p className="mt-1 text-sm text-[#64748B]">{item.description}</p> : null}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
            done ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
          )}
        >
          {done ? "Tugatildi" : "Kutilmoqda"}
        </span>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#2563EB]">
          Faylni ochish
        </a>
      ) : null}
      {!done && onMarkComplete ? (
        <button
          type="button"
          onClick={onMarkComplete}
          className="mt-3 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]"
        >
          Tugatildi deb belgilash
        </button>
      ) : null}
    </div>
  );
}

function TestCard({ item }: { item: LearningMaterial }) {
  return (
    <div className="rounded-lg border border-[#E8EDF5] p-4">
      <p className="font-medium text-[#0C2340]">{item.title || "Dars testi"}</p>
      <p className="mt-1 text-sm text-[#64748B]">
        Testni dars oxiridagi «Testni boshlash» orqali topshiring.
      </p>
    </div>
  );
}

function LabeledBlocks({ parsed }: { parsed: ReturnType<typeof parseMaterialBody> }) {
  const rows = [
    ["Maqsad", parsed.goal],
    ["Bajarish tartibi", parsed.procedure],
    ["Topshiriq", parsed.assignment],
    ["Ko'rsatma", parsed.instruction],
  ] as const;
  return (
    <div className="mt-3 space-y-2">
      {rows.map(([label, text]) =>
        text ? (
          <div key={label}>
            <p className="text-xs font-semibold text-[#64748B]">{label}</p>
            <p className="whitespace-pre-wrap text-sm text-[#0C2340]">{text}</p>
          </div>
        ) : null
      )}
      {parsed.text ? <p className="whitespace-pre-wrap text-sm text-[#64748B]">{parsed.text}</p> : null}
    </div>
  );
}

function tabLabel(tab: LessonMaterialTab) {
  return LESSON_MATERIAL_TABS.find((t) => t.id === tab)?.label ?? tab;
}
