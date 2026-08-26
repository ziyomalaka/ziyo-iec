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
import { ApiError, getApiFieldErrors } from "@/lib/api/errors";
import {
  createQualificationLesson,
  createQualificationModule,
  getQualificationDirection,
  publishLesson,
  saveLessonDraft,
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
import type {
  ContentSource,
  MaterialFormData,
  MaterialWizardState,
  QualificationDirection,
  QualificationMaterialType,
} from "@/lib/api/types/qualification";
import { formatLessonCode } from "@/lib/qualification/constants";
import { isItSource, isMandatorySource, directionKey, mapItDirection, mergeModules } from "@/lib/qualification/it-bridge";
import { loadMergedDirections } from "@/lib/qualification/load-directions";
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
  const moduleIdempotencyKey = useRef(crypto.randomUUID());
  const lessonIdempotencyKey = useRef(crypto.randomUUID());

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
            lessonId: null,
            savedLessonNumber: null,
            savedLessonType: null,
            savedLessonTitle: undefined,
            lessonNumber: launched.lessonNumber ?? draft.lessonNumber,
            lessonTitle: launched.lessonTitle || draft.lessonTitle,
            lessonType: launched.lessonType ?? draft.lessonType,
            lessonCode: launched.lessonCode || draft.lessonCode,
          };
        }
        if (
          prev.launchKey === launchKey &&
          prev.directionId === launched.directionId
        ) {
          return {
            ...launched,
            moduleId: launched.moduleId ?? prev.moduleId,
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

  const directionSource = searchParams.get("source") === "mandatory" || state.source === "mandatory";
  useEffect(() => {
    let cancelled = false;
    const request = directionSource
      ? getMandatoryBlogs({ per_page: 100 }).then((items) => {
          if (!cancelled) setDirections(items);
        })
      : loadMergedDirections().then(({ merged }) => {
          if (!cancelled) setDirections(merged);
        });
    request
      .catch((error) => toast.error(err(error)))
      .finally(() => {
        if (!cancelled) setIsLoadingDirections(false);
      });
    return () => {
      cancelled = true;
    };
  }, [directionSource]);

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

  const lessonCode = state.lessonCode || formatLessonCode(state.moduleNumber, state.lessonNumber);

  const goDirection = (id: number, title: string, source?: ContentSource) => {
    const nextSource = source === "it" ? "it" : source === "mandatory" ? "mandatory" : "qualification";
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
      moduleIdempotencyKey.current = crypto.randomUUID();
      lessonIdempotencyKey.current = crypto.randomUUID();
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

  const ensureModule = async () => {
    const parsed = moduleSchema.safeParse({ moduleNumber: state.moduleNumber, moduleTitle: state.moduleTitle });
    if (!parsed.success || !state.directionId || !state.moduleNumber) return false;
    if (state.moduleId && !isModuleDirty(state)) return true;
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
        toast.success("Modul yangilandi");
        return true;
      }
      const created = isItSource(state.source)
        ? await createItModule(state.directionId, {
            title: state.moduleTitle.trim(),
            order_index: state.moduleNumber,
          })
        : isMandatorySource(state.source)
          ? await createMandatoryModule(
              state.directionId,
              {
                module_number: state.moduleNumber,
                title: state.moduleTitle.trim(),
              },
              { idempotencyKey: moduleIdempotencyKey.current }
            )
          : await createQualificationModule(
              state.directionId,
              {
                module_number: state.moduleNumber,
                title: state.moduleTitle.trim(),
              },
              { idempotencyKey: moduleIdempotencyKey.current }
            );
      if (!created?.id) throw new ApiError(500, "Modul ID qaytmadi");
      patch({
        moduleId: created.id,
        savedModuleNumber: state.moduleNumber,
        savedModuleTitle: state.moduleTitle.trim(),
      });
      toast.success("✓ Modul yaratildi");
      return true;
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      toast.error(error instanceof ApiError ? error.message : "Modulni yaratib bo'lmadi");
      return false;
    } finally {
      setIsCreatingModule(false);
    }
  };

  const ensureLesson = async () => {
    const parsed = lessonSchema.safeParse({
      lessonType: state.lessonType,
      lessonNumber: state.lessonNumber,
      lessonTitle: state.lessonTitle,
    });
    if (!parsed.success || !state.moduleId || !state.lessonType || !state.lessonNumber) return false;

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

    if (existingLessonId && !isLessonDirty({ ...state, lessonId: existingLessonId })) {
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
        return true;
      }
      const moduleId = state.moduleId!;
      lessonIdempotencyKey.current = crypto.randomUUID();
      const created = isItSource(state.source)
        ? await createItLesson(moduleId, {
            title: state.lessonTitle.trim(),
            item_type: "lesson",
            lesson_type: state.lessonType,
            order_index: state.lessonNumber ?? 1,
          }).catch(() =>
            createItLesson(moduleId, {
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
          : await createQualificationLesson(
              state.moduleId,
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
          directionId: state.directionId ?? undefined,
          directionTitle: state.directionTitle,
          moduleId: state.moduleId ?? undefined,
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
    // mandatory-blog / qualification / IT — bir xil: files → lessons/{id}/materials (file_id)
    const submitMaterial = isMandatorySource(state.source) ? submitMandatoryLessonMaterial : submitLessonMaterial;
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
        const errMsg = error instanceof ApiError ? error.message : "Fayl yuklanmadi";
        setState((prev) => ({
          ...prev,
          materials: prev.materials.map((row) =>
            row.type === item.type ? { ...row, uploadError: errMsg, uploadProgress: 0 } : row
          ),
        }));
        toast.error(errMsg);
      }
    }
    setIsUploading(false);
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
      const errMsg = error instanceof ApiError ? error.message : "Fayl yuklanmadi";
      setState((prev) => ({
        ...prev,
        materials: prev.materials.map((row) =>
          row.type === type ? { ...row, uploadError: errMsg, uploadProgress: 0 } : row
        ),
      }));
      toast.error(errMsg);
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
        patch({ step: 2 });
        return;
      }
      if (state.step === 2) {
        const ok = await ensureModule();
        if (ok) patch({ step: 3 });
        return;
      }
      if (state.step === 3) {
        if (!state.moduleId) {
          toast.error("Avval modul yaratilishi kerak");
          return;
        }
        const ok = await ensureLesson();
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
      await saveLessonDraft(state.lessonId, {
        lesson_number: state.lessonNumber ?? 1,
        lesson_type: state.lessonType || "THEORY",
        title: state.lessonTitle.trim() || "Dars",
      });
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
        : publishLesson(state.lessonId));
      if (isMandatorySource(state.source) && state.directionId) {
        const detailed = await getMandatoryBlog(state.directionId).catch(() => null);
        if (detailed) {
          const { publishMandatorySnapshot } = await import("@/lib/api/mandatory-snapshot");
          void publishMandatorySnapshot([detailed], "upsert", { notify: true });
        }
      } else if (state.directionId) {
        const detailed = isItSource(state.source)
          ? await getItDirection(state.directionId)
              .then(mapItDirection)
              .catch(() => null)
          : await getQualificationDirection(state.directionId).catch(() => null);
        if (detailed) {
          let snapshot = detailed;
          const itId = detailed.itId ?? (isItSource(state.source) ? detailed.id : undefined);
          if (itId && !isItSource(snapshot.source)) {
            const it = await getItDirection(itId)
              .then(mapItDirection)
              .catch(() => null);
            if (it?.modules?.length) {
              snapshot = { ...detailed, itId, modules: mergeModules(detailed.modules ?? [], it.modules) };
            }
          }
          const { publishQualificationSnapshot } = await import("@/lib/qualification/published-snapshot");
          await publishQualificationSnapshot([snapshot], { notify: true, immediate: true });
        }
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
    isMandatorySource(state.source) || searchParams.get("source") === "mandatory"
      ? "/admin/software/mandatory"
      : "/admin/software/qualification";

  const leave = () => {
    const dirty = Boolean(state.directionId || state.moduleTitle || state.lessonTitle || state.materials.length);
    if (dirty && !window.confirm("Saqlanmagan ma'lumotlar mavjud.\n\nSahifadan chiqmoqchimisiz?")) return;
    router.push(homeHref);
  };

  const stepValid = useMemo(() => {
    if (state.step === 1) return state.directionId !== null;
    if (state.step === 2) return moduleSchema.safeParse({ moduleNumber: state.moduleNumber, moduleTitle: state.moduleTitle }).success;
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
          moduleIdempotencyKey.current = crypto.randomUUID();
          lessonIdempotencyKey.current = crypto.randomUUID();
          setState({
            ...emptyWizardState(),
            source: isMandatorySource(state.source) ? "mandatory" : undefined,
          });
        }}
        onHome={() => router.push(homeHref)}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-[#E8EDF5] bg-white p-5 shadow-sm">
      <button type="button" onClick={leave} className="mb-4 text-sm text-[#0756F5]">
        ← Malaka oshirish
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
            errors={{
              module_number: fieldError(fieldErrors, "module_number", "moduleNumber"),
              title: fieldError(fieldErrors, "title", "moduleTitle"),
            }}
            onNumber={(moduleNumber) => patch({ moduleNumber })}
            onTitle={(moduleTitle) => patch({ moduleTitle })}
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
        title={isMandatorySource(state.source) || searchParams.get("source") === "mandatory" ? "Yangi majburiy blog" : undefined}
        save={
          isMandatorySource(state.source) || searchParams.get("source") === "mandatory"
            ? async (payload, editing) =>
                editing?.id
                  ? updateMandatoryBlog(editing.id, payload)
                  : createMandatoryBlog(payload)
            : undefined
        }
        onClose={() => setCreateDirectionOpen(false)}
        onSaved={(created) => {
          setDirections((prev) => {
            const key = directionKey(created);
            if (prev.some((item) => directionKey(item) === key)) {
              return prev.map((item) => (directionKey(item) === key ? { ...item, ...created } : item));
            }
            return [...prev, created];
          });
          goDirection(created.id, created.title, created.source);
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
                moduleIdempotencyKey.current = crypto.randomUUID();
                lessonIdempotencyKey.current = crypto.randomUUID();
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
