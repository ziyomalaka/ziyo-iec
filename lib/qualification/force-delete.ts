import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  deleteItAssignment,
  deleteItDirection,
  deleteItLesson,
  deleteItMaterial,
  deleteItModule,
  getItDirection,
} from "@/lib/api/admin-it";
import {
  deleteQualificationDirection,
  deleteQualificationLesson,
  deleteQualificationMaterial,
  deleteQualificationModule,
  deleteQualificationTest,
  getQualificationLessons,
  getQualificationMaterials,
  getQualificationTests,
  saveLessonDraft,
} from "@/lib/api/qualification";
import {
  deleteMandatoryBlog,
  deleteMandatoryLesson,
  deleteMandatoryModule,
  getMandatoryModuleLessons,
} from "@/lib/api/mandatory-blogs";
import type { QualificationDirection, QualificationLesson } from "@/lib/api/types/qualification";
import type { ItDirection, ItLesson, ItModule } from "@/lib/api/types/admin";
import { isItSource, isMandatorySource } from "@/lib/qualification/it-bridge";

async function goneOrOk(run: () => Promise<unknown>) {
  try {
    await run();
    return true;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 410)) return true;
    return false;
  }
}

async function deletePaths(paths: string[]) {
  for (const path of paths) {
    if (await goneOrOk(() => apiRequest(path, { method: "DELETE" }))) return true;
    const clean = path.split("?")[0];
    if (
      await goneOrOk(() =>
        apiRequest(clean, {
          method: "DELETE",
          body: JSON.stringify({ force: true }),
        })
      )
    ) {
      return true;
    }
  }
  return false;
}

function materialIds(lesson?: QualificationLesson | null) {
  return (lesson?.materials ?? []).map((item) => item.id).filter((id) => id > 0);
}

export async function forceDeleteLesson(
  id: number,
  lesson?: QualificationLesson | null,
  source?: "it" | "mandatory" | "qualification"
) {
  if (!id) return;

  const isMandatory = source === "mandatory" || isMandatorySource(lesson?.source);

  if (isMandatory) {
    // Backend: DELETE soft-delete + lesson_number = -id + material/test cascade.
    // ARCHIVED qilmang — raqam band qoladi.
    try {
      await deleteMandatoryLesson(id);
      return;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 410)) return;
      throw error instanceof ApiError ? error : new ApiError(400, "Dars o'chirilmadi");
    }
  }

  await goneOrOk(() =>
    saveLessonDraft(id, {
      lesson_number: lesson?.lesson_number,
      lesson_type: typeof lesson?.lesson_type === "string" ? lesson.lesson_type : undefined,
      title: lesson?.title,
    })
  );
  await goneOrOk(() => apiRequest(`/api/v1/admin/lessons/${id}/unpublish`, { method: "POST" }));

  const knownIds = new Set(materialIds(lesson));
  const remoteMaterials = await getQualificationMaterials(id).catch(() => []);
  const remoteTests = await getQualificationTests(id).catch(() => []);
  for (const item of remoteMaterials) knownIds.add(item.id);
  for (const item of lesson?.materials ?? []) knownIds.add(item.id);

  for (const materialId of knownIds) {
    await goneOrOk(() => deleteQualificationMaterial(materialId));
    await goneOrOk(() => deleteItMaterial(materialId));
    await goneOrOk(() => deleteItAssignment(materialId));
    await goneOrOk(() => deleteQualificationTest(materialId));
  }
  for (const item of remoteTests) {
    await goneOrOk(() => deleteQualificationTest(item.id));
  }

  const itLesson = await apiRequest<{
    materials?: { id: number }[];
    assignments?: { id: number }[];
  }>(`/admin/it/lessons/${id}`).catch(() => null);
  for (const item of itLesson?.materials ?? []) {
    await goneOrOk(() => deleteItMaterial(item.id));
  }
  for (const item of itLesson?.assignments ?? []) {
    await goneOrOk(() => deleteItAssignment(item.id));
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    if (await goneOrOk(() => deleteQualificationLesson(id))) return;
    if (await deletePaths([`/api/v1/admin/lessons/${id}?force=true`, `/api/v1/admin/lessons/${id}?force=1`])) {
      return;
    }
    if (await goneOrOk(() => deleteItLesson(id))) return;
    if (await deletePaths([`/admin/it/lessons/${id}?force=true`, `/admin/it/lessons/${id}?force=1`])) return;
  }

  throw new ApiError(400, "Dars o'chirilmadi");
}

