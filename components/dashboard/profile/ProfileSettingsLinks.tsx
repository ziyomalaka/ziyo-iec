"use client";

import { Bell, ChevronRight, Globe, Shield } from "lucide-react";

type ProfileSettingsLinksProps = {
  languageLabel: string;
  onNotifications: () => void;
  onPrivacy: () => void;
  onLanguage: () => void;
};

export default function ProfileSettingsLinks({
  languageLabel,
  onNotifications,
  onPrivacy,
  onLanguage,
}: ProfileSettingsLinksProps) {
  const items = [
    {
      icon: Bell,
      title: "Bildirishnoma sozlamalari",
      subtitle: "Email va push xabarnomalar",
      onClick: onNotifications,
    },
    {
      icon: Shield,
      title: "Maxfiylik sozlamalari",
      subtitle: "Ma'lumotlaringiz maxfiyligini boshqarish",
      onClick: onPrivacy,
    },
    {
      icon: Globe,
      title: "Tizim tili",
      subtitle: languageLabel,
      onClick: onLanguage,
      action: true,
    },
  ];

  return (
    <div className="w-full rounded-[9px] border border-[#DFE7F2] bg-white p-[4%] shadow-[0_1px_3px_rgba(20,40,80,.03)]">
      <h3 className="text-[14px] font-bold text-[#111b39]">Sozlamalar</h3>
      <div className="mt-2">
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className="flex w-full items-center gap-3 border-b border-[#EDF1F6] py-3 text-left last:border-0"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EEF5FF] text-[#0756F5]">
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#111b39]">{item.title}</p>
              <p className="text-[9px] text-[#64759A]">{item.subtitle}</p>
            </div>
            {item.action ? (
              <span className="inline-flex h-[31px] items-center rounded-[5px] border border-[#AAC7FB] bg-white px-3 text-[10px] font-semibold text-[#0756F5]">
                O&apos;zgartirish
              </span>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
