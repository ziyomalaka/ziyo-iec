"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import QualificationTree from "@/components/admin/qualification/QualificationTree";
import DirectionFormModal from "@/components/admin/qualification/DirectionFormModal";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import { getItCourse, getItDirection, updateItModule } from "@/lib/api/admin-it";
import { ApiError } from "@/lib/api/errors";
import {
  getQualificationDirection,
  getQualificationMaterials,
  getQualificationTests,
  setLessonStatus,
  setModuleStatus,
  updateQualificationModule,
} from "@/lib/api/qualification";
import type {
  QualificationDirection,
  QualificationLesson,
  QualificationModule,
  QualificationPublishStatus,
} from "@/lib/api/types/qualification";
import { directionKey, isItSource, mapItModule, mergeModules } from "@/lib/qualification/it-bridge";
import { loadMergedDirections } from "@/lib/qualification/load-directions";
import { forceDeleteDirection, forceDeleteLesson, forceDeleteModule } from "@/lib/qualification/force-delete";
import { publishQualificationSnapshot, removeQualificationSnapshot } from "@/lib/qualification/published-snapshot";
import { dropRemovedLessonsFromTree } from "@/lib/publish-status";
import { nextModuleNumber } from "@/lib/qualification/wizard-state";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

const fieldClass = "mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm";

