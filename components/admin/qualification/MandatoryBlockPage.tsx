"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import QualificationTree from "@/components/admin/qualification/QualificationTree";
import DirectionFormModal from "@/components/admin/qualification/DirectionFormModal";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import { ApiError } from "@/lib/api/errors";
import {
  createMandatoryBlog,
  getMandatoryBlog,
  getMandatoryBlogs,
  getMandatoryLessonMaterials,
  setMandatoryLessonStatus,
  setMandatoryModuleStatus,
  updateMandatoryBlog,
  updateMandatoryModule,
} from "@/lib/api/mandatory-blogs";
import type {
  QualificationDirection,
  QualificationLesson,
  QualificationModule,
  QualificationPublishStatus,
} from "@/lib/api/types/qualification";
import { directionKey } from "@/lib/qualification/it-bridge";
import { forceDeleteLesson, forceDeleteModule, forceDeleteDirection } from "@/lib/qualification/force-delete";
import { qualificationWizardPath } from "@/lib/qualification/wizard-state";
import type { DirectionWritePayload } from "@/lib/qualification/direction-save";
import { publishMandatorySnapshot, removeMandatorySnapshot } from "@/lib/api/mandatory-snapshot";
import { dropRemovedLessonsFromTree } from "@/lib/publish-status";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

const fieldClass = "mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm";

async function saveMandatory(payload: DirectionWritePayload, editing?: QualificationDirection | null) {
  if (editing?.id) return updateMandatoryBlog(editing.id, payload);
  return createMandatoryBlog(payload);
}

