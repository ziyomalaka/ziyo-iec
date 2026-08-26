"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { clearAuthSession, updateAuthUser } from "@/lib/auth/session";
import {
  profileService,
  profileToEditPayload,
  type ActivityLog,
  type ProfileEditPayload,
  type ProfileSettings,
  type ProfileStatistics,
  type UserProfile,
  type UserSession,
} from "@/lib/profile";
import ProfilePageIntro from "@/components/dashboard/profile/ProfilePageIntro";
import ProfileSkeleton from "@/components/dashboard/profile/ProfileSkeleton";
import ProfileHeroCard from "@/components/dashboard/profile/ProfileHeroCard";
import ProfileStatsRow from "@/components/dashboard/profile/ProfileStatsRow";
import ProfilePersonalCard from "@/components/dashboard/profile/ProfilePersonalCard";
import ProfileSecurityCard from "@/components/dashboard/profile/ProfileSecurityCard";
import ProfileActivityCard from "@/components/dashboard/profile/ProfileActivityCard";
import ProfileSettingsLinks from "@/components/dashboard/profile/ProfileSettingsLinks";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import {
  ActivityListModal,
  AvatarModal,
  DeleteAccountModal,
  EditProfileModal,
  LanguageModal,
  NotificationSettingsModal,
  PasswordModal,
  PrivacySettingsModal,
  SessionsModal,
  TwoFactorSetupModal,
} from "@/components/dashboard/profile/ProfileModals";
import { UserX } from "lucide-react";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function ProfileView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStatistics | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);
  const [saveResponse, setSaveResponse] = useState<{ ok: boolean; status: number; text: string } | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await profileService.getPageData();
      setProfile(data.profile);
      setStats(data.stats);
      setActivities(data.activities);
      setSessions(data.sessions);
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ma'lumotlarni yuklashda xatolik yuz berdi.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveRefresh(() => {
    if (isEditMode || saving) return;
    void loadData(true);
  });

  const syncSession = (p: UserProfile) => {
    updateAuthUser({
      first_name: p.firstName,
      last_name: p.lastName,
      father_name: p.middleName,
      phone_number: p.phone,
      email: p.email,
    });
  };

  const openEdit = async () => {
    try {
      const fresh = await profileService.getProfile();
      setProfile(fresh);
    } catch {
      // mavjud ma'lumot bilan tahrirlashni ochamiz
    }
    setSaveResponse(null);
    setIsEditMode(true);
  };

  const refreshSettings = async () => {
    try {
      const fresh = await profileService.getSettings();
      setSettings(fresh);
      return fresh;
    } catch {
      return settings;
    }
  };

  const handleSaveProfile = async (payload: ProfileEditPayload) => {
    setSaving(true);
    setSaveResponse(null);
    try {
      const updated = await profileService.updateProfile(payload);
      setProfile(updated);
      syncSession(updated);
      const text = "Profil ma'lumotlari muvaffaqiyatli yangilandi.";
      setSaveResponse({ ok: true, status: 200, text });
      toast.success(text);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const text =
        err instanceof ApiError
          ? err.message || err.raw || "Saqlashda xatolik."
          : "Saqlashda xatolik.";
      const raw = err instanceof ApiError && err.raw && err.raw !== err.message ? err.raw : "";
      setSaveResponse({
        ok: false,
        status,
        text: raw ? `${text}\n${raw}` : text,
      });
      toast.error(`${status || "Xato"}: ${text}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSave = async () => {
    if (!avatarFile) return;
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      toast.error("Rasm hajmi 5MB dan oshmasligi kerak.");
      return;
    }
    setSaving(true);
    try {
      const updated = await profileService.uploadAvatar(avatarFile);
      setProfile(updated);
      setAvatarOpen(false);
      setAvatarFile(null);
      setAvatarPreview(undefined);
      toast.success("Profil rasmi yangilandi.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Rasm yuklashda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (oldP: string, newP: string, confirm: string) => {
    if (newP !== confirm) {
      toast.error("Yangi parollar mos kelmadi.");
      return;
    }
    if (newP.length < 6) {
      toast.error("Parol kamida 6 belgidan iborat bo'lishi kerak.");
      return;
    }
    setSaving(true);
    try {
      await profileService.changePassword(oldP, newP);
      setPasswordOpen(false);
      toast.success("Parol muvaffaqiyatli yangilandi.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Parolni o'zgartirishda xatolik.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await profileService.deleteAccount();
      clearAuthSession();
      toast.success("Hisob o'chirildi.");
      router.push("/kirish");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Hisobni o'chirishda xatolik.");
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div>
        <ProfilePageIntro />
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div>
        <ProfilePageIntro />
        <EmptyState
          icon={UserX}
          title="Ma'lumotlarni yuklashda xatolik yuz berdi."
          description={error ?? undefined}
          action={
            <button type="button" onClick={() => loadData()} className="rounded-[5px] bg-[#0756F5] px-4 py-2 text-[13px] font-medium text-white">
              Qayta urinish
            </button>
          }
        />
      </div>
    );
  }

  const applyTwoFactor = async (enabled: boolean) => {
    setToggling2FA(true);
    try {
      const updated = await profileService.setTwoFactor(enabled);
      setProfile(updated);
      setTwoFactorOpen(false);
      toast.success(updated.twoFactorEnabled ? "2FA yoqildi." : "2FA o'chirildi.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "2FA sozlamasini o'zgartirishda xatolik.");
    } finally {
      setToggling2FA(false);
    }
  };

  const editInitial = profileToEditPayload(profile);
  const activeSessionCount = sessions.length;

  return (
    <div className="w-full pb-[2%]">
      <ProfilePageIntro />

      <ProfileHeroCard
        profile={profile}
        onEdit={openEdit}
        onAvatarClick={() => setAvatarOpen(true)}
      />

      <div className="mt-[1.2%] w-full">
        <ProfileStatsRow stats={stats} />
      </div>

      <div className="mt-[1.2%] grid w-full grid-cols-1 gap-[1.2%] xl:grid-cols-[47fr_53fr]">
        <div className="flex w-full flex-col gap-[1.2%]">
          <ProfilePersonalCard profile={profile} onEdit={openEdit} />
          <ProfileSettingsLinks
            languageLabel={settings?.languageLabel ?? "O'zbek (lotin)"}
            onNotifications={async () => {
              await refreshSettings();
              setNotifOpen(true);
            }}
            onPrivacy={async () => {
              await refreshSettings();
              setPrivacyOpen(true);
            }}
            onLanguage={async () => {
              await refreshSettings();
              setLanguageOpen(true);
            }}
          />
        </div>

        <div className="flex w-full flex-col gap-[1.2%]">
          <ProfileSecurityCard
            profile={profile}
            sessionCount={activeSessionCount}
            toggling2FA={toggling2FA}
            onChangePassword={() => setPasswordOpen(true)}
            onViewSessions={async () => {
              setSessionsOpen(true);
              try {
                setSessions(await profileService.getSessions());
              } catch {
                // dashboarddagi sessiyalar qoladi
              }
            }}
            onToggle2FA={() => {
              if (profile.twoFactorEnabled) {
                void applyTwoFactor(false);
                return;
              }
              setTwoFactorOpen(true);
            }}
            onDeleteAccount={() => setDeleteOpen(true)}
          />
          <ProfileActivityCard
            items={activities}
            onViewAll={async () => {
              setActivityOpen(true);
              try {
                setActivities(await profileService.getActivities());
              } catch {
                // dashboarddagi faoliyat qoladi
              }
            }}
          />
        </div>
      </div>

      <EditProfileModal
        open={isEditMode}
        initial={editInitial}
        saving={saving}
        saveResponse={saveResponse}
        onClose={() => setIsEditMode(false)}
        onSave={handleSaveProfile}
      />

      <AvatarModal
        open={avatarOpen}
        preview={avatarPreview}
        saving={saving}
        onClose={() => {
          setAvatarOpen(false);
          setAvatarPreview(undefined);
          setAvatarFile(null);
        }}
        onSelect={(file) => {
          if (file.size > MAX_AVATAR_BYTES) {
            toast.error("Rasm hajmi 5MB dan oshmasligi kerak.");
            return;
          }
          setAvatarFile(file);
          setAvatarPreview(URL.createObjectURL(file));
        }}
        onSave={handleAvatarSave}
      />

      <PasswordModal open={passwordOpen} saving={saving} onClose={() => setPasswordOpen(false)} onSave={handlePassword} />

      <SessionsModal
        open={sessionsOpen}
        sessions={sessions}
        onClose={() => setSessionsOpen(false)}
        onTerminate={async (id) => {
          const session = sessions.find((s) => s.id === id);
          if (session?.isCurrent) {
            toast.error("Joriy sessiyani bu yerdan yopib bo'lmaydi. Hisobdan chiqishni ishlating.");
            return;
          }
          try {
            await profileService.terminateSession(id);
            setSessions(await profileService.getSessions());
            toast.success("Sessiya tugatildi.");
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Sessiyani tugatishda xatolik.");
          }
        }}
      />

      <DeleteAccountModal open={deleteOpen} saving={saving} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />

      {settings && (
        <NotificationSettingsModal
          open={notifOpen}
          settings={settings}
          saving={saving}
          onClose={() => setNotifOpen(false)}
          onSave={async (s) => {
            setSaving(true);
            try {
              const saved = await profileService.updateSettings(s);
              setSettings(saved);
              setNotifOpen(false);
              toast.success("Bildirishnoma sozlamalari saqlandi.");
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Bildirishnoma sozlamalarini saqlashda xatolik.");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}

      {settings && (
        <PrivacySettingsModal
          open={privacyOpen}
          settings={settings}
          saving={saving}
          onClose={() => setPrivacyOpen(false)}
          onSave={async (s) => {
            setSaving(true);
            try {
              const saved = await profileService.updateSettings(s);
              setSettings(saved);
              setPrivacyOpen(false);
              toast.success("Maxfiylik sozlamalari saqlandi.");
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Maxfiylik sozlamalarini saqlashda xatolik.");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}

      <ActivityListModal open={activityOpen} items={activities} onClose={() => setActivityOpen(false)} />

      {settings && (
        <LanguageModal
          open={languageOpen}
          language={settings.language}
          onClose={() => setLanguageOpen(false)}
          onSave={async (lang) => {
            try {
              const saved = await profileService.updateSettings({ ...settings, language: lang });
              setSettings(saved);
              setLanguageOpen(false);
              toast.success("Til sozlamasi saqlandi.");
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Tilni saqlashda xatolik.");
            }
          }}
        />
      )}

      <TwoFactorSetupModal
        open={twoFactorOpen}
        saving={toggling2FA}
        onClose={() => setTwoFactorOpen(false)}
        onConfirm={() => applyTwoFactor(true)}
      />
    </div>
  );
}
