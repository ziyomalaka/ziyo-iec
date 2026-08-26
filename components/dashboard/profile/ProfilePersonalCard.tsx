"use client";

import { Pencil } from "lucide-react";
import { VerifiedBadge } from "@/components/dashboard/profile/ProfileBadges";
import OutlineButton from "@/components/dashboard/ui/OutlineButton";
import type { UserProfile } from "@/lib/profile/types";
import { formatDisplayDate, formatGender, formatRegion } from "@/lib/profile/mappers";

type ProfilePersonalCardProps = {
  profile: UserProfile;
  onEdit: () => void;
};

function Row({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[180px_1fr] sm:gap-3">
      <p className="text-[11px] font-medium text-[#1E2D56]">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium text-[#20345E]">{value}</p>
        {badge}
      </div>
    </div>
  );
}

export default function ProfilePersonalCard({ profile, onEdit }: ProfilePersonalCardProps) {
  return (
    <div className="w-full rounded-[9px] border border-[#DFE7F2] bg-white p-[4%] shadow-[0_1px_3px_rgba(20,40,80,.03)]">
      <h3 className="text-[14px] font-bold text-[#111b39]">Shaxsiy ma&apos;lumotlar</h3>

      <div className="mt-4 flex flex-col gap-[17px]">
        <Row label="To'liq ism familiya" value={profile.fullName} />
        <Row
          label="Elektron pochta"
          value={profile.email}
          badge={<VerifiedBadge verified={profile.emailVerified} />}
        />
        <Row
          label="Telefon raqami"
          value={profile.phone}
          badge={<VerifiedBadge verified={profile.phoneVerified} />}
        />
        <Row label="Tug'ilgan sana" value={formatDisplayDate(profile.birthDate)} />
        <Row label="Jinsi" value={formatGender(profile.gender)} />
        <Row label="Manzil" value={profile.address || formatRegion(profile)} />
        <Row label="Kasb / Lavozim" value={profile.position || profile.profession || "—"} />
        <Row label="Ish joyi" value={profile.workplace ?? "—"} />
        <Row label="Malaka yo'nalishi" value={profile.qualificationDirection ?? "—"} />
      </div>

      <div className="mt-5 flex justify-end">
        <OutlineButton onClick={onEdit} className="h-8 px-4">
          Ma&apos;lumotlarni tahrirlash <Pencil className="h-3 w-3" strokeWidth={2} />
        </OutlineButton>
      </div>
    </div>
  );
}
