import { normalizeProgramType } from "@/lib/auth/program";
import { clientDasturLabel } from "@/lib/admin/client-program";
import { normalizeRetrainingType } from "@/lib/retraining/kind";
import { isRetrainingTypeValue } from "@/lib/retraining/match";

export type ApplicationKindId =
  | "MALAKA_OSHIRISH"
  | "UMUMIY_QAYTA_TAYYORLASH"
  | "PEDAGOGIK_QAYTA_TAYYORLASH"
  | "KASBIY_QAYTA_TAYYORLASH"
  | "QAYTA_TAYYORLASH_UNSPECIFIED"
  | "UNKNOWN";

export type ApplicationKindTone = {
  id: ApplicationKindId;
  label: string;
  sourceLabel: "Malaka oshirish" | "Qayta tayyorlash" | null;
  wrap: string;
  dot: string;
  unspecified: boolean;
};

export const APPLICATION_KIND_LEGEND: Array<Extract<
  ApplicationKindId,
  "MALAKA_OSHIRISH" | "UMUMIY_QAYTA_TAYYORLASH" | "PEDAGOGIK_QAYTA_TAYYORLASH" | "KASBIY_QAYTA_TAYYORLASH"
>> = [
  "MALAKA_OSHIRISH",
  "UMUMIY_QAYTA_TAYYORLASH",
  "PEDAGOGIK_QAYTA_TAYYORLASH",
  "KASBIY_QAYTA_TAYYORLASH",
];

const KIND_META: Record<ApplicationKindId, Omit<ApplicationKindTone, "id" | "unspecified">> = {
  MALAKA_OSHIRISH: {
    label: "Malaka oshirish",
    sourceLabel: "Malaka oshirish",
    wrap: "bg-[#EFF6FF] text-[#1D4ED8]",
    dot: "bg-[#2563EB]",
  },
  UMUMIY_QAYTA_TAYYORLASH: {
    label: "Umumiy qayta tayyorlash",
    sourceLabel: "Qayta tayyorlash",
    wrap: "bg-[#ECFDF5] text-[#047857]",
    dot: "bg-[#22C55E]",
  },
  PEDAGOGIK_QAYTA_TAYYORLASH: {
    label: "Pedagogik qayta tayyorlash",
    sourceLabel: "Qayta tayyorlash",
    wrap: "bg-[#F5F3FF] text-[#6D28D9]",
    dot: "bg-[#8B5CF6]",
  },
  KASBIY_QAYTA_TAYYORLASH: {
    label: "Kasbiy qayta tayyorlash",
    sourceLabel: "Qayta tayyorlash",
    wrap: "bg-[#FFF7ED] text-[#C2410C]",
    dot: "bg-[#F97316]",
  },
  QAYTA_TAYYORLASH_UNSPECIFIED: {
    label: "Qayta tayyorlash — turi tanlanmagan",
    sourceLabel: "Qayta tayyorlash",
    wrap: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  UNKNOWN: {
    label: "—",
    sourceLabel: null,
    wrap: "bg-slate-100 text-slate-500",
    dot: "bg-slate-300",
  },
};

function tone(id: ApplicationKindId): ApplicationKindTone {
  return {
    id,
    unspecified: id === "QAYTA_TAYYORLASH_UNSPECIFIED",
    ...KIND_META[id],
  };
}

function fromRetraining(value?: string | null): ApplicationKindId | null {
  const type = normalizeRetrainingType(value);
  if (type === "UMUMIY") return "UMUMIY_QAYTA_TAYYORLASH";
  if (type === "PEDAGOGIK") return "PEDAGOGIK_QAYTA_TAYYORLASH";
  if (type === "KASBIY") return "KASBIY_QAYTA_TAYYORLASH";
  return null;
}

function fromLooseLabel(value?: string | null): ApplicationKindId | null {
  const key = (value ?? "").trim().toLowerCase();
  if (!key) return null;
  if (key.includes("malaka")) return "MALAKA_OSHIRISH";
  if (key.includes("pedagog")) return "PEDAGOGIK_QAYTA_TAYYORLASH";
  if (key.includes("kasbiy") || key.includes("professional")) return "KASBIY_QAYTA_TAYYORLASH";
  if (key.includes("umumiy") || key.includes("general")) return "UMUMIY_QAYTA_TAYYORLASH";
  return fromRetraining(value);
}

export type ApplicationKindSource = {
  program_type?: string | null;
  retraining_type?: string | null;
  dastur?: string | null;
  program_label?: string | null;
  type?: string | null;
  comment?: string | null;
};

const LABEL_TO_KIND: Record<string, ApplicationKindId> = {
  "Malaka oshirish": "MALAKA_OSHIRISH",
  "Umumiy qayta tayyorlash": "UMUMIY_QAYTA_TAYYORLASH",
  "Pedagogik qayta tayyorlash": "PEDAGOGIK_QAYTA_TAYYORLASH",
  "Kasbiy qayta tayyorlash": "KASBIY_QAYTA_TAYYORLASH",
};

/** Ariza "Turi" — mijoz qaysi dasturda tursa, o'sha chiqadi. */
export function resolveApplicationKind(item: ApplicationKindSource): ApplicationKindTone {
  const clientLabel = clientDasturLabel({
    dastur: item.dastur,
    program_label: item.program_label,
    program_type: item.program_type,
    retraining_type: item.retraining_type,
  });
  const fromClient = LABEL_TO_KIND[clientLabel];
  if (fromClient) return tone(fromClient);

  const program = normalizeProgramType(item.program_type);
  const retraining =
    fromRetraining(item.retraining_type) ?? fromLooseLabel(item.retraining_type);
  const fromType = fromLooseLabel(item.type);

  if (program === "MALAKA_OSHIRISH") return tone("MALAKA_OSHIRISH");

  if (program === "QAYTA_TAYYORLASH") {
    if (retraining) return tone(retraining);
    if (fromType && fromType !== "MALAKA_OSHIRISH") return tone(fromType);
    return tone("QAYTA_TAYYORLASH_UNSPECIFIED");
  }

  if (retraining) return tone(retraining);
  if (fromType) return tone(fromType);
  if (isRetrainingTypeValue(item.type) || (item.comment ?? "").trim().startsWith("retraining:")) {
    return tone("QAYTA_TAYYORLASH_UNSPECIFIED");
  }
  return tone("UNKNOWN");
}

export function applicationKindLegend() {
  return APPLICATION_KIND_LEGEND.map((id) => tone(id));
}

export function applicationStatusTone(status?: string) {
  if (status === "approved") {
    return { wrap: "bg-[#DCFCE7] text-[#15803D]", label: "Tasdiqlangan" };
  }
  if (status === "rejected") {
    return { wrap: "bg-[#FEE2E2] text-[#DC2626]", label: "Rad etilgan" };
  }
  if (status === "processing") {
    return { wrap: "bg-[#EFF6FF] text-[#1D4ED8]", label: "Ko'rib chiqilmoqda" };
  }
  if (status === "archived") {
    return { wrap: "bg-slate-100 text-slate-600", label: "Arxiv" };
  }
  return { wrap: "bg-[#FEF9C3] text-[#EA580C]", label: "Kutilmoqda" };
}