export async function forceDeleteModule(
  id: number,
  lessons: QualificationLesson[] | { id: number }[] = [],
  itDirectionId?: number,
  source?: "it" | "mandatory" | "qualification"
) {
  if (!id) return;

  const isMandatory = source === "mandatory";

  if (isMandatory) {
    const lessonIds = new Set(lessons.map((item) => item.id).filter((item) => item > 0));
    const nested = await getMandatoryModuleLessons(id).catch(() => []);
    for (const item of nested) lessonIds.add(item.id);
    for (const lessonId of lessonIds) {
      const found = lessons.find((item) => item.id === lessonId);
      await goneOrOk(() =>
        forceDeleteLesson(lessonId, found && "materials" in found ? (found as QualificationLesson) : undefined, "mandatory")
      );
    }
    try {
      await deleteMandatoryModule(id);
      return;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 410)) return;
      throw error instanceof ApiError ? error : new ApiError(400, "Modul o'chirilmadi");
    }
  }

  const lessonIds = new Set(lessons.map((item) => item.id).filter((item) => item > 0));
  const nested = await getQualificationLessons(id).catch(() => []);
  for (const item of nested) lessonIds.add(item.id);

  if (itDirectionId) {
    const it = await getItDirection(itDirectionId).catch(() => null);
    for (const mod of it?.modules ?? []) {
      if (mod.id !== id) continue;
      for (const lesson of mod.lessons ?? []) {
        lessonIds.add(lesson.id);
        for (const material of lesson.materials ?? []) {
          await goneOrOk(() => deleteItMaterial(material.id));
        }
        for (const assignment of lesson.assignments ?? []) {
          await goneOrOk(() => deleteItAssignment(assignment.id));
        }
      }
    }
  }

  for (const lessonId of lessonIds) {
    const found = lessons.find((item) => item.id === lessonId);
    await goneOrOk(() =>
      forceDeleteLesson(lessonId, found && "materials" in found ? (found as QualificationLesson) : undefined)
    );
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    if (await goneOrOk(() => deleteQualificationModule(id))) return;
    if (await deletePaths([`/api/v1/admin/modules/${id}?force=true`, `/api/v1/admin/modules/${id}?force=1`])) {
      return;
    }
    if (await goneOrOk(() => deleteItModule(id))) return;
    if (await deletePaths([`/admin/it/modules/${id}?force=true`, `/admin/it/modules/${id}?force=1`])) return;
  }

  throw new ApiError(400, "Modul o'chirilmadi");
}

function fromItLesson(lesson: ItLesson): QualificationLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    source: "it",
    materials: [
      ...(lesson.materials ?? []).map((item) => ({
        id: item.id,
        type: item.material_type,
        source: "it" as const,
      })),
      ...(lesson.assignments ?? []).map((item) => ({
        id: item.id,
        type: "SEMINAR",
        source: "it" as const,
      })),
    ],
  };
}

export async function forceDeleteItLesson(lesson: ItLesson) {
  await forceDeleteLesson(lesson.id, fromItLesson(lesson));
}

export async function forceDeleteItModule(module: ItModule, directionId?: number) {
  await forceDeleteModule(module.id, (module.lessons ?? []).map(fromItLesson), directionId);
}

export async function forceDeleteItDirection(direction: ItDirection) {
  for (const mod of direction.modules ?? []) {
    await goneOrOk(() => forceDeleteItModule(mod, direction.id));
  }
  if (await goneOrOk(() => deleteItDirection(direction.id))) return;
  if (await deletePaths([`/admin/it/directions/${direction.id}?force=true`, `/admin/it/directions/${direction.id}?force=1`])) {
    return;
  }
  throw new ApiError(400, "Yo'nalish o'chirilmadi");
}

export async function forceDeleteDirection(direction: QualificationDirection) {
  if (isMandatorySource(direction.source)) {
    if (await goneOrOk(() => deleteMandatoryBlog(direction.id))) return;
    await deletePaths([
      `/api/v1/admin/mandatory-blogs/${direction.id}?force=true`,
      `/api/v1/admin/mandatory-blogs/${direction.id}?force=1`,
    ]);
    return;
  }
  const itId = direction.itId ?? (isItSource(direction.source) ? direction.id : undefined);
  if (itId) {
    const it = await getItDirection(itId).catch(() => null);
    if (it) await forceDeleteItDirection(it);
    else await goneOrOk(() => deleteItDirection(itId));
  }
  if (!isItSource(direction.source)) {
    await goneOrOk(() => deleteQualificationDirection(direction.id));
    await deletePaths([
      `/api/v1/admin/qualification-directions/${direction.id}?force=true`,
      `/api/v1/admin/qualification-directions/${direction.id}?force=1`,
    ]);
  }
}
