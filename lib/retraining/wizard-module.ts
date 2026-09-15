import type { QualificationDirection, QualificationModule } from "@/lib/api/types/qualification";
import { getModuleBlockId, resolveBlocksForDirection } from "@/lib/retraining/content-blocks";

/** Blok meta ID — backend modul primary key emas. */
export function isRetrainingBlockMetaId(direction: QualificationDirection, id: number): boolean {
  return resolveBlocksForDirection(direction).some((block) => block.id === id);
}

/**
 * Wizard uchun haqiqiy modulni topadi.
 * block.id yoki boshqa noto'g'ri qiymat moduleId sifatida berilsa — null.
 */
export function resolveRetrainingWizardModule(
  direction: QualificationDirection | null | undefined,
  moduleId: number | null | undefined
): QualificationModule | null {
  if (!direction || !moduleId) return null;
  const match = (direction.modules ?? []).find((item) => item.id === moduleId);
  if (match) return match;
  if (isRetrainingBlockMetaId(direction, moduleId)) return null;
  return null;
}

/**
 * Yo'nalish `id` xato bilan `moduleId` ga copy qilinganmi?
 * (directionId bilan tasodifiy teng kelish emas — modul ro'yxatida yo'qligi + direction PK)
 */
export function isDirectionIdCopiedAsModuleId(
  direction: QualificationDirection | null | undefined,
  moduleId: number | null | undefined
): boolean {
  if (!direction?.id || !moduleId) return false;
  if (moduleId !== direction.id) return false;
  return !resolveRetrainingWizardModule(direction, moduleId);
}

export function sanitizeRetrainingWizardModuleId(
  direction: QualificationDirection | null | undefined,
  moduleId: number | null | undefined
): number | null {
  if (!moduleId) return null;
  if (isDirectionIdCopiedAsModuleId(direction, moduleId)) return null;
  if (direction && isRetrainingBlockMetaId(direction, moduleId) && !resolveRetrainingWizardModule(direction, moduleId)) {
    return null;
  }
  return moduleId;
}

export function blockIdForWizardModule(
  direction: QualificationDirection | null | undefined,
  qualModule: QualificationModule | null | undefined
): number | null {
  if (!direction || !qualModule) return null;
  return getModuleBlockId(qualModule) ?? (resolveBlocksForDirection(direction).length === 1
    ? resolveBlocksForDirection(direction)[0]?.id ?? null
    : null);
}
