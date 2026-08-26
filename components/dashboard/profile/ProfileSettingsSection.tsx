"use client";

import { Loader2 } from "lucide-react";
import type { SettingsResponse } from "@/lib/api/types/profile";

type ProfileSettingsSectionProps = {
  settings: SettingsResponse;
  onChange: (settings: SettingsResponse) => void;
  onSave: () => void;
  saving: boolean;
};

const languages = [
  { value: "uz", label: "O'zbek" },
  { value: "ru", label: "Rus" },
];

export default function ProfileSettingsSection({
  settings,
  onChange,
  onSave,
  saving,
}: ProfileSettingsSectionProps) {
  return (
    <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-[#0C2340]">Bildirishnoma va til sozlamalari</h3>
      <p className="mt-1 text-sm text-[#64748B]">Platforma tilini va xabarnomalarni boshqaring.</p>

      <div className="mt-6 space-y-5">
        <label className="block text-sm">
          <span className="mb-1 block text-[#64748B]">Interfeys tili</span>
          <select
            value={settings.language ?? "uz"}
            onChange={(e) => onChange({ ...settings, language: e.target.value })}
            className="w-full max-w-xs rounded-xl border border-[#E8EDF5] px-3 py-2.5 outline-none focus:border-[#2563EB]"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E8EDF5] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#0C2340]">Email bildirishnomalar</p>
            <p className="text-xs text-[#64748B]">Kurs va test yangiliklari emailga yuborilsin</p>
          </div>
          <input
            type="checkbox"
            checked={settings.email_notifications ?? false}
            onChange={(e) => onChange({ ...settings, email_notifications: e.target.checked })}
            className="h-4 w-4 accent-[#2563EB]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E8EDF5] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#0C2340]">Push bildirishnomalar</p>
            <p className="text-xs text-[#64748B]">Brauzer orqali tezkor xabarnomalar</p>
          </div>
          <input
            type="checkbox"
            checked={settings.push_notifications ?? false}
            onChange={(e) => onChange({ ...settings, push_notifications: e.target.checked })}
            className="h-4 w-4 accent-[#2563EB]"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3B82F6] disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Sozlamalarni saqlash
      </button>
    </div>
  );
}
