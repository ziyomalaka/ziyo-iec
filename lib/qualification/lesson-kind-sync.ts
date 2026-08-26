import { updateItLesson } from "@/lib/api/admin-it";
import {
  createQualificationLesson,
  createQualificationModule,
  getQualificationLessons,
  getQualificationModules,
  updateQualificationLesson,
} from "@/lib/api/qualification";
import type { ContentSource, QualificationDirection, QualificationLessonType } from "@/lib/api/types/qualification";
import { rememberLessonKind, withLessonKindMarker } from "@/lib/learning/lesson-kind";
import { isItSource, isMandatorySource } from "@/lib/qualification/it-bridge";

function normTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function syncQualificationLessonKind(input: {
  directions: QualificationDirection[];
  itDirectionId: number;
  moduleTitle: string;
  moduleNumber: number;
  lessonTitle: string;
  lessonNumber: number;
  lessonType: QualificationLessonType;
}) {
  const direction = input.directions.find(
    (item) => item.itId === input.itDirectionId || item.id === input.itDirectionId
  );
  const qualId = direction && !isItSource(direction.source) ? direction.id : undefined;
  if (!qualId) return;

  const modules = await getQualificationModules(qualId, true);
  let qualModule =
    modules.find((item) => normTitle(item.title) === normTitle(input.moduleTitle)) ??
    modules.find((item) => item.module_number === input.moduleNumber);

  if (!qualModule) {
    qualModule = await createQualificationModule(qualId, {
      module_number: input.moduleNumber,
      title: input.moduleTitle.trim(),
    });
  }
  if (!qualModule?.id) return;

  const lessons = await getQualificationLessons(qualModule.id, qualModule.module_number, true);
  const existing =
    lessons.find((item) => normTitle(item.title) === normTitle(input.lessonTitle)) ??
    lessons.find((item) => item.lesson_number === input.lessonNumber);

  const payload = {
    lesson_number: input.lessonNumber,
    lesson_type: input.lessonType,
    title: input.lessonTitle.trim(),
  };

  if (existing?.id) {
    if (existing.lesson_type !== input.lessonType || existing.title !== payload.title) {
      await updateQualificationLesson(existing.id, payload);
    }
    return;
  }

  await createQualificationLesson(qualModule.id, payload);
}

/** Wizardda tanlangan Nazariy/Amaliy ni darsga yozadi. */
export async function persistSelectedLessonKind(input: {
  directions: QualificationDirection[];
  source?: ContentSource;
  itDirectionId?: number | null;
  lessonId?: number | null;
  moduleTitle: string;
  moduleNumber: number;
  lessonTitle: string;
  lessonNumber: number;
  lessonType: QualificationLessonType;
}) {
  rememberLessonKind(input.lessonId ?? undefined, input.lessonTitle, input.lessonType);

  if (input.lessonId && isItSource(input.source)) {
    const body = {
      title: input.lessonTitle.trim(),
      item_type: "lesson" as const,
      lesson_type: input.lessonType,
      description: withLessonKindMarker(input.lessonType),
      order_index: input.lessonNumber,
    };
    try {
      await updateItLesson(input.lessonId, body);
    } catch {
      await updateItLesson(input.lessonId, {
        title: body.title,
        item_type: "lesson",
        description: body.description,
        order_index: input.lessonNumber,
      }).catch(() => undefined);
    }
  }

  if (input.itDirectionId && !isMandatorySource(input.source)) {
    await syncQualificationLessonKind({
      directions: input.directions,
      itDirectionId: input.itDirectionId,
      moduleTitle: input.moduleTitle,
      moduleNumber: input.moduleNumber,
      lessonTitle: input.lessonTitle,
      lessonNumber: input.lessonNumber,
      lessonType: input.lessonType,
    }).catch(() => undefined);
  }
}
