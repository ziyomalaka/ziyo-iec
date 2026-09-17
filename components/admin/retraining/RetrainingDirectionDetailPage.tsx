"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import RetrainingBlockTree from "@/components/admin/retraining/RetrainingBlockTree";
import DirectionFormModal from "@/components/admin/qualification/DirectionFormModal";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import { ApiError } from "@/lib/api/errors";
import {
  assignRetrainingModuleBlock,
  createRetrainingDirection,
  createRetrainingModule,
  deleteRetrainingBlock,
  getRetrainingDirection,
  getRetrainingLessonMaterials,
  getRetrainingModuleLessonsSafe,
  saveRetrainingBlocks,
  setRetrainingLessonStatus,
  setRetrainingModuleStatus,
  updateRetrainingBlock,
  updateRetrainingDirection,
  updateRetrainingModule,
} from "@/lib/api/retraining-admin";
import type {
  QualificationDirection,
  QualificationLesson,
  QualificationModule,
  QualificationPublishStatus,
} from "@/lib/api/types/qualification";
import { directionKey } from "@/lib/qualification/it-bridge";
import { forceDeleteDirection, forceDeleteLesson, forceDeleteModule } from "@/lib/qualification/force-delete";
import {
  nextBlockId,
  nextBlockNumber,
  resolveBlocksForDirection,
  serializeBlockMeta,
  withModuleBlockMarker,
  type RetrainingBlock,
} from "@/lib/retraining/content-blocks";
import { nextModuleNumber } from "@/lib/qualification/wizard-state";
import type { DirectionWritePayload } from "@/lib/qualification/direction-save";
import { dropRemovedLessonsFromTree } from "@/lib/publish-status";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import {
  getRetrainingPanelConfig,
  retrainingLessonRoute,
  retrainingMaterialUploadRoute,
  retrainingStatusLabel,
  retrainingTypeLabel,
  type RetrainingPanel,
} from "@/lib/retraining/admin-panels";

const fieldClass = "mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm";

type RetrainingDirectionDetailPageProps = {
  panel: RetrainingPanel;
  directionId: number;
};

async function saveRetraining(
  panel: RetrainingPanel,
  payload: DirectionWritePayload,
  editing?: QualificationDirection | null
) {
  if (editing?.id) {
    const blocks = resolveBlocksForDirection(editing);
    const hasBlockMeta = blocks.length > 0 && String(editing.description ?? "").includes("ZM_BLOCKS:");
    const description = hasBlockMeta
      ? serializeBlockMeta(blocks, payload.description)
      : payload.description;
    return updateRetrainingDirection(panel, editing.id, { ...payload, description });
  }
  return createRetrainingDirection(panel, payload);
}

