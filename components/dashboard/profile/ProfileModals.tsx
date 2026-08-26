"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import type {
  ActivityLog,
  ProfileEditPayload,
  ProfileSettings,
  UserSession,
} from "@/lib/profile/types";
import { formatDisplayDateTime } from "@/lib/profile/mappers";
import { SessionBadge } from "@/components/dashboard/profile/ProfileBadges";

const inputClass =
  "w-full rounded-xl border border-[#E8EDF5] px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]";

const UZ_PHONE_PREFIX = "+998";
const BIRTH_DATE_MIN = "1900-01-01";
const BIRTH_DATE_MAX = new Date().toISOString().slice(0, 10);

function localPhoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("998")) return digits.slice(3, 12);
  return digits.slice(0, 9);
}

function isValidBirthDate(value: string) {
  if (!value) return true;
  const year = value.split("-")[0] ?? "";
  if (year.length > 4 || !/^\d{4}$/.test(year)) return false;
  return value >= BIRTH_DATE_MIN && value <= BIRTH_DATE_MAX;
}

/* ---- Edit Profile ---- */
type EditProfileModalProps = {
  open: boolean;
  initial: ProfileEditPayload;
  saving: boolean;
  saveResponse?: { ok: boolean; status: number; text: string } | null;
  onClose: () => void;
  onSave: (payload: ProfileEditPayload) => void;
};