export default function QualificationPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<QualificationDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [moduleForm, setModuleForm] = useState<{
    direction: QualificationDirection;
    editing: QualificationModule;
  } | null>(null);
  const [directionForm, setDirectionForm] = useState<QualificationDirection | null | "new">(null);
  const [pendingLesson, setPendingLesson] = useState<{
    direction: QualificationDirection;
    module: QualificationModule;
    lesson: QualificationLesson;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const loadingIdsRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<QualificationDirection[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    const ready = items.filter((item) => item.modules !== undefined);
    if (!ready.length) return;
    publishQualificationSnapshot(ready);
  }, [items]);

  const loadDirection = useCallback(async (directionId: number, force = false, silent = false) => {
    if (!directionId) return;
    const current =
      itemsRef.current.find((item) => item.id === directionId) ??
      itemsRef.current.find((item) => item.itId === directionId);
    if (!current) return;
    const key = directionKey(current);
    if (!force && loadingIdsRef.current.has(key)) return;
    if (!silent) {
      loadingIdsRef.current.add(key);
      setLoadingIds(Array.from(loadingIdsRef.current));
    }
    try {
      let title = current.title;
      let categoryId = current.category_id;
      let categoryName = current.category_name;
      let qualModules: QualificationModule[] = [];
      let itModules: QualificationModule[] = [];

      if (!isItSource(current.source)) {
        try {
          const detail = await getQualificationDirection(current.id, false, { fetchMaterials: false });
          title = detail.title || title;
          categoryId = detail.category_id ?? categoryId;
          categoryName = detail.category_name || categoryName;
          // DRAFT modullar ham backenddan keladi — filtrlash yo'q.
          qualModules = (detail.modules ?? []).map((item) => ({ ...item, source: "qualification" as const }));
        } catch {
          qualModules = [];
        }
      }

      const itId = current.itId ?? (isItSource(current.source) ? current.id : undefined);
      if (itId) {
        try {
          const it = (await getItDirection(itId).catch(() => null)) ?? (await getItCourse(itId));
          title = title || it.title;
          categoryId = it.category_id ?? categoryId;
          categoryName = it.category_name || categoryName;
          itModules = (it.modules ?? []).map((item) => mapItModule(item, itId));
        } catch {
          itModules = [];
        }
      }

      const nextItem = dropRemovedLessonsFromTree({
        ...current,
        title,
        category_id: categoryId,
        category_name: categoryName,
        modules: mergeModules(qualModules, itModules),
      });
      setItems((prev) =>
        prev.map((item) => (directionKey(item) === key ? nextItem : item))
      );
      const published = publishQualificationSnapshot([nextItem], { notify: silent, immediate: silent });
      if (silent) await published;
    } catch (error) {
      setItems((prev) =>
        prev.map((item) => (directionKey(item) === key ? { ...item, modules: item.modules ?? [] } : item))
      );
      if (!silent) toast.error(error instanceof ApiError ? error.message : "Yo'nalish yuklanmadi");
    } finally {
      if (!silent) {
        loadingIdsRef.current.delete(key);
        setLoadingIds(Array.from(loadingIdsRef.current));
      }
    }
  }, []);

  const loadList = useCallback(async (silent = false, openFirst = false) => {
    if (!silent) setLoading(true);
    try {
      const { merged } = await loadMergedDirections();
      const prev = itemsRef.current;
      if (silent && merged.length === 0 && prev.length > 0) return;
      // Faqat list — silent refreshda barcha detail/modules qayta chaqirilmasin (loop).
      const next = merged.map((item) => {
        const old = prev.find((entry) => directionKey(entry) === directionKey(item));
        if ((item.modules?.length ?? 0) > 0) return item;
        if (old?.modules !== undefined) return { ...item, modules: old.modules };
        return item;
      });
      setItems(next);
      if (openFirst && next[0]?.id) {
        await loadDirection(next[0].id);
      }
    } catch (error) {
      if (!silent) toast.error(error instanceof ApiError ? error.message : "Yo'nalishlar yuklanmadi");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadDirection]);

  useEffect(() => {
    void loadList(false, true);
  }, [loadList]);

  useLiveRefresh((reason) => {
    if (moduleForm || directionForm || saving || pendingLesson) return;
    if (reason === "mutation") void loadList(true);
  }, { skipTick: true });

  // Qidiruv: faqat query o'zgaganda, items object dependency emas.
  useEffect(() => {
    if (!query.trim()) return;
    const pending = itemsRef.current.filter((item) => item.modules === undefined && item.id);
    pending.forEach((item) => {
      void loadDirection(item.id);
    });
  }, [query, loadDirection]);

  const removeLessonFromTree = (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lessonId: number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (directionKey(item) !== directionKey(direction)) return item;
        return {
          ...item,
          modules: (item.modules ?? []).map((entry) => {
            if (entry.id !== qualModule.id || (entry.source ?? "qualification") !== (qualModule.source ?? "qualification")) {
              return entry;
            }
            return {
              ...entry,
              lessons: (entry.lessons ?? []).filter((lesson) => lesson.id !== lessonId),
            };
          }),
        };
      })
    );
  };

  const removeModuleFromTree = (direction: QualificationDirection, moduleId: number, source?: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (directionKey(item) !== directionKey(direction)) return item;
        return {
          ...item,
          modules: (item.modules ?? []).filter(
            (entry) => !(entry.id === moduleId && (entry.source ?? "qualification") === (source ?? "qualification"))
          ),
        };
      })
    );
  };

  const changeLessonStatus = async (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson,
    status: QualificationPublishStatus
  ) => {
    if (!lesson.id || (lesson.status || "").toUpperCase() === status) return;
    setSaving(true);
    try {
      await setLessonStatus(lesson.id, status, {
        lesson_number: lesson.lesson_number,
        lesson_type: typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined,
        title: lesson.title,
      });
      setItems((prev) =>
        prev.map((item) => {
          if (directionKey(item) !== directionKey(direction)) return item;
          return {
            ...item,
            modules: (item.modules ?? []).map((moduleItem) => {
              if (moduleItem.id !== qualModule.id) return moduleItem;
              return {
                ...moduleItem,
                lessons: (moduleItem.lessons ?? []).map((lessonItem) =>
                  lessonItem.id === lesson.id ? { ...lessonItem, status } : lessonItem
                ),
              };
            }),
          };
        })
      );
      toast.success(`Status: ${status}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Status o'zgarmadi");
    } finally {
      setSaving(false);
    }
  };

  const changeModuleStatus = async (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    status: QualificationPublishStatus
  ) => {
    if (!qualModule.id || (qualModule.status || "").toUpperCase() === status) return;
    setSaving(true);
    try {
      if (isItSource(qualModule.source) || isItSource(direction.source)) {
        await updateItModule(qualModule.id, {
          title: qualModule.title,
          order_index: qualModule.module_number,
          status,
        });
      } else {
        await setModuleStatus(qualModule.id, status, {
          module_number: qualModule.module_number,
          title: qualModule.title,
        });
      }
      setItems((prev) =>
        prev.map((item) => {
          if (directionKey(item) !== directionKey(direction)) return item;
          return {
            ...item,
            modules: (item.modules ?? []).map((moduleItem) =>
              moduleItem.id === qualModule.id ? { ...moduleItem, status } : moduleItem
            ),
          };
        })
      );
      toast.success(`Status: ${status}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Status o'zgarmadi");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!pendingLesson) return;
    const { direction, module: qualModule, lesson } = pendingLesson;
    setSaving(true);
    try {
      await forceDeleteLesson(lesson.id, lesson);
      removeLessonFromTree(direction, qualModule, lesson.id);
      setPendingLesson(null);
      toast.success("Dars o'chirildi");
      await loadDirection(direction.id, true, true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Dars o'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  const deleteDirection = async (direction: QualificationDirection) => {
    if (!window.confirm("Yo'nalish o'chirilsinmi?")) return;
    setSaving(true);
    try {
      await forceDeleteDirection(direction);
      setItems((prev) => prev.filter((item) => directionKey(item) !== directionKey(direction)));
      removeQualificationSnapshot(direction);
      toast.success("Yo'nalish o'chirildi");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Yo'nalish o'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (direction: QualificationDirection, qualModule: QualificationModule) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    setSaving(true);
    try {
      const itId = direction.itId ?? (isItSource(direction.source) || isItSource(qualModule.source) ? direction.id : undefined);
      await forceDeleteModule(qualModule.id, qualModule.lessons ?? [], itId);
      removeModuleFromTree(direction, qualModule.id, qualModule.source);
      toast.success("Modul o'chirildi");
      await loadDirection(direction.id, true, true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Modul o'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  const loadLessonMaterials = useCallback(
    async (direction: QualificationDirection, qualModule: QualificationModule, lesson: QualificationLesson) => {
      if (!lesson.id || lesson.materials !== undefined) return;
      if (isItSource(direction.source) || isItSource(qualModule.source) || isItSource(lesson.source)) return;
      try {
        const [materials, tests] = await Promise.all([
          getQualificationMaterials(lesson.id).catch(() => []),
          getQualificationTests(lesson.id).catch(() => []),
        ]);
        setItems((prev) =>
          prev.map((item) => {
            if (directionKey(item) !== directionKey(direction)) return item;
            return {
              ...item,
              modules: (item.modules ?? []).map((moduleItem) => {
                if (moduleItem.id !== qualModule.id || (moduleItem.source ?? "qualification") !== (qualModule.source ?? "qualification")) {
                  return moduleItem;
                }
                return {
                  ...moduleItem,
                  lessons: (moduleItem.lessons ?? []).map((lessonItem) =>
                    lessonItem.id === lesson.id ? { ...lessonItem, materials: [...materials, ...tests] } : lessonItem
                  ),
                };
              }),
            };
          })
        );
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Materiallar yuklanmadi");
      }
    },
    []
  );

  return (
    <div>
      <PageHeader
        title="Malaka oshirish"
        description="Yo'nalish → Modul → Dars → Material"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDirectionForm("new")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#0C2340]"
            >
              <Plus className="h-4 w-4" />
              {"Yo'nalish qo'shish"}
            </button>
            <Link
              href="/admin/software/qualification/material/create"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              {"Material qo'shish"}
            </Link>
            <Link
              href="/admin/software/mandatory"
              className="inline-flex items-center gap-2 rounded-lg border border-[#0756F5] bg-white px-4 py-2 text-sm font-medium text-[#0756F5]"
            >
              <Plus className="h-4 w-4" />
              {"Majburiy blog"}
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#E8EDF5] bg-white px-3 py-2">
        <Search className="h-4 w-4 text-[#94A3B8]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish..."
          aria-label="Qidirish"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Yuklanmoqda">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-[#E8EDF5]" />
          ))}
        </div>
      ) : (
        <QualificationTree
          directions={items}
          query={query}
          loadingIds={loadingIds}
          onLoadDirection={(directionId) => void loadDirection(directionId)}
          onLoadLesson={(direction, qualModule, lesson) => void loadLessonMaterials(direction, qualModule, lesson)}
          onEditDirection={(direction) => setDirectionForm(direction)}
          onDeleteDirection={(direction) => void deleteDirection(direction)}
          onEditModule={(direction, qualModule) => setModuleForm({ direction, editing: qualModule })}
          onDeleteModule={(direction, qualModule) => void deleteModule(direction, qualModule)}
          onDeleteLesson={(direction, qualModule, lesson) => setPendingLesson({ direction, module: qualModule, lesson })}
          onChangeLessonStatus={(direction, qualModule, lesson, status) =>
            void changeLessonStatus(direction, qualModule, lesson, status)
          }
          onChangeModuleStatus={(direction, qualModule, status) =>
            void changeModuleStatus(direction, qualModule, status)
          }
        />
      )}

      {pendingLesson ? (
        <DashboardModal
          open
          size="md"
          title="O'chirilsinmi?"
          onClose={() => {
            if (!saving) setPendingLesson(null);
          }}
          footer={
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPendingLesson(null)}
                className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-60"
              >
                Yo'q
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmDeleteLesson()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "O'chirilmoqda..." : "Xa"}
              </button>
            </>
          }
        >
          <p className="text-sm text-[#64748B]">
            DARS {pendingLesson.lesson.lesson_code || pendingLesson.lesson.lesson_number || ""}
            {pendingLesson.lesson.title ? ` — ${pendingLesson.lesson.title}` : ""} o'chiriladi.
          </p>
        </DashboardModal>
      ) : null}

      {moduleForm ? (
        <ModuleEditModal
          key={`${moduleForm.editing.source ?? "qualification"}-${moduleForm.editing.id}`}
          direction={moduleForm.direction}
          editing={moduleForm.editing}
          nextNumber={nextModuleNumber(moduleForm.direction.modules)}
          saving={saving}
          setSaving={setSaving}
          onClose={() => setModuleForm(null)}
          onSaved={async () => {
            const direction = moduleForm.direction;
            setModuleForm(null);
            await loadDirection(direction.id, true);
          }}
        />
      ) : null}

      <DirectionFormModal
        open={directionForm !== null}
        editing={directionForm && directionForm !== "new" ? directionForm : null}
        saving={saving}
        setSaving={setSaving}
        onClose={() => setDirectionForm(null)}
        onSaved={async () => {
          setDirectionForm(null);
          await loadList(true);
        }}
      />
    </div>
  );
}

