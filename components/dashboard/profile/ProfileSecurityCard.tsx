"use client";

import { Loader2, Lock, Monitor, Shield, Trash2 } from "lucide-react";
import OutlineButton from "@/components/dashboard/ui/OutlineButton";
import type { UserProfile } from "@/lib/profile/types";
import type { LucideIcon } from "lucide-react";

type ProfileSecurityCardProps = {
  profile: UserProfile;
  sessionCount: number;
  onChangePassword: () => void;
  onViewSessions: () => void;
  onToggle2FA: () => void;
  onDeleteAccount: () => void;
  toggling2FA?: boolean;
};

function SecurityRow({
  icon: Icon,
  label,
  value,
  action,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  action: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b border-[#EDF1F6] py-3 last:border-0 sm:grid-cols-[1fr_130px_104px]">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
        <p className="text-[11px] font-medium text-[#1E2D56]">{label}</p>
      </div>
      <div className={danger ? "text-[11px] font-medium text-[#EF3340]" : "text-[11px] font-medium text-[#20345E]"}>
        {value}
      </div>
      <div className="sm:justify-self-end">{action}</div>
    </div>
  );
}

export default function ProfileSecurityCard({
  profile,
  sessionCount,
  onChangePassword,
  onViewSessions,
  onToggle2FA,
  onDeleteAccount,
  toggling2FA,
}: ProfileSecurityCardProps) {
  return (
    <div className="w-full rounded-[9px] border border-[#DFE7F2] bg-white p-[4%] shadow-[0_1px_3px_rgba(20,40,80,.03)]">
      <h3 className="text-[14px] font-bold text-[#111b39]">Hisob xavfsizligi</h3>

      <div className="mt-2">
        <SecurityRow
          icon={Lock}
          label="Parol"
          value="********"
          action={
            <OutlineButton onClick={onChangePassword} className="h-[31px] w-[104px] px-0 text-[10px]">
              O&apos;zgartirish
            </OutlineButton>
          }
        />
        <SecurityRow
          icon={Shield}
          label="Ikki bosqichli himoya"
          value={profile.twoFactorEnabled ? "Yoqilgan" : "O'chirilgan"}
          action={
            <OutlineButton
              onClick={onToggle2FA}
              disabled={toggling2FA}
              className="h-[31px] w-[104px] px-0 text-[10px]"
            >
              {toggling2FA ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {profile.twoFactorEnabled ? "O'chirish" : "Yoqish"}
            </OutlineButton>
          }
        />
        <SecurityRow
          icon={Monitor}
          label="Faol sessiyalar"
          value={`${sessionCount} ta qurilmada`}
          action={
            <OutlineButton onClick={onViewSessions} className="h-[31px] w-[104px] px-0 text-[10px]">
              Ko&apos;rish
            </OutlineButton>
          }
        />
        <SecurityRow
          icon={Trash2}
          label="Hisobni o'chirish"
          value="Xavfli amal"
          danger
          action={
            <OutlineButton onClick={onDeleteAccount} className="h-[31px] w-[104px] border-[#F5C2C5] px-0 text-[10px] text-[#EF3340]">
              Sozlash
            </OutlineButton>
          }
        />
      </div>
    </div>
  );
}