export function EditProfileModal({ open, initial, saving, saveResponse, onClose, onSave }: EditProfileModalProps) {
  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const handleSubmit = () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.middleName.trim() ||
      localPhoneDigits(form.phone).length !== 9
    ) {
      return;
    }
    onSave({ ...form, phone: `${UZ_PHONE_PREFIX}${localPhoneDigits(form.phone)}` });
  };

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Profilni tahrirlash"
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">Bekor qilish</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
          </button>
        </>
      }
    >
      {saveResponse ? (
        <div
          className={`mb-4 rounded-xl border px-3 py-2.5 text-sm whitespace-pre-wrap ${
            saveResponse.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p className="font-semibold">Javob: {saveResponse.status}</p>
          <p className="mt-1">{saveResponse.text}</p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Familiya *</span><input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Ism *</span><input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
        <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-[#64748B]">Otasining ismi *</span><input className={inputClass} value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} /></label>
        <label className="block text-sm">
          <span className="mb-1 block text-[#64748B]">Tug&apos;ilgan sana</span>
          <input
            type="date"
            min={BIRTH_DATE_MIN}
            max={BIRTH_DATE_MAX}
            className={inputClass}
            value={form.birthDate ?? ""}
            onInput={(e) => {
              const year = e.currentTarget.value.split("-")[0] ?? "";
              if (year.length > 4) e.currentTarget.value = form.birthDate ?? "";
            }}
            onChange={(e) => {
              const value = e.target.value;
              if (!isValidBirthDate(value)) return;
              setForm({ ...form, birthDate: value });
            }}
          />
        </label>
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Jinsi</span><select className={inputClass} value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Tanlanmagan</option><option value="Erkak">Erkak</option><option value="Ayol">Ayol</option></select></label>
        <label className="block text-sm">
          <span className="mb-1 block text-[#64748B]">Telefon *</span>
          <div className="flex overflow-hidden rounded-xl border border-[#E8EDF5] focus-within:border-[#2563EB]">
            <span className="flex select-none items-center bg-[#F7F9FC] px-3 text-sm font-semibold text-[#0C2340]">
              {UZ_PHONE_PREFIX}
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={9}
              placeholder="901234567"
              className="min-w-0 flex-1 border-0 bg-white px-3 py-2.5 text-sm outline-none"
              value={localPhoneDigits(form.phone)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                setForm({ ...form, phone: `${UZ_PHONE_PREFIX}${digits}` });
              }}
            />
          </div>
        </label>
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Email</span><input className={`${inputClass} bg-[#F7F9FC] text-[#64748B]`} value={form.email} disabled readOnly /></label>
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Viloyat / Shahar</span><input className={inputClass} value={form.region ?? ""} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Tuman</span><input className={inputClass} value={form.district ?? ""} onChange={(e) => setForm({ ...form, district: e.target.value })} /></label>
        <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-[#64748B]">Manzil</span><input className={inputClass} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Lavozim</span><input className={inputClass} value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-[#64748B]">Ish joyi</span><input className={inputClass} value={form.workplace ?? ""} onChange={(e) => setForm({ ...form, workplace: e.target.value })} /></label>
        <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-[#64748B]">Malaka yo&apos;nalishi</span><input className={inputClass} value={form.qualificationDirection ?? ""} onChange={(e) => setForm({ ...form, qualificationDirection: e.target.value })} /></label>
      </div>
    </DashboardModal>
  );
}

/* ---- Avatar ---- */
type AvatarModalProps = {
  open: boolean;
  preview?: string;
  saving: boolean;
  onClose: () => void;
  onSelect: (file: File) => void;
  onSave: () => void;
};

export function AvatarModal({ open, preview, saving, onClose, onSelect, onSave }: AvatarModalProps) {
  return (
    <DashboardModal open={open} onClose={onClose} title="Profil rasmini yangilash" footer={<><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Bekor qilish</button><button type="button" onClick={onSave} disabled={!preview || saving} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saqlanmoqda..." : "Saqlash"}</button></>}>
      <div className="flex flex-col items-center gap-4">
        {preview ? <img src={preview} alt="Preview" className="h-32 w-32 rounded-full object-cover" /> : <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#F7F9FC] text-sm text-[#64748B]">Rasm tanlang</div>}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }} />
        <p className="text-xs text-[#94A3B8]">JPG, PNG, WEBP — maksimal 5MB</p>
      </div>
    </DashboardModal>
  );
}

/* ---- Verification ---- */
type VerifyModalProps = {
  open: boolean;
  type: "email" | "phone";
  target: string;
  saving: boolean;
  onClose: () => void;
  onSend: () => void;
  onVerify: (code: string) => void;
};

export function VerifyModal({ open, type, target, saving, onClose, onSend, onVerify }: VerifyModalProps) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!open) { setCode(""); setSent(false); setTimer(0); }
  }, [open]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleSend = () => { onSend(); setSent(true); setTimer(60); };

  return (
    <DashboardModal open={open} onClose={onClose} title={type === "email" ? "Email tasdiqlash" : "Telefon tasdiqlash"} footer={sent ? <button type="button" onClick={() => onVerify(code)} disabled={!code || saving} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white">Tasdiqlash</button> : <button type="button" onClick={handleSend} disabled={saving} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white">Kod yuborish</button>}>
      <p className="text-sm text-[#64748B]">{target} manziliga tasdiqlash kodi yuboriladi.</p>
      {sent && (
        <div className="mt-4 space-y-3">
          <input className={inputClass} placeholder="Tasdiqlash kodi" value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="button" disabled={timer > 0} onClick={handleSend} className="text-sm text-[#2563EB] disabled:text-[#94A3B8]">{timer > 0 ? `Qayta yuborish (${timer}s)` : "Qayta yuborish"}</button>
        </div>
      )}
    </DashboardModal>
  );
}

/* ---- Password ---- */
type PasswordModalProps = { open: boolean; saving: boolean; onClose: () => void; onSave: (oldP: string, newP: string, confirm: string) => void };
export function PasswordModal({ open, saving, onClose, onSave }: PasswordModalProps) {
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => { if (!open) { setOldP(""); setNewP(""); setConfirm(""); } }, [open]);
  return (
    <DashboardModal open={open} onClose={onClose} title="Parolni yangilash" footer={<><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Bekor qilish</button><button type="button" onClick={() => onSave(oldP, newP, confirm)} disabled={saving} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white">Parolni yangilash</button></>}>
      <div className="space-y-4">
        {[{ l: "Eski parol", v: oldP, s: setOldP }, { l: "Yangi parol", v: newP, s: setNewP }, { l: "Yangi parolni takrorlash", v: confirm, s: setConfirm }].map((f) => (
          <label key={f.l} className="block text-sm"><span className="mb-1 block text-[#64748B]">{f.l}</span><div className="relative"><input type={show ? "text" : "password"} className={inputClass} value={f.v} onChange={(e) => f.s(e.target.value)} /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
        ))}
      </div>
    </DashboardModal>
  );
}

/* ---- Sessions ---- */
type SessionsModalProps = { open: boolean; sessions: UserSession[]; onClose: () => void; onTerminate: (id: string) => void };
export function SessionsModal({ open, sessions, onClose, onTerminate }: SessionsModalProps) {
  return (
    <DashboardModal open={open} onClose={onClose} title="Faol sessiyalar" size="lg">
      <div className="space-y-3">
        {sessions.length === 0 && <p className="text-sm text-[#64748B]">Faol sessiya topilmadi.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8EDF5] p-4">
            <div>
              <p className="font-semibold text-[#0C2340]">{s.browser} • {s.device}</p>
              <p className="text-sm text-[#64748B]">{s.location}</p>
              <p className="text-xs text-[#94A3B8]">{formatDisplayDateTime(s.lastActiveAt)}</p>
              {s.isCurrent && <div className="mt-1"><SessionBadge /></div>}
            </div>
            {!s.isCurrent && (
              <button type="button" onClick={() => onTerminate(s.id)} className="text-sm text-red-600 hover:underline">
                Chiqish
              </button>
            )}
          </div>
        ))}
      </div>
    </DashboardModal>
  );
}