function ModuleEditModal({
  direction,
  editing,
  nextNumber,
  saving,
  setSaving,
  onClose,
  onSaved,
}: {
  direction: QualificationDirection;
  editing: QualificationModule;
  nextNumber: number;
  saving: boolean;
  setSaving: (value: boolean) => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(editing.title);
  const [orderIndex, setOrderIndex] = useState(String(editing.module_number ?? nextNumber));

  const onSubmit = async () => {
    if (!title.trim()) {
      toast.error("Modul mavzusi majburiy");
      return;
    }
    const moduleNumber = Number(orderIndex) || nextNumber;
    setSaving(true);
    try {
      if (isItSource(editing.source)) {
        await updateItModule(editing.id, {
          title: title.trim(),
          order_index: moduleNumber,
          status: editing.status,
        });
      } else {
        await updateQualificationModule(editing.id, {
          module_number: moduleNumber,
          title: title.trim(),
          status: editing.status,
        });
      }
      toast.success("Modul yangilandi");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Modul yangilanmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardModal
      open
      onClose={onClose}
      title={`Modulni tahrirlash (#${editing.id})`}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
            Bekor
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSubmit()}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[#64748B]">
          {"Yo'nalish"}
          <br />
          <span className="font-medium text-[#0C2340]">{direction.title}</span>
        </p>
        <label className="block text-sm">
          Modul mavzusi *
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
        </label>
        <label className="block text-sm">
          Modul raqami
          <input
            type="number"
            min={1}
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
    </DashboardModal>
  );
}
