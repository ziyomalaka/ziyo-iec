/**
 * Qayta tayyorlash BLOK ierarxiyasi.
 *
 * BLOCK BACKEND SUPPORT: MISSING (Swagger — block/section endpoint yo'q).
 * Vaqtinchalik: yo'nalish `description` ichida ZM_BLOCKS meta,
 * modul `description` ichida ZM_BLOCK:{id} marker.
 * Backend block API paydo bo'lganda shu fayl almashtiriladi.
 */
import type { QualificationDirection, QualificationModule } from "@/lib/api/types/qualification";
import { toRoman } from "@/lib/retraining/roman";

export const BLOCK_META_PREFIX = "ZM_BLOCKS:";
export const MODULE_BLOCK_PREFIX = /^ZM_BLOCK:(\d+)\s*(?:\n|$)/;

export type RetrainingBlock = {
  id: number;
  block_number: number;
  title: string;
};

export type RetrainingBlockGroup = {
  block: RetrainingBlock;
  modules: QualificationModule[];
};

export type RetrainingContentTree = {
  blocks: RetrainingBlockGroup[];
  unassignedModules: QualificationModule[];
};

export function parseBlockMeta(description?: string | null): RetrainingBlock[] {
  const raw = String(description ?? "");
  const idx = raw.indexOf(BLOCK_META_PREFIX);
  if (idx < 0) return [];
  const jsonPart = raw.slice(idx + BLOCK_META_PREFIX.length).split("\n")[0]?.trim();
  if (!jsonPart) return [];
  try {
    const data = JSON.parse(jsonPart) as { blocks?: unknown };
    if (!Array.isArray(data.blocks)) return [];
    return data.blocks
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const id = Number(row.id);
        const block_number = Number(row.block_number);
        const title = typeof row.title === "string" ? row.title.trim() : "";
        if (!Number.isInteger(id) || id <= 0 || !title) return null;
        return {
          id,
          block_number: Number.isInteger(block_number) && block_number > 0 ? block_number : id,
          title,
        } satisfies RetrainingBlock;
      })
      .filter((item): item is RetrainingBlock => item !== null)
      .sort((a, b) => a.block_number - b.block_number || a.id - b.id);
  } catch {
    return [];
  }
}

export function stripBlockMeta(description?: string | null) {
  const raw = String(description ?? "");
  const idx = raw.indexOf(BLOCK_META_PREFIX);
  if (idx < 0) return raw.trim();
  const before = raw.slice(0, idx).trim();
  const afterLine = raw.slice(idx).indexOf("\n");
  const after = afterLine >= 0 ? raw.slice(idx + afterLine + 1).trim() : "";
  return [before, after].filter(Boolean).join("\n").trim();
}

export function serializeBlockMeta(blocks: RetrainingBlock[], humanDescription?: string | null) {
  const clean = stripBlockMeta(humanDescription);
  const payload = JSON.stringify({ blocks });
  if (!clean) return `${BLOCK_META_PREFIX}${payload}`;
  return `${clean}\n${BLOCK_META_PREFIX}${payload}`;
}

export function getModuleBlockId(module: QualificationModule): number | null {
  const desc = typeof module.description === "string" ? module.description : "";
  const match = desc.match(MODULE_BLOCK_PREFIX);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function stripModuleBlockMarker(description?: string | null) {
  return String(description ?? "").replace(MODULE_BLOCK_PREFIX, "").trim();
}

export function withModuleBlockMarker(description: string | undefined | null, blockId: number) {
  const clean = stripModuleBlockMarker(description);
  const prefix = `ZM_BLOCK:${blockId}\n`;
  return clean ? `${prefix}${clean}` : prefix.trim();
}

export function nextBlockNumber(blocks: RetrainingBlock[]) {
  return blocks.reduce((max, item) => Math.max(max, item.block_number ?? 0), 0) + 1;
}

export function nextBlockId(blocks: RetrainingBlock[]) {
  return blocks.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
}

/** Mavjud ma'lumot uchun default blok — backend block API yo'q. */
export function defaultBlock(): RetrainingBlock {
  return { id: 1, block_number: 1, title: "Asosiy blok" };
}

export function resolveBlocksForDirection(direction: QualificationDirection): RetrainingBlock[] {
  const parsed = parseBlockMeta(direction.description);
  return parsed.length ? parsed : [defaultBlock()];
}

export function buildContentTree(
  direction: QualificationDirection,
  modules: QualificationModule[] = direction.modules ?? []
): RetrainingContentTree {
  const blocks = resolveBlocksForDirection(direction);
  const blockMap = new Map<number, QualificationModule[]>();
  for (const block of blocks) blockMap.set(block.id, []);

  const unassignedModules: QualificationModule[] = [];
  for (const qualModule of modules) {
    const blockId = getModuleBlockId(qualModule);
    if (blockId && blockMap.has(blockId)) {
      blockMap.get(blockId)!.push(qualModule);
    } else if (blocks.length === 1) {
      blockMap.get(blocks[0].id)!.push(qualModule);
    } else {
      unassignedModules.push(qualModule);
    }
  }

  for (const [, list] of blockMap) {
    list.sort((a, b) => (a.module_number ?? 0) - (b.module_number ?? 0) || a.id - b.id);
  }

  return {
    blocks: blocks.map((block) => ({
      block,
      modules: blockMap.get(block.id) ?? [],
    })),
    unassignedModules,
  };
}

export function findBlockForModule(direction: QualificationDirection, qualModule: QualificationModule) {
  const blocks = resolveBlocksForDirection(direction);
  const blockId = getModuleBlockId(qualModule) ?? (blocks.length === 1 ? blocks[0].id : null);
  return blocks.find((item) => item.id === blockId) ?? null;
}

export function blockLabel(block: RetrainingBlock) {
  const roman = toRoman(block.block_number) || String(block.block_number);
  const title = block.title.trim().replace(/^\d+-blok\.?\s*/i, "").trim();
  if (!title) return `${roman}-BLOK`;
  return `${roman}-BLOK. ${title}`;
}