/* ---- Two factor ---- */
type TwoFactorSetupModalProps = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function TwoFactorSetupModal({ open, saving, onClose, onConfirm }: TwoFactorSetupModalProps) {
  const [method, setMethod] = useState<"sms" | "email" | "authenticator">("sms");

  useEffect(() => {
    if (open) setMethod("sms");
  }, [open]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Ikki bosqichli himoyani yoqish"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-[5px] border border-[#DFE7F2] px-4 py-2 text-[13px]">
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-[5px] bg-[#0756F5] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
          >
            {saving ? "Yoqilmoqda..." : "Yoqish"}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-[#536287]">Tasdiqlash usulini tanlang. Keyin himoya yoqiladi.</p>
      <div className="mt-4 space-y-2">
        {[
          { id: "sms" as const, title: "SMS", subtitle: "Telefon raqamingizga kod" },
          { id: "email" as const, title: "Email", subtitle: "Elektron pochtangizga kod" },
          { id: "authenticator" as const, title: "Authenticator", subtitle: "Google Authenticator yoki shunga o‘xshash ilova" },
        ].map((item) => (
          <label
            key={item.id}
            className={`flex cursor-pointer items-start gap-3 rounded-[9px] border px-4 py-3 ${
              method === item.id ? "border-[#0756F5] bg-[#EEF5FF]" : "border-[#DFE7F2]"
            }`}
          >
            <input
              type="radio"
              name="two-factor-method"
              className="mt-1 accent-[#0756F5]"
              checked={method === item.id}
              onChange={() => setMethod(item.id)}
            />
            <span>
              <span className="block text-[13px] font-semibold text-[#111b39]">{item.title}</span>
              <span className="block text-[11px] text-[#536287]">{item.subtitle}</span>
            </span>
          </label>
        ))}
      </div>
    </DashboardModal>
  );
}

/* ---- Delete ---- */
type DeleteModalProps = { open: boolean; saving: boolean; onClose: () => void; onConfirm: () => void };
export function DeleteAccountModal({ open, saving, onClose, onConfirm }: DeleteModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Hisobni o'chirish"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-[5px] border border-[#DFE7F2] px-4 py-2 text-[13px]">Bekor qilish</button>
          <button type="button" onClick={onConfirm} disabled={saving || !confirmed} className="rounded-[5px] bg-[#EF3340] px-4 py-2 text-[13px] text-white disabled:opacity-60">
            Ha, o&apos;chirilsin
          </button>
        </>
      }
    >
      <p className="text-[13px] text-[#536287]">
        Bu xavfli amal. Hisob o&apos;chirilgach, ma&apos;lumotlarni qaytarib bo&apos;lmaydi. Davom etish uchun tasdiqlang.
      </p>
      <label className="mt-4 flex items-start gap-2 text-[13px] text-[#111b39]">
        <input
          type="checkbox"
          className="mt-0.5 accent-[#EF3340]"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Hisobimni o&apos;chirishni tasdiqlayman.
      </label>
    </DashboardModal>
  );
}

