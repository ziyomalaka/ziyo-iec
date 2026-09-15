"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import WizardFooter from "@/components/admin/qualification/wizard/WizardFooter";
import WizardStepper from "@/components/admin/qualification/wizard/WizardStepper";
import DirectionFormModal from "@/components/admin/qualification/DirectionFormModal";

import {
  DirectionStep,
  LessonStep,
  MaterialTypeStep,
  ModuleStep,
  ReviewStep,
  SuccessStep,
} from "@/components/admin/qualification/wizard/WizardSteps";
import {
  GuideMaterialForm,
  LaboratoryMaterialForm,
  PresentationMaterialForm,
  SeminarMaterialForm,
  TestMaterialForm,
  VideoMaterialForm,
} from "@/components/admin/qualification/wizard/MaterialForms";
import {
  createItLesson,
  createItModule,
  getItDirection,
  updateItLesson,
  updateItModule,
} from "@/lib/api/admin-it";
import { ApiError, getApiFieldErrors, materialUploadErrorMessage } from "@/lib/api/errors";
import {
  createQualificationLesson,
  createQualificationModule,
  getQualificationDirection,
  publishLesson,
  saveLessonDraft,
  setModuleStatus,
  submitLessonMaterial,
  updateQualificationLesson,
  updateQualificationModule,
} from "@/lib/api/qualification";
import {
  createMandatoryBlog,
  createMandatoryLesson,
  createMandatoryModule,
  getMandatoryBlog,
  getMandatoryBlogs,
  publishMandatoryLesson,
  submitMandatoryLessonMaterial,
  updateMandatoryBlog,
  updateMandatoryLesson,
  updateMandatoryModule,
} from "@/lib/api/mandatory-blogs";
import {
  assignRetrainingModuleBlock,
  createRetrainingDirection,
  createRetrainingLesson,
  createRetrainingModule,
  getRetrainingDirection,
  getRetrainingDirections,
  publishRetrainingLesson,
  saveRetrainingLessonDraft,
  submitRetrainingLessonMaterial,
  updateRetrainingDirection,
  updateRetrainingLesson,
  updateRetrainingModule,
} from "@/lib/api/retraining-admin";
import type {
  ContentSource,
  MaterialFormData,
  MaterialWizardState,
  QualificationDirection,
  QualificationMaterialType,
  QualificationModule,
} from "@/lib/api/types/qualification";
import type { UploadOptions } from "@/lib/api/upload";
import { formatLessonCode } from "@/lib/qualification/constants";
import {
  isItSource,
  isMandatorySource,
  isRetrainingSource,
  usesQualificationSnapshot,
  directionKey,
  mapItDirection,
  mergeModules,
} from "@/lib/qualification/it-bridge";
import { loadMergedDirections, buildAdminQualificationList } from "@/lib/qualification/load-directions";
import { resolveWizardRetrainingPanel, retrainingPanelRoute, type RetrainingPanel } from "@/lib/retraining/admin-panels";
import { resolveBlocksForDirection, withModuleBlockMarker } from "@/lib/retraining/content-blocks";
import {
  blockIdForWizardModule,
  isDirectionIdCopiedAsModuleId,
  isRetrainingBlockMetaId,
  resolveRetrainingWizardModule,
  sanitizeRetrainingWizardModuleId,
} from "@/lib/retraining/wizard-module";
import { persistSelectedLessonKind } from "@/lib/qualification/lesson-kind-sync";
import { lessonSchema, moduleSchema } from "@/lib/qualification/schemas";
import {
  clearWizardDraft,
  emptyWizardState,
  isLessonDirty,
  isModuleDirty,
  launchFromSearch,
  loadWizardDraft,
  qualificationWizardPath,
  resetDownstreamFromDirection,
  saveWizardDraft,
  shouldReuseDraft,
  stateFromLaunch,
  syncMaterialsForTypes,
} from "@/lib/qualification/wizard-state";
import { safeRandomUUID } from "@/lib/random-id";

function err(error: unknown) {
  return error instanceof ApiError ? error.message : "So'rov bajarilmadi";
}

function needsFile(type: QualificationMaterialType) {
  return type === "VIDEO" || type === "PRESENTATION";
}

function isMaterialValid(item: MaterialFormData) {
  if (!item.title.trim()) return false;
  if (needsFile(item.type) && !item.file && !item.uploaded) return false;
  if (item.type === "GUIDE" && !item.description?.trim() && !item.file && !item.uploaded) return false;
  if (item.type === "SEMINAR" && !item.assignment?.trim()) return false;
  if (item.type === "LABORATORY" && (!item.goal?.trim() || !item.procedure?.trim() || !item.assignment?.trim())) return false;
  if (item.type === "TEST") {
    // Test 3-bosqichli wizard orqali saqlanadi — uploaded:true bo'lgandagina valid
    return item.uploaded === true;
  }
  return true;
}

function fieldError(errors: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (errors[key]) return errors[key];
  }
  return undefined;
}

async function pushQualificationSnapshotForDirection(directionId: number, source?: ContentSource) {
  const detailed = isItSource(source)
    ? await getItDirection(directionId)
        .then(mapItDirection)
        .catch(() => null)
    : await getQualificationDirection(directionId).catch(() => null);
  if (!detailed) return;
  let snapshot = detailed;
  const itId = detailed.itId ?? (isItSource(source) ? detailed.id : undefined);
  if (itId && !isItSource(snapshot.source)) {
    const it = await getItDirection(itId)
      .then(mapItDirection)
      .catch(() => null);
    if (it?.modules?.length) {
      snapshot = { ...detailed, itId, modules: mergeModules(detailed.modules ?? [], it.modules) };
    }
  }
  const { publishQualificationSnapshot } = await import("@/lib/qualification/published-snapshot");
  await publishQualificationSnapshot([snapshot], { notify: true, immediate: true, replaceEmpty: true });
}

