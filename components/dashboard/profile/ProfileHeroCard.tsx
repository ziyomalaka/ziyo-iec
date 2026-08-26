"use client";

import { Camera, Mail, MapPin, Pencil, Phone, Calendar } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api/media";
import { StatusBadge, VerifiedBadge } from "@/components/dashboard/profile/ProfileBadges";
import OutlineButton from "@/components/dashboard/ui/OutlineButton";
import type { UserProfile } from "@/lib/profile/types";
import { formatDisplayDate, formatDisplayDateTime, formatRegion } from "@/lib/profile/mappers";

type ProfileHeroCardProps = {
  profile: UserProfile;
  onEdit: () => void;
  onAvatarClick: () => void;
};

function InfoLine({
  icon: Icon,
  children,
  badge,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
      <span className="text-[12px] font-medium text-[#283b68]">{children}</span>
      {badge}
    </div>
  );
}

export default function ProfileHeroCard({ profile, onEdit, onAvatarClick }: ProfileHeroCardProps) {
  const avatarSrc = resolveMediaUrl(profile.avatarUrl);
  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="w-full min-h-[18%] rounded-[10px] border border-[#DFE7F2] bg-white p-[1.5%] shadow-[0_1px_3px_rgba(20,40,80,.03)]">
      <div className="grid w-full gap-[2%] lg:grid-cols-[68%_30%] lg:items-start">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={profile.fullName}
                className="h-[9vw] w-[9vw] min-h-24 min-w-24 rounded-full bg-[#E8EDF2] object-cover"
              />
            ) : (
              <div className="flex h-[9vw] w-[9vw] min-h-24 min-w-24 items-center justify-center rounded-full bg-[#E8EDF2] text-[32px] font-bold text-[#536287]">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={onAvatarClick}
              className="absolute right-1 bottom-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#ccd9ee] bg-white text-[#0756F5]"
              aria-label="Profil rasmini o'zgartirish"
            >
              <Camera className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
              <h2 className="text-[19px] font-bold text-[#131d3d]">{profile.fullName}</h2>
              <StatusBadge>{profile.statusLabel}</StatusBadge>
            </div>

            <div className="mt-3.5 flex flex-col items-center gap-2.5 sm:items-start">
              <InfoLine icon={Mail} badge={<VerifiedBadge verified={profile.emailVerified} />}>
                {profile.email}
              </InfoLine>
              <InfoLine icon={Phone} badge={<VerifiedBadge verified={profile.phoneVerified} />}>
                {profile.phone}
              </InfoLine>
              <InfoLine icon={Calendar}>{formatDisplayDate(profile.birthDate)}</InfoLine>
              <InfoLine icon={MapPin}>{formatRegion(profile)}</InfoLine>
            </div>
          </div>
        </div>

        <div className="w-full rounded-[9px] border border-[#E8EDF5] bg-[#F7FAFE] p-[6%]">
          <h3 className="text-[13px] font-bold text-[#111b39]">Hisob ma&apos;lumotlari</h3>
          <dl className="mt-3 space-y-2 text-[11px] text-[#35466c]">
            <div className="flex justify-between gap-3">
              <dt>Foydalanuvchi ID:</dt>
              <dd className="font-medium">{profile.publicId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Ro&apos;yxatdan o&apos;tgan sana:</dt>
              <dd className="font-medium">{formatDisplayDate(profile.registeredAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>So&apos;nggi kirish sanasi:</dt>
              <dd className="text-right font-medium">{formatDisplayDateTime(profile.lastLoginAt)}</dd>
            </div>
          </dl>
          <OutlineButton onClick={onEdit} className="mt-4 w-full">
            Profilni tahrirlash <Pencil className="h-3 w-3" strokeWidth={2} />
          </OutlineButton>
        </div>
      </div>
    </div>
  );
}