/* ---- Notifications ---- */
type NotificationModalProps = { open: boolean; settings: ProfileSettings; saving: boolean; onClose: () => void; onSave: (s: ProfileSettings) => void };
export function NotificationSettingsModal({ open, settings, saving, onClose, onSave }: NotificationModalProps) {
  const [local, setLocal] = useState(settings);
  useEffect(() => { if (open) setLocal(settings); }, [open, settings]);
  return (
    <DashboardModal open={open} onClose={onClose} title="Bildirishnoma sozlamalari" footer={<button type="button" onClick={() => onSave(local)} disabled={saving} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white">Saqlash</button>}>
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-lg border border-[#E8EDF5] px-4 py-3 text-sm">
          <span>Email xabarnomalar</span>
          <input type="checkbox" checked={local.emailNotifications} onChange={(e) => setLocal({ ...local, emailNotifications: e.target.checked })} className="h-4 w-4 accent-[#2563EB]" />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-[#E8EDF5] px-4 py-3 text-sm">
          <span>Push xabarnomalar</span>
          <input type="checkbox" checked={local.pushNotifications} onChange={(e) => setLocal({ ...local, pushNotifications: e.target.checked })} className="h-4 w-4 accent-[#2563EB]" />
        </label>
      </div>
    </DashboardModal>
  );
}

/* ---- Privacy ---- */
type PrivacyModalProps = { open: boolean; settings: ProfileSettings; saving: boolean; onClose: () => void; onSave: (s: ProfileSettings) => void };
export function PrivacySettingsModal({ open, settings, saving, onClose, onSave }: PrivacyModalProps) {
  const [local, setLocal] = useState(settings);
  useEffect(() => { if (open) setLocal(settings); }, [open, settings]);
  return (
    <DashboardModal open={open} onClose={onClose} title="Maxfiylik sozlamalari" footer={<button type="button" onClick={() => onSave(local)} disabled={saving} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white">Saqlash</button>}>
      <label className="flex items-center justify-between rounded-lg border border-[#E8EDF5] px-4 py-3 text-sm">
        <span>Profilni ko&apos;rsatish</span>
        <input type="checkbox" checked={local.privacyShowProfile} onChange={(e) => setLocal({ ...local, privacyShowProfile: e.target.checked })} className="h-4 w-4 accent-[#2563EB]" />
      </label>
    </DashboardModal>
  );
}

/* ---- Activity full ---- */
type ActivityListModalProps = { open: boolean; items: ActivityLog[]; onClose: () => void };
export function ActivityListModal({ open, items, onClose }: ActivityListModalProps) {
  return (
    <DashboardModal open={open} onClose={onClose} title="Faoliyat tarixi" size="xl">
      <div className="divide-y divide-[#E8EDF5]">{items.map((item) => (<div key={item.id} className="py-4"><p className="font-semibold text-[#0C2340]">{item.title}</p><p className="text-sm text-[#64748B]">{item.description}</p><p className="mt-1 text-xs text-[#94A3B8]">{formatDisplayDateTime(item.createdAt)} • {[item.browser, item.device].filter(Boolean).join(" • ")}</p></div>))}</div>
    </DashboardModal>
  );
}

/* ---- Language ---- */
type LanguageModalProps = { open: boolean; language: string; onClose: () => void; onSave: (lang: string) => void };
export function LanguageModal({ open, language, onClose, onSave }: LanguageModalProps) {
  const [lang, setLang] = useState(language);
  useEffect(() => { if (open) setLang(language); }, [open, language]);
  return (
    <DashboardModal open={open} onClose={onClose} title="Tizim tili" footer={<button type="button" onClick={() => onSave(lang)} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white">Saqlash</button>}>
      <select className={inputClass} value={lang} onChange={(e) => setLang(e.target.value)}><option value="uz">O&apos;zbek (lotin)</option><option value="ru">Rus</option></select>
    </DashboardModal>
  );
}