export default function MaterialWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<MaterialWizardState>(emptyWizardState);
  const [hydrated, setHydrated] = useState(false);
  const startStepRef = useRef(1);
  const [directions, setDirections] = useState<QualificationDirection[]>([]);
  const [isLoadingDirections, setIsLoadingDirections] = useState(true);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [directionWarning, setDirectionWarning] = useState<{ id: number; title: string; source?: ContentSource } | null>(null);
  const [createDirectionOpen, setCreateDirectionOpen] = useState(false);
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [removeType, setRemoveType] = useState<QualificationMaterialType | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const uploadAbort = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const moduleIdempotencyKey = useRef(safeRandomUUID());
  const lessonIdempotencyKey = useRef(safeRandomUUID());
  /** API response dan tasdiqlangan modul PK — React stale state oldini oladi. */
  const confirmedModuleIdRef = useRef<number | null>(null);

  useEffect(() => {
    const launch = launchFromSearch(searchParams);
    const launchKey = searchParams.toString();
    const draft = loadWizardDraft();
    if (launch) {
      const launched = { ...stateFromLaunch(launch), launchKey };
      startStepRef.current = launched.step;
      setState((prev) => {
        if (draft && shouldReuseDraft(draft, launchKey)) {
          if (launch.lessonId) return draft;
          // "Dars qo'shish" URL'da lessonId yo'q — eski draft ID PATCH qilinmasin
          return {
            ...draft,
            launchKey,
            moduleId: launched.moduleId ?? draft.moduleId ?? null,
            blockId: launched.blockId ?? draft.blockId,
            moduleNumber: launched.moduleNumber ?? draft.moduleNumber,
            moduleTitle: launched.moduleTitle || draft.moduleTitle,
            savedModuleNumber: launched.moduleId ? (launched.savedModuleNumber ?? draft.savedModuleNumber) : draft.savedModuleNumber,
            savedModuleTitle: launched.moduleId ? (launched.savedModuleTitle ?? draft.savedModuleTitle) : draft.savedModuleTitle,
            lessonId: null,
            savedLessonNumber: null,
            savedLessonType: null,
            savedLessonTitle: undefined,
            lessonNumber: launched.lessonNumber ?? draft.lessonNumber,
            lessonTitle: launched.lessonTitle || draft.lessonTitle,
            lessonType: launched.lessonType ?? draft.lessonType,
            lessonCode: launched.lessonCode || draft.lessonCode,
            retrainingPanel: launched.retrainingPanel ?? draft.retrainingPanel,
          };
        }
        if (
          prev.launchKey === launchKey &&
          prev.directionId === launched.directionId
        ) {
          return {
            ...launched,
            moduleId: launched.moduleId ?? prev.moduleId,
            blockId: launched.blockId ?? prev.blockId,
            savedModuleNumber: launched.savedModuleNumber ?? prev.savedModuleNumber,
            savedModuleTitle: launched.savedModuleTitle ?? prev.savedModuleTitle,
            lessonId: launch.lessonId ?? null,
            savedLessonNumber: launch.lessonId ? launched.savedLessonNumber : null,
            savedLessonType: launch.lessonId ? launched.savedLessonType : null,
            savedLessonTitle: launch.lessonId ? launched.savedLessonTitle : undefined,
            lessonTitle: launched.lessonTitle || prev.lessonTitle,
            lessonType: launched.lessonType ?? prev.lessonType,
            lessonCode: launched.lessonCode || prev.lessonCode,
          };
        }
        return launched;
      });
    } else if (draft && !draft.launchKey) {
      startStepRef.current = 1;
      setState(draft);
    } else {
      startStepRef.current = 1;
    }
    setHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    saveWizardDraft(state);
  }, [hydrated, state]);

  const urlSource = searchParams.get("source");
  const urlPanel = searchParams.get("panel");
  const selectedDirection = useMemo(
    () => (state.directionId ? directions.find((item) => item.id === state.directionId) ?? null : null),
    [directions, state.directionId]
  );
  const routePanelHint = urlPanel ?? state.retrainingPanel ?? null;
  const retrainingPanel = resolveWizardRetrainingPanel(routePanelHint, selectedDirection);
  const retrainingMaterialContext = useMemo(
    () => (isRetrainingSource(state.source) && selectedDirection ? { direction: selectedDirection } : undefined),
    [state.source, selectedDirection]
  );
  // Wizard qaysi panel nomidan ochilgan: majburiy blog, qayta tayyorlash yoki malaka oshirish.
  const panelSource: ContentSource | null =
    urlSource === "mandatory" || isMandatorySource(state.source)
      ? "mandatory"
      : urlSource === "retraining" || isRetrainingSource(state.source)
        ? "retraining"
        : null;

  useEffect(() => {
    let cancelled = false;
    if (panelSource === "retraining" && !retrainingPanel) {
      setIsLoadingDirections(false);
      toast.error("Qayta tayyorlash paneli ko'rsatilmagan (?panel=umumiy|pedagogik|kasbiy)");
      return () => {
        cancelled = true;
      };
    }
    const request =
      panelSource === "mandatory"
        ? getMandatoryBlogs({ per_page: 100 })
        : panelSource === "retraining" && retrainingPanel
          ? getRetrainingDirections(retrainingPanel, { per_page: 100 })
          : loadMergedDirections().then(({ merged }) =>
              buildAdminQualificationList(merged).filter((item) => item.id > 0)
            );
    request
      .then((items) => {
        if (!cancelled) setDirections(items);
      })
      .catch((error) => toast.error(err(error)))
      .finally(() => {
        if (!cancelled) setIsLoadingDirections(false);
      });
    return () => {
      cancelled = true;
    };
  }, [panelSource, retrainingPanel]);

  useEffect(() => {
    if (!isRetrainingSource(state.source) || !state.directionId || selectedDirection || !retrainingPanel) return;
    let cancelled = false;
    void getRetrainingDirection(retrainingPanel, state.directionId, true, { fetchMaterials: false })
      .then((detail) => {
        if (cancelled || !detail.id) return;
        setDirections((prev) =>
          prev.some((item) => item.id === detail.id) ? prev : [...prev, detail]
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [state.source, state.directionId, selectedDirection, retrainingPanel]);

  useEffect(() => {
    if (!isRetrainingSource(state.source) || !retrainingPanel || state.retrainingPanel === retrainingPanel) return;
    setState((prev) => ({ ...prev, retrainingPanel }));
  }, [state.source, state.retrainingPanel, retrainingPanel]);

  const retrainingBlocks = useMemo(
    () => (selectedDirection ? resolveBlocksForDirection(selectedDirection) : []),
    [selectedDirection]
  );

  useEffect(() => {
    if (!isRetrainingSource(state.source) || !selectedDirection || !state.moduleId) return;
    const qualModule = resolveRetrainingWizardModule(selectedDirection, state.moduleId);
    if (!qualModule) return;
    const derivedBlockId = blockIdForWizardModule(selectedDirection, qualModule);
    if (!derivedBlockId || state.blockId === derivedBlockId) return;
    setState((prev) => ({ ...prev, blockId: derivedBlockId }));
  }, [state.source, state.moduleId, state.blockId, selectedDirection]);

  useEffect(() => {
    if (!isRetrainingSource(state.source) || !state.moduleId) return;
    const sanitized = sanitizeRetrainingWizardModuleId(selectedDirection, state.moduleId);
    if (sanitized === state.moduleId) {
      if (sanitized) confirmedModuleIdRef.current = sanitized;
      return;
    }
    confirmedModuleIdRef.current = null;
    setState((prev) => ({
      ...prev,
      moduleId: sanitized,
      savedModuleNumber: sanitized ? prev.savedModuleNumber : null,
      savedModuleTitle: sanitized ? prev.savedModuleTitle : undefined,
    }));
    if (state.moduleId && !sanitized) {
      toast.error("Noto'g'ri modul ID. Modulni qayta tanlang yoki yarating.");
    }
  }, [state.source, state.moduleId, selectedDirection]);

  useEffect(() => {
    const dirty = Boolean(state.directionId || state.moduleTitle || state.lessonTitle || state.materials.length);
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty || published) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [state, published]);

  useEffect(() => () => uploadAbort.current?.abort(), []);

  const patch = useCallback((next: Partial<MaterialWizardState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  useEffect(() => {
    if (!isRetrainingSource(state.source) || state.blockId || state.moduleId || retrainingBlocks.length !== 1) return;
    patch({ blockId: retrainingBlocks[0]!.id });
  }, [state.source, state.blockId, state.moduleId, retrainingBlocks, patch]);

  const lessonCode = state.lessonCode || formatLessonCode(state.moduleNumber, state.lessonNumber);

  const goDirection = (id: number, title: string, source?: ContentSource) => {
    const nextSource: ContentSource =
      source === "it" || source === "mandatory" || source === "retraining" ? source : "qualification";
    const hasChildData = Boolean(
      state.moduleId ||
        state.lessonId ||
        state.materials.length ||
        state.moduleTitle.trim() ||
        state.lessonTitle.trim()
    );
    if (state.directionId && state.directionId !== id && hasChildData) {
      setDirectionWarning({ id, title, source: nextSource });
      return;
    }
    if (state.directionId && state.directionId !== id) {
      moduleIdempotencyKey.current = safeRandomUUID();
      lessonIdempotencyKey.current = safeRandomUUID();
      confirmedModuleIdRef.current = null;
      setState((prev) => ({
        ...resetDownstreamFromDirection(prev),
        directionId: id,
        directionTitle: title,
        source: nextSource,
      }));
      return;
    }
    patch({ directionId: id, directionTitle: title, source: nextSource });
  };

  const syncWizardUrl = useCallback(
    (overrides: {
      step?: number;
      directionId?: number;
      moduleId?: number | null;
      lessonId?: number | null;
      blockId?: number | null;
    } = {}) => {
      const moduleId =
        overrides.moduleId === null
          ? undefined
          : overrides.moduleId ?? confirmedModuleIdRef.current ?? state.moduleId ?? undefined;
      const lessonId =
        overrides.lessonId === null ? undefined : overrides.lessonId ?? state.lessonId ?? undefined;
      router.replace(
        qualificationWizardPath({
          step: overrides.step ?? state.step,
          source: state.source,
          retrainingPanel: isRetrainingSource(state.source) ? retrainingPanel ?? state.retrainingPanel : undefined,
          directionId: overrides.directionId ?? state.directionId ?? undefined,
          directionTitle: state.directionTitle,
          blockId: overrides.blockId === null ? undefined : overrides.blockId ?? state.blockId ?? undefined,
          moduleId: moduleId && moduleId > 0 ? moduleId : undefined,
          moduleNumber: state.moduleNumber ?? undefined,
          moduleTitle: state.moduleTitle,
          lessonId: lessonId && lessonId > 0 ? lessonId : undefined,
          lessonNumber: state.lessonNumber ?? undefined,
          lessonType: state.lessonType ?? undefined,
          lessonTitle: state.lessonTitle,
          lessonCode: state.lessonCode,
        })
      );
    },
    [router, state, retrainingPanel]
  );

  const logRetrainingWizardIds = useCallback(
    (label: string, extra?: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== "development" || !isRetrainingSource(state.source)) return;
      console.log(label, {
        panel: retrainingPanel,
        directionId: state.directionId,
        moduleId: confirmedModuleIdRef.current ?? state.moduleId,
        lessonId: state.lessonId,
        ...extra,
      });
    },
    [state.source, state.directionId, state.moduleId, state.lessonId, retrainingPanel]
  );

  const toggleType = (type: QualificationMaterialType) => {
    if (state.materialTypes.includes(type)) {
      const material = state.materials.find((item) => item.type === type);
      const hasData = Boolean(material?.file || material?.assignment || material?.questions?.some((q) => q.question.trim()));
      if (hasData) {
        setRemoveType(type);
        return;
      }
      patch({
        materialTypes: state.materialTypes.filter((item) => item !== type),
        materials: state.materials.filter((item) => item.type !== type),
      });
      return;
    }
    const nextTypes = [...state.materialTypes, type];
    patch({ materialTypes: nextTypes, materials: syncMaterialsForTypes({ ...state, materialTypes: nextTypes }) });
  };

  const resolveModuleForLesson = async (): Promise<QualificationModule | null> => {
    if (!isRetrainingSource(state.source)) {
      return state.moduleId ? ({ id: state.moduleId } as QualificationModule) : null;
    }
    if (!selectedDirection || !state.moduleId) return null;
    let direction = selectedDirection;
    let qualModule = resolveRetrainingWizardModule(direction, state.moduleId);
    if (!qualModule && retrainingPanel && state.directionId) {
      const fresh = await getRetrainingDirection(retrainingPanel, state.directionId, true, { fetchMaterials: false }).catch(
        () => null
      );
      if (fresh) {
        direction = fresh;
        setDirections((prev) => (prev.some((item) => item.id === fresh.id) ? prev.map((item) => (item.id === fresh.id ? fresh : item)) : [...prev, fresh]));
        qualModule = resolveRetrainingWizardModule(fresh, state.moduleId);
      }
    }
    return qualModule;
  };

  const ensureModule = async (): Promise<number | null> => {
    const parsed = moduleSchema.safeParse({ moduleNumber: state.moduleNumber, moduleTitle: state.moduleTitle });
    if (!parsed.success || !state.directionId || !state.moduleNumber) return null;
    if (isRetrainingSource(state.source) && !state.moduleId && !state.blockId) {
      setFieldErrors({ block_id: "Blokni tanlang" });
      toast.error("Avval blokni tanlang");
      return null;
    }
    if (state.moduleId && !isModuleDirty(state)) {
      if (isRetrainingSource(state.source)) {
        const qualModule = await resolveModuleForLesson();
        if (!qualModule?.id) {
          if (selectedDirection && isDirectionIdCopiedAsModuleId(selectedDirection, state.moduleId)) {
            toast.error("Yo'nalish ID modul sifatida ishlatilgan. Modulni qayta yarating.");
          } else if (selectedDirection && isRetrainingBlockMetaId(selectedDirection, state.moduleId)) {
            toast.error("Blok ID modul sifatida ishlatilgan. Modulni qayta yarating.");
          } else {
            toast.error("Modul topilmadi. Modulni qayta yarating.");
          }
          confirmedModuleIdRef.current = null;
          patch({ moduleId: null, savedModuleNumber: null, savedModuleTitle: undefined });
          return null;
        }
        confirmedModuleIdRef.current = qualModule.id;
        if (state.moduleId !== qualModule.id) patch({ moduleId: qualModule.id });
        logRetrainingWizardIds("Retraining wizard IDs (existing module)", {
          createdModuleId: qualModule.id,
        });
        return qualModule.id;
      }
      confirmedModuleIdRef.current = state.moduleId;
      return state.moduleId;
    }
    setIsCreatingModule(true);
    setFieldErrors({});
    try {
      if (state.moduleId && isModuleDirty(state)) {
        if (isItSource(state.source)) {
          await updateItModule(state.moduleId, {
            title: state.moduleTitle.trim(),
            order_index: state.moduleNumber,
          });
        } else if (isMandatorySource(state.source)) {
          await updateMandatoryModule(state.moduleId, {
            module_number: state.moduleNumber,
            title: state.moduleTitle.trim(),
          });
        } else if (isRetrainingSource(state.source)) {
          await updateRetrainingModule(state.moduleId, {
            module_number: state.moduleNumber,
            title: state.moduleTitle.trim(),
          });
        } else {
          await updateQualificationModule(state.moduleId, {
            module_number: state.moduleNumber,
            title: state.moduleTitle.trim(),
          });
        }
        patch({
          savedModuleNumber: state.moduleNumber,
          savedModuleTitle: state.moduleTitle.trim(),
        });
        if (usesQualificationSnapshot(state.source) && state.directionId) {
          await pushQualificationSnapshotForDirection(state.directionId, state.source).catch(() => undefined);
        }
        toast.success("Modul yangilandi");
        confirmedModuleIdRef.current = state.moduleId;
        return state.moduleId;
      }
      const created = isItSource(state.source)
        ? await createItModule(state.directionId, {
            title: state.moduleTitle.trim(),
            order_index: state.moduleNumber,
            status: "PUBLISHED",
          })
        : isMandatorySource(state.source)
          ? await createMandatoryModule(
              state.directionId,
              {
                module_number: state.moduleNumber,
                title: state.moduleTitle.trim(),
                status: "PUBLISHED",
              },
              { idempotencyKey: moduleIdempotencyKey.current }
            )
          : isRetrainingSource(state.source)
            ? await createRetrainingModule(
                retrainingPanel!,
                state.directionId,
                {
                  module_number: state.moduleNumber,
                  title: state.moduleTitle.trim(),
                  description: state.blockId ? withModuleBlockMarker("", state.blockId) : undefined,
                  status: "PUBLISHED",
                },
                { idempotencyKey: moduleIdempotencyKey.current },
                retrainingMaterialContext
              )
            : await createQualificationModule(
              state.directionId,
              {
                module_number: state.moduleNumber,
                title: state.moduleTitle.trim(),
              },
              { idempotencyKey: moduleIdempotencyKey.current }
            );
      const createdModuleId = created.id;
      if (!createdModuleId) throw new ApiError(500, "Modul ID qaytmadi");
      if (
        isRetrainingSource(state.source) &&
        isDirectionIdCopiedAsModuleId(selectedDirection, createdModuleId)
      ) {
        throw new ApiError(500, "Modul ID qaytmadi — backend yo'nalish ID qaytardi, module.id emas");
      }
      if (isRetrainingSource(state.source) && state.blockId) {
        await assignRetrainingModuleBlock(retrainingPanel!, created, state.blockId).catch(() => undefined);
      }
      if (!isItSource(state.source) && !isMandatorySource(state.source) && !isRetrainingSource(state.source)) {
        await setModuleStatus(created.id, "PUBLISHED", {
          module_number: state.moduleNumber,
          title: state.moduleTitle.trim(),
        }).catch(() => undefined);
      } else if (isItSource(state.source)) {
        await updateItModule(created.id, {
          title: state.moduleTitle.trim(),
          order_index: state.moduleNumber,
          status: "PUBLISHED",
        }).catch(() => undefined);
      }
      confirmedModuleIdRef.current = createdModuleId;
      patch({
        moduleId: createdModuleId,
        savedModuleNumber: state.moduleNumber,
        savedModuleTitle: state.moduleTitle.trim(),
      });
      if (isRetrainingSource(state.source) && selectedDirection) {
        setDirections((prev) =>
          prev.map((item) =>
            item.id === selectedDirection.id
              ? {
                  ...item,
                  modules: [...(item.modules ?? []).filter((row) => row.id !== createdModuleId), created],
                }
              : item
          )
        );
      }
      logRetrainingWizardIds("Module created", {
        directionId: state.directionId,
        createdModuleId,
      });
      if (usesQualificationSnapshot(state.source)) {
        await pushQualificationSnapshotForDirection(state.directionId, state.source).catch(() => undefined);
      }
      toast.success("✓ Modul yaratildi");
      return createdModuleId;
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      toast.error(error instanceof ApiError ? error.message : "Modulni yaratib bo'lmadi");
      return null;
    } finally {
      setIsCreatingModule(false);
    }
  };

  const ensureLesson = async (moduleIdOverride?: number | null) => {
    const parsed = lessonSchema.safeParse({
      lessonType: state.lessonType,
      lessonNumber: state.lessonNumber,
      lessonTitle: state.lessonTitle,
    });
    const moduleIdHint = moduleIdOverride ?? confirmedModuleIdRef.current ?? state.moduleId;
    if (!parsed.success || !moduleIdHint || !state.lessonType || !state.lessonNumber) {
      if (!moduleIdHint) toast.error("Dars yaratish uchun avval modul yaratilishi kerak.");
      return false;
    }

    const urlLessonId = Number(searchParams.get("lessonId") ?? "");
    const existingLessonId = Number.isInteger(urlLessonId) && urlLessonId > 0 ? urlLessonId : null;

    const persistItLessonKind = async (lessonId?: number | null) => {
      if (!state.lessonType) return;
      await persistSelectedLessonKind({
        directions,
        source: state.source,
        itDirectionId: state.directionId,
        lessonId: lessonId ?? state.lessonId,
        moduleTitle: state.moduleTitle,
      moduleNumber: state.moduleNumber ?? 1,
      lessonTitle: state.lessonTitle,
      lessonNumber: state.lessonNumber ?? 1,
        lessonType: state.lessonType,
      }).catch(() => undefined);
    };

    const canReuseExistingLesson =
      existingLessonId &&
      !isLessonDirty({ ...state, lessonId: existingLessonId }) &&
      (!isRetrainingSource(state.source) || Boolean(state.savedLessonTitle));

    if (canReuseExistingLesson) {
      if (state.lessonId !== existingLessonId) patch({ lessonId: existingLessonId });
      await persistItLessonKind(existingLessonId);
      return true;
    }
    setIsCreatingLesson(true);
    setFieldErrors({});
    try {
      if (existingLessonId) {
        if (isItSource(state.source)) {
          await updateItLesson(existingLessonId, {
            title: state.lessonTitle.trim(),
            item_type: "lesson",
            lesson_type: state.lessonType,
            order_index: state.lessonNumber,
          });
          patch({
            lessonId: existingLessonId,
            savedLessonNumber: state.lessonNumber,
            savedLessonType: state.lessonType,
            savedLessonTitle: state.lessonTitle.trim(),
            lessonCode: formatLessonCode(state.moduleNumber, state.lessonNumber),
          });
          await persistItLessonKind(existingLessonId);
        } else if (isMandatorySource(state.source)) {
          const updated = await updateMandatoryLesson(existingLessonId, {
            lesson_number: state.lessonNumber,
            lesson_type: state.lessonType,
            title: state.lessonTitle.trim(),
          });
          patch({
            lessonId: existingLessonId,
            savedLessonNumber: state.lessonNumber,
            savedLessonType: state.lessonType,
            savedLessonTitle: state.lessonTitle.trim(),
            lessonCode: updated.lesson_code || formatLessonCode(state.moduleNumber, state.lessonNumber),
          });
          await persistItLessonKind(existingLessonId);
        } else if (isRetrainingSource(state.source)) {
          const updated = await updateRetrainingLesson(existingLessonId, {
            lesson_number: state.lessonNumber,
            lesson_type: state.lessonType,
            title: state.lessonTitle.trim(),
          });
          patch({
            lessonId: existingLessonId,
            savedLessonNumber: state.lessonNumber,
            savedLessonType: state.lessonType,
            savedLessonTitle: state.lessonTitle.trim(),
            lessonCode: updated.lesson_code || formatLessonCode(state.moduleNumber, state.lessonNumber),
          });
          await persistItLessonKind(existingLessonId);
        } else {
          const updated = await updateQualificationLesson(existingLessonId, {
            lesson_number: state.lessonNumber,
            lesson_type: state.lessonType,
            title: state.lessonTitle.trim(),
          });
          patch({
            lessonId: existingLessonId,
            savedLessonNumber: state.lessonNumber,
            savedLessonType: state.lessonType,
            savedLessonTitle: state.lessonTitle.trim(),
            lessonCode: updated.lesson_code || formatLessonCode(state.moduleNumber, state.lessonNumber),
          });
          await persistItLessonKind(existingLessonId);
        }
        toast.success("Dars yangilandi");
        if (usesQualificationSnapshot(state.source) && state.directionId) {
          await pushQualificationSnapshotForDirection(state.directionId, state.source).catch(() => undefined);
        }
        return true;
      }
      let selectedModuleId = moduleIdHint;
      let moduleObject: QualificationModule | null = null;
      if (isRetrainingSource(state.source)) {
        if (selectedDirection) {
          moduleObject = resolveRetrainingWizardModule(selectedDirection, moduleIdHint);
          if (!moduleObject && retrainingPanel && state.directionId) {
            const fresh = await getRetrainingDirection(retrainingPanel, state.directionId, true, {
              fetchMaterials: false,
            }).catch(() => null);
            if (fresh) {
              moduleObject = resolveRetrainingWizardModule(fresh, moduleIdHint);
              setDirections((prev) =>
                prev.some((item) => item.id === fresh.id)
                  ? prev.map((item) => (item.id === fresh.id ? fresh : item))
                  : [...prev, fresh]
              );
            }
          }
        }
        if (!moduleObject?.id) {
          if (selectedDirection && isDirectionIdCopiedAsModuleId(selectedDirection, moduleIdHint)) {
            toast.error("Yo'nalish ID modul sifatida yuborilgan. Avval modulni saqlang.");
          } else if (selectedDirection && isRetrainingBlockMetaId(selectedDirection, moduleIdHint)) {
            toast.error("Blok ID modul sifatida yuborilgan. Avval modulni saqlang.");
          } else {
            toast.error("Modul topilmadi. Avval modulni saqlang.");
          }
          return false;
        }
        selectedModuleId = moduleObject.id;
        confirmedModuleIdRef.current = selectedModuleId;
        logRetrainingWizardIds("Creating lesson", {
          selectedBlockId: state.blockId ?? blockIdForWizardModule(selectedDirection, moduleObject),
          selectedModuleId,
          moduleObject: {
            id: moduleObject.id,
            module_number: moduleObject.module_number,
            title: moduleObject.title,
          },
        });
      }
      lessonIdempotencyKey.current = safeRandomUUID();
      const created = isItSource(state.source)
        ? await createItLesson(selectedModuleId, {
            title: state.lessonTitle.trim(),
            item_type: "lesson",
            lesson_type: state.lessonType,
            order_index: state.lessonNumber ?? 1,
          }).catch(() =>
            createItLesson(selectedModuleId, {
              title: state.lessonTitle.trim(),
              item_type: "lesson",
              order_index: state.lessonNumber ?? 1,
            })
          )
        : isMandatorySource(state.source)
          ? await createMandatoryLesson(
              state.moduleId,
              {
                lesson_number: state.lessonNumber,
                lesson_type: state.lessonType,
                title: state.lessonTitle.trim(),
              },
              { idempotencyKey: lessonIdempotencyKey.current }
            )
          : isRetrainingSource(state.source)
            ? await createRetrainingLesson(
                retrainingPanel!,
                selectedModuleId,
                {
                  lesson_number: state.lessonNumber,
                  lesson_type: state.lessonType,
                  title: state.lessonTitle.trim(),
                },
                { idempotencyKey: lessonIdempotencyKey.current },
                retrainingMaterialContext
              )
          : await createQualificationLesson(
              selectedModuleId,
              {
                lesson_number: state.lessonNumber,
                lesson_type: state.lessonType,
                title: state.lessonTitle.trim(),
              },
              { idempotencyKey: lessonIdempotencyKey.current }
            );
      if (!created?.id) throw new ApiError(500, "Dars ID qaytmadi");
      const assignedNumber = created.lesson_number ?? state.lessonNumber;
      const code = formatLessonCode(state.moduleNumber, assignedNumber);
      patch({
        lessonId: created.id,
        moduleId: selectedModuleId,
        lessonNumber: assignedNumber,
        lessonCode: code,
        savedLessonNumber: assignedNumber,
        savedLessonType: state.lessonType,
        savedLessonTitle: state.lessonTitle.trim(),
      });
      router.replace(
        qualificationWizardPath({
          step: state.step,
          source: state.source,
          retrainingPanel: isRetrainingSource(state.source) ? retrainingPanel ?? state.retrainingPanel : undefined,
          directionId: state.directionId ?? undefined,
          directionTitle: state.directionTitle,
          moduleId: selectedModuleId,
          blockId: state.blockId ?? undefined,
          moduleNumber: state.moduleNumber ?? undefined,
          moduleTitle: state.moduleTitle,
          lessonId: created.id,
          lessonNumber: assignedNumber,
          lessonType: state.lessonType ?? undefined,
          lessonTitle: state.lessonTitle.trim(),
          lessonCode: code,
        })
      );
      if (isMandatorySource(state.source) && state.directionId) {
        const detailed = await getMandatoryBlog(state.directionId).catch(() => null);
        if (detailed) {
          const { publishMandatorySnapshot } = await import("@/lib/api/mandatory-snapshot");
          void publishMandatorySnapshot([detailed], "upsert", { notify: false });
        }
      }
      await persistItLessonKind(created.id);
      if (usesQualificationSnapshot(state.source) && state.directionId) {
        await pushQualificationSnapshotForDirection(state.directionId, state.source).catch(() => undefined);
      }
      toast.success(
        assignedNumber !== state.lessonNumber
          ? `✓ Dars yaratildi (#${assignedNumber} — ${state.lessonNumber} band edi)`
          : "✓ Dars yaratildi"
      );
      return true;
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      toast.error(error instanceof ApiError ? error.message : "Darsni yaratib bo'lmadi");
      return false;
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const uploadOne = async (item: MaterialFormData, lessonId: number, controller: AbortController) => {
    const options = {
      signal: controller.signal,
      onProgress: (percent: number) => {
        setState((prev) => ({
          ...prev,
          materials: prev.materials.map((row) =>
            row.type === item.type ? { ...row, uploadProgress: percent, uploadError: undefined } : row
          ),
        }));
      },
    };
    if (isRetrainingSource(state.source)) {
      if (!retrainingPanel) {
        throw new ApiError(400, "Qayta tayyorlash paneli aniqlanmadi (?panel=umumiy|pedagogik|kasbiy)");
      }
      if (!retrainingMaterialContext?.direction) {
        throw new ApiError(
          400,
          "Yo'nalish ma'lumoti topilmadi — material uchun to'g'ri panel (retraining_type) aniqlanmaydi"
        );
      }
    }
    // mandatory-blog / retraining-admin / qualification / IT — files → lessons/{id}/materials (file_id)
    const submitMaterial = isMandatorySource(state.source)
      ? submitMandatoryLessonMaterial
      : isRetrainingSource(state.source)
        ? (lessonId: number, material: MaterialFormData, uploadOptions?: UploadOptions) =>
            submitRetrainingLessonMaterial(
              retrainingPanel!,
              lessonId,
              material,
              uploadOptions,
              retrainingMaterialContext
            )
        : submitLessonMaterial;
    const result = await submitMaterial(lessonId, item, options);
    setState((prev) => ({
      ...prev,
      materials: prev.materials.map((row) =>
        row.type === item.type
          ? {
              ...row,
              uploaded: true,
              uploadProgress: 100,
              uploadError: undefined,
              serverId: result.id,
              fileId: "fileId" in result ? result.fileId : row.fileId,
              file: null,
            }
          : row
      ),
    }));
    toast.success("✓ Material saqlandi");
  };

  const uploadAll = async () => {
    if (!state.lessonId) return false;
    const pending = state.materials.filter((item) => !item.uploaded);
    if (pending.length === 0) return true;
    setIsUploading(true);
    uploadAbort.current?.abort();
    const controller = new AbortController();
    uploadAbort.current = controller;
    let ok = true;
    for (const item of pending) {
      try {
        await uploadOne(item, state.lessonId, controller);
      } catch (error) {
        ok = false;
        const { message, retryable } = materialUploadErrorMessage(error);
        setState((prev) => ({
          ...prev,
          materials: prev.materials.map((row) =>
            row.type === item.type
              ? { ...row, uploadError: message, uploadRetryable: retryable, uploadProgress: 0 }
              : row
          ),
        }));
        toast.error(message);
      }
    }
    setIsUploading(false);
    if (ok && usesQualificationSnapshot(state.source) && state.directionId) {
      await pushQualificationSnapshotForDirection(state.directionId, state.source).catch(() => undefined);
    }
    return ok;
  };

  const retryMaterial = async (type: QualificationMaterialType) => {
    if (!state.lessonId || isUploading || busyRef.current) return;
    const item = state.materials.find((row) => row.type === type);
    if (!item) return;
    busyRef.current = true;
    setIsUploading(true);
    const controller = new AbortController();
    uploadAbort.current = controller;
    try {
      await uploadOne(item, state.lessonId, controller);
    } catch (error) {
      const { message, retryable } = materialUploadErrorMessage(error);
      setState((prev) => ({
        ...prev,
        materials: prev.materials.map((row) =>
          row.type === type
            ? { ...row, uploadError: message, uploadRetryable: retryable, uploadProgress: 0 }
            : row
        ),
      }));
      toast.error(message);
    } finally {
      setIsUploading(false);
      busyRef.current = false;
    }
  };

  const next = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (state.step === 1 && state.directionId) {
        const launchModuleRaw = Number(searchParams.get("moduleId") ?? "");
        const hasLaunchModule = Number.isInteger(launchModuleRaw) && launchModuleRaw > 0;
        if (!hasLaunchModule) confirmedModuleIdRef.current = null;
        patch({
          step: 2,
          ...(hasLaunchModule
            ? {}
            : { moduleId: null, savedModuleNumber: null, savedModuleTitle: undefined, lessonId: null }),
        });
        syncWizardUrl({ step: 2, moduleId: hasLaunchModule ? launchModuleRaw : null, lessonId: null });
        logRetrainingWizardIds("Retraining wizard IDs (after direction)");
        return;
      }
      if (state.step === 2) {
        const createdModuleId = await ensureModule();
        if (!createdModuleId) return;
        patch({ step: 3, moduleId: createdModuleId });
        syncWizardUrl({ step: 3, moduleId: createdModuleId });
        return;
      }
      if (state.step === 3) {
        const moduleIdForLesson = confirmedModuleIdRef.current ?? state.moduleId;
        if (!moduleIdForLesson) {
          toast.error("Dars yaratish uchun avval modul yaratilishi kerak.");
          return;
        }
        const ok = await ensureLesson(moduleIdForLesson);
        if (ok) patch({ step: 4 });
        return;
      }
      if (state.step === 4 && state.materialTypes.length) {
        if (!state.lessonId) {
          toast.error("Avval dars yaratilishi kerak");
          return;
        }
        patch({ step: 5, materials: syncMaterialsForTypes(state) });
        return;
      }
      if (state.step === 5) {
        const ok = await uploadAll();
        if (ok) patch({ step: 6 });
        return;
      }
      if (state.step === 6 || state.step === 7) {
        patch({ step: 7 });
        setPublishOpen(true);
      }
    } finally {
      busyRef.current = false;
    }
  };

  const onDraft = async () => {
    if (!state.lessonId || busyRef.current) {
      if (!state.lessonId) toast.error("Avval dars yaratilishi kerak");
      return;
    }
    busyRef.current = true;
    setIsSavingDraft(true);
    try {
      if (isItSource(state.source)) {
        patch({ status: "DRAFT" });
        toast.success("✓ Qoralama saqlandi");
        return;
      }
      const draftPayload = {
        lesson_number: state.lessonNumber ?? 1,
        lesson_type: state.lessonType || "THEORY",
        title: state.lessonTitle.trim() || "Dars",
      };
      await (isRetrainingSource(state.source)
        ? saveRetrainingLessonDraft(state.lessonId, draftPayload)
        : saveLessonDraft(state.lessonId, draftPayload));
      patch({ status: "DRAFT" });
      toast.success("✓ Qoralama saqlandi");
    } catch {
      toast.error("Qoralamani saqlab bo'lmadi");
    } finally {
      setIsSavingDraft(false);
      busyRef.current = false;
    }
  };

  const onPublish = async () => {
    if (!state.lessonId || isUploading || busyRef.current) return;
    busyRef.current = true;
    setIsPublishing(true);
    try {
      // Faqat POST /publish — tayyorlik checklari backendda
      await (isMandatorySource(state.source)
        ? publishMandatoryLesson(state.lessonId)
        : isRetrainingSource(state.source)
          ? publishRetrainingLesson(retrainingPanel!, state.lessonId, retrainingMaterialContext)
          : publishLesson(state.lessonId));
      if (isMandatorySource(state.source) && state.directionId) {
        const detailed = await getMandatoryBlog(state.directionId).catch(() => null);
        if (detailed) {
          const { publishMandatorySnapshot } = await import("@/lib/api/mandatory-snapshot");
          void publishMandatorySnapshot([detailed], "upsert", { notify: true });
        }
      } else if (state.directionId && usesQualificationSnapshot(state.source)) {
        await pushQualificationSnapshotForDirection(state.directionId, state.source);
      }
      patch({ status: "PUBLISHED" });
      clearWizardDraft();
      setPublished(true);
      setPublishOpen(false);
      toast.success("✓ Dars nashr qilindi");
    } catch (err) {
      // Backend validatsiya (material yo'q, modul yo'q, ...) — xabarni ko'rsatamiz
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Nashr qilishda xatolik yuz berdi.";
      toast.error(msg);
    } finally {
      setIsPublishing(false);
      busyRef.current = false;
    }
  };

  const homeHref =
    panelSource === "mandatory"
      ? "/admin/software/mandatory"
      : panelSource === "retraining"
        ? retrainingPanelRoute(retrainingPanel)
        : "/admin/software/qualification";

  const leave = () => {
    const dirty = Boolean(state.directionId || state.moduleTitle || state.lessonTitle || state.materials.length);
    if (dirty && !window.confirm("Saqlanmagan ma'lumotlar mavjud.\n\nSahifadan chiqmoqchimisiz?")) return;
    router.push(homeHref);
  };

  const stepValid = useMemo(() => {
    if (state.step === 1) return state.directionId !== null;
    if (state.step === 2) {
      const parsed = moduleSchema.safeParse({ moduleNumber: state.moduleNumber, moduleTitle: state.moduleTitle }).success;
      if (!parsed) return false;
      if (isRetrainingSource(state.source) && !state.moduleId && !state.blockId) return false;
      return true;
    }
    if (state.step === 3) {
      if (!state.moduleId) return false;
      return lessonSchema.safeParse({
        lessonType: state.lessonType,
        lessonNumber: state.lessonNumber,
        lessonTitle: state.lessonTitle,
      }).success;
    }
    if (state.step === 4) return Boolean(state.lessonId) && state.materialTypes.length >= 1;
    if (state.step === 5) return state.materials.length > 0 && state.materials.every(isMaterialValid) && !isUploading;
    return Boolean(state.lessonId) && !isUploading;
  }, [state, isUploading]);

  if (!hydrated) return <LoadingState />;

  if (published) {
    return (
      <SuccessStep
        code={lessonCode}
        title={state.lessonTitle}
        onView={() => router.push(homeHref)}
        onAgain={() => {
          clearWizardDraft();
          setPublished(false);
          moduleIdempotencyKey.current = safeRandomUUID();
          lessonIdempotencyKey.current = safeRandomUUID();
          setState({
            ...emptyWizardState(),
            source: panelSource ?? undefined,
          });
        }}
        onHome={() => router.push(homeHref)}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-[#E8EDF5] bg-white p-4 shadow-sm sm:p-5">
      <button type="button" onClick={leave} className="mb-4 text-sm text-[#0756F5]">
        {panelSource === "mandatory"
          ? "← Majburiy blog"
          : panelSource === "retraining"
            ? "← Qayta tayyorlash"
            : "← Malaka oshirish"}
      </button>
      <WizardStepper step={state.step} />
      <div className="mt-6">
        {state.step === 1 ? (
          <DirectionStep
            directions={directions}
            loading={isLoadingDirections}
            value={state.directionId}
            source={state.source}
            onChange={goDirection}
            onCreate={() => setCreateDirectionOpen(true)}
          />
        ) : null}
        {state.step === 2 ? (
          <ModuleStep
            directionTitle={state.directionTitle}
            moduleNumber={state.moduleNumber}
            moduleTitle={state.moduleTitle}
            moduleId={state.moduleId}
            blocks={isRetrainingSource(state.source) ? retrainingBlocks : undefined}
            blockId={state.blockId}
            errors={{
              module_number: fieldError(fieldErrors, "module_number", "moduleNumber"),
              title: fieldError(fieldErrors, "title", "moduleTitle"),
              block_id: fieldError(fieldErrors, "block_id", "blockId"),
            }}
            onNumber={(moduleNumber) => patch({ moduleNumber })}
            onTitle={(moduleTitle) => patch({ moduleTitle })}
            onBlockId={
              isRetrainingSource(state.source)
                ? (blockId) => patch({ blockId, moduleId: null, savedModuleNumber: null, savedModuleTitle: undefined })
                : undefined
            }
          />
        ) : null}
        {state.step === 3 ? (
          <LessonStep
            state={state}
            errors={{
              lesson_number: fieldError(fieldErrors, "lesson_number", "lessonNumber"),
              lesson_type: fieldError(fieldErrors, "lesson_type", "lessonType"),
              title: fieldError(fieldErrors, "title", "lessonTitle"),
            }}
            onType={(lessonType) => patch({ lessonType })}
            onNumber={(lessonNumber) => patch({ lessonNumber })}
            onTitle={(lessonTitle) => patch({ lessonTitle })}
          />
        ) : null}
        {state.step === 4 ? (
          <MaterialTypeStep
            lessonCode={lessonCode}
            lessonTitle={state.lessonTitle}
            selected={state.materialTypes}
            onToggle={toggleType}
          />
        ) : null}
        {state.step === 5 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#0C2340]">Yuklash</h2>
            {state.materials.map((item) => {
              const onChange = (next: MaterialFormData) =>
                setState((prev) => ({
                  ...prev,
                  materials: prev.materials.map((row) => (row.type === item.type ? next : row)),
                }));
              if (item.type === "VIDEO") return <VideoMaterialForm key={item.type} value={item} onChange={onChange} disabled={isUploading} onRetryUpload={() => void retryMaterial(item.type)} />;
              if (item.type === "PRESENTATION") return <PresentationMaterialForm key={item.type} value={item} onChange={onChange} disabled={isUploading} onRetryUpload={() => void retryMaterial(item.type)} />;
              if (item.type === "GUIDE") return <GuideMaterialForm key={item.type} value={item} onChange={onChange} disabled={isUploading} onRetryUpload={() => void retryMaterial(item.type)} />;
              if (item.type === "SEMINAR") return <SeminarMaterialForm key={item.type} value={item} onChange={onChange} disabled={isUploading} onRetryUpload={() => void retryMaterial(item.type)} />;
              if (item.type === "LABORATORY") return <LaboratoryMaterialForm key={item.type} value={item} onChange={onChange} disabled={isUploading} onRetryUpload={() => void retryMaterial(item.type)} />;
              return <TestMaterialForm key={item.type} value={item} onChange={onChange} disabled={isUploading} lessonId={state.lessonId ?? undefined} source={state.source} />;
            })}
          </div>
        ) : null}
        {state.step === 6 || state.step === 7 ? <ReviewStep state={state} onEdit={(step) => patch({ step })} /> : null}
      </div>

      <WizardFooter
        onBack={
          state.step > startStepRef.current
            ? () => patch({ step: state.step === 7 ? 6 : state.step - 1 })
            : startStepRef.current > 1
              ? leave
              : undefined
        }
        backDisabled={isCreatingModule || isCreatingLesson || isUploading || isPublishing}
        onNext={() => void next()}
        nextLabel={
          state.step >= 6
            ? "Saqlash va nashr qilish"
            : state.step === 2 || state.step === 3
              ? "Saqlash va davom etish →"
              : "Keyingisi →"
        }
        nextDisabled={!stepValid || isCreatingModule || isCreatingLesson || isUploading || isPublishing || isSavingDraft || isSavingDirection}
        nextLoading={isCreatingModule || isCreatingLesson || isUploading || isPublishing}
        nextLoadingLabel={
          isCreatingModule
            ? "Modul yaratilmoqda..."
            : isCreatingLesson
              ? "Dars yaratilmoqda..."
              : isUploading
                ? "Yuklanmoqda..."
                : isPublishing
                  ? "Nashr qilinmoqda..."
                  : "Yaratilmoqda..."
        }
        secondary={
          state.step >= 6 ? (
            <button
              type="button"
              disabled={isSavingDraft || !state.lessonId}
              onClick={() => void onDraft()}
              className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-50"
            >
              {isSavingDraft ? "Saqlanmoqda..." : "Qoralama saqlash"}
            </button>
          ) : null
        }
      />

      <DirectionFormModal
        open={createDirectionOpen}
        saving={isSavingDirection}
        setSaving={setIsSavingDirection}
        title={
          panelSource === "mandatory"
            ? "Yangi majburiy blog"
            : panelSource === "retraining"
              ? "Yangi qayta tayyorlash yo'nalishi"
              : undefined
        }
        save={
          panelSource === "mandatory"
            ? async (payload, editing) =>
                editing?.id ? updateMandatoryBlog(editing.id, payload) : createMandatoryBlog(payload)
            : panelSource === "retraining"
              ? async (payload, editing) => {
                  if (!retrainingPanel) {
                    throw new ApiError(400, "Qayta tayyorlash paneli ko'rsatilmagan (?panel=umumiy|pedagogik|kasbiy)");
                  }
                  return editing?.id
                    ? updateRetrainingDirection(retrainingPanel, editing.id, payload)
                    : createRetrainingDirection(retrainingPanel, payload);
                }
              : undefined
        }
        onClose={() => setCreateDirectionOpen(false)}
        onSaved={(created) => {
          confirmedModuleIdRef.current = null;
          moduleIdempotencyKey.current = safeRandomUUID();
          lessonIdempotencyKey.current = safeRandomUUID();
          setDirections((prev) => {
            const key = directionKey(created);
            if (prev.some((item) => directionKey(item) === key)) {
              return prev.map((item) => (directionKey(item) === key ? { ...item, ...created } : item));
            }
            return [...prev, created];
          });
          setState((prev) => ({
            ...resetDownstreamFromDirection(prev),
            directionId: created.id,
            directionTitle: created.title,
            source: created.source ?? prev.source,
          }));
          syncWizardUrl({ directionId: created.id, moduleId: null, lessonId: null });
          logRetrainingWizardIds("Retraining wizard IDs (direction created)", {
            directionId: created.id,
          });
          setCreateDirectionOpen(false);
        }}
      />

      <DashboardModal
        open={Boolean(directionWarning)}
        onClose={() => setDirectionWarning(null)}
        title={"Yo'nalishni o'zgartirish"}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setDirectionWarning(null)} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => {
                if (!directionWarning) return;
                moduleIdempotencyKey.current = safeRandomUUID();
                lessonIdempotencyKey.current = safeRandomUUID();
                confirmedModuleIdRef.current = null;
                setState((prev) => ({
                  ...resetDownstreamFromDirection(prev),
                  directionId: directionWarning.id,
                  directionTitle: directionWarning.title,
                  source: directionWarning.source,
                }));
                setDirectionWarning(null);
              }}
              className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white"
            >
              Davom etish
            </button>
          </>
        }
      >
        <p className="text-sm text-[#64748B]">
          {"Yo'nalishni o'zgartirsangiz, keyingi bosqichlarda kiritilgan ma'lumotlar tozalanadi."}
        </p>
      </DashboardModal>

      <DashboardModal
        open={Boolean(removeType)}
        onClose={() => setRemoveType(null)}
        title="Materialni olib tashlash"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setRemoveType(null)} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => {
                if (!removeType) return;
                patch({
                  materialTypes: state.materialTypes.filter((item) => item !== removeType),
                  materials: state.materials.filter((item) => item.type !== removeType),
                });
                setRemoveType(null);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
            >
              Olib tashlash
            </button>
          </>
        }
      >
        <p className="text-sm text-[#64748B]">
          {"Ushbu materialni olib tashlamoqchimisiz? Kiritilgan ma'lumotlar ham olib tashlanadi."}
        </p>
      </DashboardModal>

      <DashboardModal
        open={publishOpen}
        onClose={() => {
          if (!isPublishing) {
            setPublishOpen(false);
            if (state.step === 7) patch({ step: 6 });
          }
        }}
        title="Darsni nashr qilmoqchimisiz?"
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={isPublishing}
              onClick={() => setPublishOpen(false)}
              className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={isPublishing}
              onClick={() => void onPublish()}
              className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {isPublishing ? "Nashr qilinmoqda..." : "Nashr qilish"}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#64748B]">
          {"Nashr qilingandan so'ng ushbu dars tinglovchilarga ko'rinadi. Backend kamida 1 material va modul/yo'nalishni tekshiradi."}
        </p>
      </DashboardModal>
    </div>
  );
}