export default function MandatoryBlockPage() {
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

  const loadDirection = useCallback(async (blogId: number, force = false, silent = false) => {
    if (!blogId) return;
    const key = directionKey({ id: blogId, source: "mandatory" as const });
    if (!force && loadingIdsRef.current.has(key)) return;
    if (!silent) {
      loadingIdsRef.current.add(key);
      setLoadingIds(Array.from(loadingIdsRef.current));
    }
    try {
      const detail = dropRemovedLessonsFromTree(await getMandatoryBlog(blogId, false, { fetchMaterials: true }));
      setItems((prev) => {
        const next = prev.map((item) => (item.id === blogId ? { ...item, ...detail, source: "mandatory" as const } : item));
        void publishMandatorySnapshot(next, "replace", { notify: silent, immediate: true });
        return next;
      });
    } catch (error) {
      setItems((prev) =>
        prev.map((item) => (item.id === blogId ? { ...item, modules: item.modules ?? [] } : item))
      );
      if (!silent) toast.error(error instanceof ApiError ? error.message : "Majburiy blog yuklanmadi");
    } finally {
      if (!silent) {
        loadingIdsRef.current.delete(key);
        setLoadingIds(Array.from(loadingIdsRef.current));
      }
    }
  }, []);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Faqat list — har bir blog uchun detail/modules qayta chaqirilmasin.
      const blogs = await getMandatoryBlogs({ per_page: 100 });
      const prev = itemsRef.current;
      if (silent && blogs.length === 0 && prev.length > 0) return;
      const next = blogs.map((item) => {
        const old = prev.find((entry) => entry.id === item.id);
        if (!old) return item;
        // List metadata; daraxt admin state'da. Bo'sh list.modules o'chirilgan modullarni qayta tiklamasin.
        if (old.modules) {
          return { ...item, modules: old.modules, module_count: old.modules.length };
        }
        return item;
      });
      setItems(next);
    } catch (error) {
      if (!silent) toast.error(error instanceof ApiError ? error.message : "Majburiy bloglar yuklanmadi");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(false);
  }, [loadList]);

  useLiveRefresh((reason) => {
    if (moduleForm || directionForm || saving || pendingLesson) return;
    // Upload/mutation: faqat list yangilansin, detail expand qolganda qayta yuklanadi.
    if (reason === "mutation") void loadList(true);
  }, { skipTick: true });

  const confirmDeleteLesson = async () => {
    if (!pendingLesson) return;
    const { direction, module: qualModule, lesson } = pendingLesson;
    setSaving(true);
    try {
      await forceDeleteLesson(lesson.id, lesson, "mandatory");
      setPendingLesson(null);
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== direction.id) return item;
          return {
            ...item,
            modules: (item.modules ?? []).map((moduleItem) => {
              if (moduleItem.id !== qualModule.id) return moduleItem;
              return {
                ...moduleItem,
                lessons: (moduleItem.lessons ?? []).filter((entry) => entry.id !== lesson.id),
              };
            }),
          };
        });
        void publishMandatorySnapshot(next, "replace", { notify: true, immediate: true });
        return next;
      });
      toast.success("Dars o'chirildi");
      await loadDirection(direction.id, true, true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Dars o'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  const deleteDirection = async (direction: QualificationDirection) => {
    if (!window.confirm("Majburiy blog o'chirilsinmi?")) return;
    setSaving(true);
    try {
      await forceDeleteDirection(direction);
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== direction.id);
        void publishMandatorySnapshot(next, "replace", { notify: true, immediate: true });
        return next;
      });
      void removeMandatorySnapshot(direction.id);
      toast.success("Majburiy blog o'chirildi");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "O'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (direction: QualificationDirection, qualModule: QualificationModule) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    setSaving(true);
    try {
      await forceDeleteModule(qualModule.id, qualModule.lessons ?? [], undefined, "mandatory");
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== direction.id) return item;
          const modules = (item.modules ?? []).filter((entry) => entry.id !== qualModule.id);
          return { ...item, modules, module_count: modules.length };
        });
        void publishMandatorySnapshot(next, "replace", { notify: true, immediate: true });
        return next;
      });
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
      try {
        const materials = await getMandatoryLessonMaterials(lesson.id);
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== direction.id) return item;
            return {
              ...item,
              modules: (item.modules ?? []).map((moduleItem) => {
                if (moduleItem.id !== qualModule.id) return moduleItem;
                return {
                  ...moduleItem,
                  lessons: (moduleItem.lessons ?? []).map((lessonItem) =>
                    lessonItem.id === lesson.id ? { ...lessonItem, materials } : lessonItem
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

  const changeLessonStatus = async (
    direction: QualificationDirection,
    qualModule: QualificationModule,
    lesson: QualificationLesson,
    status: QualificationPublishStatus
  ) => {
    if (!lesson.id || (lesson.status || "").toUpperCase() === status) return;
    setSaving(true);
    try {
      await setMandatoryLessonStatus(lesson.id, status, {
        lesson_number: lesson.lesson_number,
        lesson_type: typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined,
        title: lesson.title,
      });
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== direction.id) return item;
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
        });
        void publishMandatorySnapshot(next, "replace", { notify: true });
        return next;
      });
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
      await setMandatoryModuleStatus(qualModule.id, status, {
        module_number: qualModule.module_number,
        title: qualModule.title,
      });
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== direction.id) return item;
          return {
            ...item,
            modules: (item.modules ?? []).map((moduleItem) =>
              moduleItem.id === qualModule.id ? { ...moduleItem, status } : moduleItem
            ),
          };
        });
        void publishMandatorySnapshot(next, "replace", { notify: true });
        return next;
      });
      toast.success(`Status: ${status}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Status o'zgarmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Majburiy blog"
        description="Majburiy blog → Modul → Dars → Material"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDirectionForm("new")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#0C2340]"
            >
              <Plus className="h-4 w-4" />
              {"Blok qo'shish"}
            </button>
            <Link
              href={qualificationWizardPath({ source: "mandatory", step: 1 })}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              {"Material qo'shish"}
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
          onLoadDirection={(blogId) => void loadDirection(blogId)}
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
                Bekor
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmDeleteLesson()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </>
          }
        >
          <p className="text-sm text-[#64748B]">{pendingLesson.lesson.title} o&apos;chirilsinmi?</p>
        </DashboardModal>
      ) : null}

      {moduleForm ? (
        <DashboardModal
          open
          onClose={() => setModuleForm(null)}
          title={`Modulni tahrirlash (#${moduleForm.editing.id})`}
          size="md"
          footer={
            <>
              <button type="button" onClick={() => setModuleForm(null)} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
                Bekor
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!moduleForm.editing.title.trim()) {
                    toast.error("Modul mavzusi majburiy");
                    return;
                  }
                  setSaving(true);
                  try {
                    await updateMandatoryModule(moduleForm.editing.id, {
                      module_number: moduleForm.editing.module_number ?? 1,
                      title: moduleForm.editing.title.trim(),
                      status: moduleForm.editing.status,
                    });
                    toast.success("Modul yangilandi");
                    await loadDirection(moduleForm.direction.id, true, true);
                    setModuleForm(null);
                  } catch (error) {
                    toast.error(error instanceof ApiError ? error.message : "Modul yangilanmadi");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block text-sm">
              Modul mavzusi *
              <input
                value={moduleForm.editing.title}
                onChange={(e) =>
                  setModuleForm((prev) =>
                    prev ? { ...prev, editing: { ...prev.editing, title: e.target.value } } : prev
                  )
                }
                className={fieldClass}
              />
            </label>
          </div>
        </DashboardModal>
      ) : null}

      <DirectionFormModal
        open={directionForm !== null}
        editing={directionForm === "new" ? null : directionForm}
        saving={saving}
        setSaving={setSaving}
        title={directionForm === "new" || !directionForm ? "Yangi majburiy blog" : "Majburiy blogni tahrirlash"}
        save={saveMandatory}
        onClose={() => setDirectionForm(null)}
        onSaved={async (direction) => {
          setDirectionForm(null);
          const next = { ...direction, source: "mandatory" as const };
          setItems((prev) => {
            if (prev.some((item) => item.id === next.id)) {
              return prev.map((item) => (item.id === next.id ? { ...item, ...next } : item));
            }
            return [next, ...prev];
          });
          await loadDirection(next.id, true);
        }}
      />
    </div>
  );
}
