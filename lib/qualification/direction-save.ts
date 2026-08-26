import {
  createItDirection,
  updateItDirection,
} from "@/lib/api/admin-it";
import { ApiError } from "@/lib/api/errors";
import {
  createQualificationDirection,
  updateQualificationDirection,
} from "@/lib/api/qualification";
import type { CreateItDirectionRequest } from "@/lib/api/types/admin";
import type {
  CreateQualificationDirectionPayload,
  QualificationDirection,
} from "@/lib/api/types/qualification";
import { isItSource, mapItDirection } from "@/lib/qualification/it-bridge";

export type DirectionWritePayload = {
  title: string;
  category_id: number;
  description?: string;
  duration_hours?: number;
  language?: string;
  status?: string;
};

function itBody(payload: DirectionWritePayload): CreateItDirectionRequest {
  return {
    title: payload.title.trim(),
    category_id: payload.category_id,
    description: payload.description?.trim() || undefined,
    duration_hours: payload.duration_hours,
    language: payload.language,
    status: payload.status,
  };
}

function qualBody(payload: DirectionWritePayload): CreateQualificationDirectionPayload {
  return itBody(payload);
}

function firstRejection(results: PromiseSettledResult<unknown>[]) {
  const rejected = results.find((item): item is PromiseRejectedResult => item.status === "rejected");
  return rejected?.reason;
}

export async function saveAdminDirection(
  payload: DirectionWritePayload,
  existing?: QualificationDirection | null
): Promise<QualificationDirection> {
  if (!existing) {
    const [itResult, qualResult] = await Promise.allSettled([
      createItDirection(itBody(payload)),
      createQualificationDirection(qualBody(payload)),
    ]);
    const it = itResult.status === "fulfilled" ? itResult.value : null;
    const qual = qualResult.status === "fulfilled" ? qualResult.value : null;
    if (!it && !qual) {
      const reason = firstRejection([itResult, qualResult]);
      throw reason instanceof Error ? reason : new ApiError(500, "Yo'nalish yaratilmadi");
    }
    if (qual) {
      return {
        ...qual,
        source: "qualification",
        itId: it?.id,
        category_id: it?.category_id ?? qual.category_id ?? payload.category_id,
        category_name: it?.category_name || qual.category_name,
      };
    }
    return mapItDirection(it!);
  }

  const itId = existing.itId ?? (isItSource(existing.source) ? existing.id : undefined);
  const qualId = isItSource(existing.source) ? undefined : existing.id;

  const it = itId
    ? await updateItDirection(itId, itBody(payload))
    : await createItDirection(itBody(payload));
  const qual = qualId ? await updateQualificationDirection(qualId, qualBody(payload)) : null;

  if (qual) {
    return {
      ...qual,
      source: "qualification",
      itId: it.id,
      category_id: it.category_id ?? qual.category_id ?? payload.category_id,
      category_name: it.category_name || qual.category_name,
      description: it.description || qual.description,
      duration_hours: it.duration_hours ?? qual.duration_hours,
      language: it.language || qual.language,
      status: it.status || qual.status,
    };
  }

  return mapItDirection(it);
}
