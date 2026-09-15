function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function urlFromUnknown(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const row = asRecord(value);
  return firstText(row.url, row.file_url, row.thumbnail_url, row.image_url, row.storage_path, row.path);
}

function pickFromRow(row: Record<string, unknown>) {
  return firstText(
    row.image_url,
    row.thumbnail_url,
    row.cover_url,
    row.photo_url,
    row.picture_url,
    row.file_url,
    row.image_path,
    row.storage_path,
    typeof row.thumbnail === "string" ? row.thumbnail : undefined,
    typeof row.image === "string" ? row.image : undefined,
    typeof row.cover === "string" ? row.cover : undefined,
    typeof row.photo === "string" ? row.photo : undefined,
    typeof row.file === "string" ? row.file : undefined,
    urlFromUnknown(row.thumbnail),
    urlFromUnknown(row.image),
    urlFromUnknown(row.cover),
    urlFromUnknown(row.photo),
    urlFromUnknown(row.file),
    urlFromUnknown(row.media)
  );
}

/** Backend yo'nalish rasm URL — mavjud contract maydonlaridan. */
export function pickDirectionThumbnail(data: unknown): string | undefined {
  const row = asRecord(data);
  const value = firstText(
    pickFromRow(row),
    pickFromRow(asRecord(row.direction)),
    pickFromRow(asRecord(row.course)),
    pickFromRow(asRecord(row.data))
  );
  return value || undefined;
}