export default function RetrainingDirectionDetailPage({ panel, directionId }: RetrainingDirectionDetailPageProps) {
  const config = getRetrainingPanelConfig(panel);
  const [direction, setDirection] = useState<QualificationDirection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [moduleForm, setModuleForm] = useState<{ editing: QualificationModule } | null>(null);
  const [blockForm, setBlockForm] = useState<{ title: string; editing?: RetrainingBlock } | null>(null);
  const [pendingBlock, setPendingBlock] = useState<RetrainingBlock | null>(null);
  const [moduleCreate, setModuleCreate] = useState<{ block: RetrainingBlock; title: string } | null>(null);
  const [directionForm, setDirectionForm] = useState(false);
  const [pendingLesson, setPendingLesson] = useState<{
    block: RetrainingBlock;
    module: QualificationModule;
    lesson: QualificationLesson;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDirection = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const detail = dropRemovedLessonsFromTree(
          await getRetrainingDirection(panel, directionId, false, { fetchMaterials: false })
        );
        setDirection(detail);
      } catch (err) {
        setError(err);
        setDirection(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [panel, directionId]
  );

  useEffect(() => {
    void loadDirection(false);
  }, [loadDirection]);

  useLiveRefresh(
    (reason) => {
      if (moduleForm || directionForm || saving || pendingLesson || blockForm || pendingBlock) return;
      if (reason === "mutation") void loadDirection(true);
    },
    { skipTick: true }
  );

  const refreshTree = async (force = true) => {
    const key = direction ? directionKey(direction) : "";
    if (key) setLoadingIds([key]);
    try {
      await loadDirection(true);
    } finally {
      setLoadingIds([]);
    }
    if (force && direction) {
      // noop — loadDirection updates state
    }
  };

  const confirmDeleteLesson = async () => {
    if (!pendingLesson || !direction) return;
    const { module: qualModule, lesson } = pendingLesson;
    setSaving(true);
    try {
      await forceDeleteLesson(lesson.id, lesson, "retraining");
      setPendingLesson(null);
      toast.success("Dars o'chirildi");
      await refreshTree();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Dars o'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (qualModule: QualificationModule) => {
    if (!direction || !window.confirm("O'chirilsinmi?")) return;
    setSaving(true);
    try {
      await forceDeleteModule(qualModule.id, qualModule.lessons ?? [], undefined, "retraining", panel);
      toast.success("Modul o'chirildi");
      await refreshTree();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Modul o'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  const loadModuleLessons = useCallback(
    async (qualModule: QualificationModule) => {
      if (!qualModule.id || qualModule.lessons !== undefined) return;
      const key = `module-${qualModule.id}`;
      setLoadingIds((prev) => (prev.includes(key) ? prev : [...prev, key]));
      try {
        const lessons = await getRetrainingModuleLessonsSafe(panel, qualModule.id, qualModule.module_number, false, {
          direction,
        });
        setDirection((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            modules: (prev.modules ?? []).map((moduleItem) =>
              moduleItem.id === qualModule.id ? { ...moduleItem, lessons } : moduleItem
            ),
          };
        });
      } finally {
        setLoadingIds((prev) => prev.filter((item) => item !== key));
      }
    },
    [panel, direction]
  );

  const loadLessonMaterials = async (qualModule: QualificationModule, lesson: QualificationLesson) => {
    if (!direction || !lesson.id || lesson.materials !== undefined) return;
    try {
      const materials = await getRetrainingLessonMaterials(panel, lesson.id, false, {
        direction: direction ?? undefined,
      });
      setDirection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: (prev.modules ?? []).map((moduleItem) => {
            if (moduleItem.id !== qualModule.id) return moduleItem;
            return {
              ...moduleItem,
              lessons: (moduleItem.lessons ?? []).map((lessonItem) =>
                lessonItem.id === lesson.id ? { ...lessonItem, materials } : lessonItem
              ),
            };
          }),
        };
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Materiallar yuklanmadi");
    }
  };

  const changeLessonStatus = async (
    qualModule: QualificationModule,
    lesson: QualificationLesson,
    status: QualificationPublishStatus
  ) => {
    if (!direction || !lesson.id || (lesson.status || "").toUpperCase() === status) return;
    setSaving(true);
    try {
      await setRetrainingLessonStatus(lesson.id, status, {
        lesson_number: lesson.lesson_number,
        lesson_type: typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined,
        title: lesson.title,
      });
      setDirection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: (prev.modules ?? []).map((moduleItem) => {
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
      toast.success(`Status: ${status}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Status o'zgarmadi");
    } finally {
      setSaving(false);
    }
  };

  const changeModuleStatus = async (qualModule: QualificationModule, status: QualificationPublishStatus) => {
    if (!direction || !qualModule.id || (qualModule.status || "").toUpperCase() === status) return;
    setSaving(true);
    try {
      await setRetrainingModuleStatus(panel, qualModule.id, status, {
        module_number: qualModule.module_number,
        title: qualModule.title,
        description: qualModule.description,
      }, { direction });
      setDirection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: (prev.modules ?? []).map((moduleItem) =>
            moduleItem.id === qualModule.id ? { ...moduleItem, status } : moduleItem
          ),
        };
      });
      toast.success(`Status: ${status}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Status o'zgarmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-[#E8EDF5]" />
        <div className="h-40 animate-pulse rounded-xl bg-[#E8EDF5]" />
      </div>
    );
  }

  if (error || !direction) {
    const apiError = error instanceof ApiError ? error : null;
    const isDirection404 = apiError?.status === 404;
    const detailMessage = isDirection404
      ? "Yo'nalish topilmadi"
      : apiError?.status === 403
        ? "Bu amal uchun ruxsat mavjud emas"
        : apiError?.message || "Yo'nalish ma'lumotlari yuklanmadi";
    return (
      <div>
        <nav className="mb-3 text-xs text-[#64748B]">
          <Link href="/admin/software/retraining" className="hover:text-[#0756F5]">
            Qayta tayyorlash
          </Link>
          <span className="mx-2">/</span>
          <Link href={config.route} className="hover:text-[#0756F5]">
            {config.label}
          </Link>
        </nav>
        <ErrorState
          error={error ?? new ApiError(404, detailMessage)}
          message={detailMessage}
          onRetry={() => void loadDirection(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-3 text-xs text-[#64748B]">
        <Link href="/admin/software/retraining" className="hover:text-[#0756F5]">
          Qayta tayyorlash
        </Link>
        <span className="mx-2">/</span>
        <Link href={config.route} className="hover:text-[#0756F5]">
          {config.label}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#0C2340]">{direction.title}</span>
      </nav>

      <PageHeader
        title={direction.title}
        description={direction.description || "Blok → Modul → Dars → Material"}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDirectionForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#0C2340]"
            >
              Tahrirlash
            </button>
            <Link
              href={retrainingMaterialUploadRoute(panel)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#0756F5]"
            >
              Material yuklash
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-[#E8EDF5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-[#64748B]">Kategoriya</p>
          <p className="text-sm font-medium text-[#0C2340]">{direction.category_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-[#64748B]">Davomiylik</p>
          <p className="text-sm font-medium text-[#0C2340]">{direction.duration_hours ? `${direction.duration_hours} soat` : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-[#64748B]">Til</p>
          <p className="text-sm font-medium text-[#0C2340]">{direction.language === "ru" ? "Rus" : direction.language === "uz" ? "O'zbek" : direction.language ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-[#64748B]">Status</p>
          <DashboardBadge variant={(direction.status ?? "").toUpperCase() === "PUBLISHED" ? "success" : "neutral"}>
            {retrainingStatusLabel(direction.status)}
          </DashboardBadge>
        </div>
        {direction.retraining_type ? (
          <div className="sm:col-span-2">
            <p className="text-xs text-[#64748B]">Qayta tayyorlash turi</p>
            <p className="text-sm font-medium text-[#0C2340]">{retrainingTypeLabel(direction.retraining_type)}</p>
          </div>
        ) : null}
      </div>

      <h3 className="mb-2 text-sm font-semibold text-[#0C2340]">Bloklar</h3>

      <RetrainingBlockTree
        panel={panel}
        direction={direction}
        loadingIds={loadingIds}
        onLoadLesson={(_, qualModule, lesson) => void loadLessonMaterials(qualModule, lesson)}
        onLoadModuleLessons={(qualModule) => void loadModuleLessons(qualModule)}
        onAddBlock={() => setBlockForm({ title: "" })}
        onAddModule={(block) => setModuleCreate({ block, title: "" })}
        onEditBlock={(block) => setBlockForm({ title: block.title, editing: block })}
        onDeleteBlock={(block) => setPendingBlock(block)}
        onEditModule={(_, qualModule) => setModuleForm({ editing: qualModule })}
        onDeleteModule={(_, qualModule) => void deleteModule(qualModule)}
        onDeleteLesson={(block, qualModule, lesson) =>
          setPendingLesson({ block, module: qualModule, lesson })
        }
        onChangeLessonStatus={(_, __, qualModule, lesson, status) =>
          void changeLessonStatus(qualModule, lesson, status)
        }
        onChangeModuleStatus={(_, __, qualModule, status) => void changeModuleStatus(qualModule, status)}
        buildLessonHref={(dir, block, qualModule, lesson) =>
          retrainingLessonRoute(panel, dir.id, qualModule.id, lesson.id, block.id)
        }
      />

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

      {pendingBlock ? (
        <DashboardModal
          open
          size="md"
          title="Ushbu blokni o'chirmoqchimisiz?"
          onClose={() => {
            if (!saving) setPendingBlock(null);
          }}
          footer={
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPendingBlock(null)}
                className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-60"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!direction || !pendingBlock) return;
                  setSaving(true);
                  try {
                    await deleteRetrainingBlock(panel, direction.id, pendingBlock.id);
                    toast.success("Blok o'chirildi");
                    setPendingBlock(null);
                    await refreshTree();
                  } catch (err) {
                    toast.error(err instanceof ApiError ? err.message : "Blok o'chirilmadi");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </>
          }
        >
          <p className="text-sm text-[#64748B]">{pendingBlock.title}</p>
        </DashboardModal>
      ) : null}

      {blockForm ? (
        <DashboardModal
          open
          onClose={() => {
            if (!saving) setBlockForm(null);
          }}
          title={blockForm.editing ? "Blokni tahrirlash" : "Blok qo'shish"}
          size="md"
          footer={
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setBlockForm(null)}
                className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-60"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!blockForm.title.trim()) {
                    toast.error("Blok nomi majburiy");
                    return;
                  }
                  setSaving(true);
                  try {
                    if (blockForm.editing) {
                      await updateRetrainingBlock(panel, direction.id, blockForm.editing, blockForm.title.trim());
                      toast.success("Blok yangilandi");
                    } else {
                      const existing = resolveBlocksForDirection(direction);
                      const next = [
                        ...existing,
                        {
                          id: nextBlockId(existing),
                          block_number: nextBlockNumber(existing),
                          title: blockForm.title.trim(),
                        },
                      ];
                      await saveRetrainingBlocks(panel, direction.id, next, direction.description);
                      toast.success("Blok qo'shildi");
                    }
                    setBlockForm(null);
                    await refreshTree();
                  } catch (err) {
                    toast.error(err instanceof ApiError ? err.message : "Blok saqlanmadi");
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
          <label className="block text-sm">
            Blok nomi *
            <input
              value={blockForm.title}
              onChange={(e) => setBlockForm((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
              className={fieldClass}
              placeholder="Masalan: Mutaxassislik fanlari bloki"
            />
          </label>
        </DashboardModal>
      ) : null}

      {moduleCreate ? (
        <DashboardModal
          open
          onClose={() => setModuleCreate(null)}
          title={`Modul qo'shish — ${moduleCreate.block.title}`}
          size="md"
          footer={
            <>
              <button type="button" onClick={() => setModuleCreate(null)} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
                Bekor
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!moduleCreate.title.trim()) {
                    toast.error("Modul nomi majburiy");
                    return;
                  }
                  setSaving(true);
                  try {
                    const moduleNumber = nextModuleNumber(direction.modules);
                    const created = await createRetrainingModule(panel, direction.id, {
                      module_number: moduleNumber,
                      title: moduleCreate.title.trim(),
                      description: withModuleBlockMarker("", moduleCreate.block.id),
                      status: "DRAFT",
                    });
                    await assignRetrainingModuleBlock(panel, created, moduleCreate.block.id);
                    toast.success("Modul qo'shildi");
                    setModuleCreate(null);
                    await refreshTree();
                  } catch (err) {
                    toast.error(err instanceof ApiError ? err.message : "Modul yaratilmadi");
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
          <p className="mb-3 text-sm text-[#64748B]">
            Blok: <span className="font-medium text-[#0C2340]">{moduleCreate.block.title}</span>
          </p>
          <label className="block text-sm">
            Modul nomi *
            <input
              value={moduleCreate.title}
              onChange={(e) => setModuleCreate({ ...moduleCreate, title: e.target.value })}
              className={fieldClass}
            />
          </label>
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
                    await updateRetrainingModule(panel, moduleForm.editing.id, {
                      module_number: moduleForm.editing.module_number ?? 1,
                      title: moduleForm.editing.title.trim(),
                      status: moduleForm.editing.status,
                      description: moduleForm.editing.description,
                    }, { direction });
                    toast.success("Modul yangilandi");
                    setModuleForm(null);
                    await refreshTree();
                  } catch (err) {
                    toast.error(err instanceof ApiError ? err.message : "Modul yangilanmadi");
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
                    prev ? { editing: { ...prev.editing, title: e.target.value } } : prev
                  )
                }
                className={fieldClass}
              />
            </label>
          </div>
        </DashboardModal>
      ) : null}

      <DirectionFormModal
        open={directionForm}
        editing={direction}
        saving={saving}
        setSaving={setSaving}
        title="Yo'nalishni tahrirlash"
        save={(payload, editing) => saveRetraining(panel, payload, editing)}
        onClose={() => setDirectionForm(false)}
        onSaved={async (updated) => {
          setDirectionForm(false);
          setDirection({ ...updated, retraining_panel: panel, source: "retraining" });
          await refreshTree();
        }}
      />
    </div>
  );
}
