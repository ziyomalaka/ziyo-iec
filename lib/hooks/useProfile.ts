"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { profileService } from "@/lib/profile/service";
import type {
  ActivityLog,
  ProfileSettings,
  ProfileStatistics,
  UserProfile,
  UserSession,
} from "@/lib/profile/types";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStatistics | null>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await profileService.getPageData();
      setProfile(data.profile);
      setStats(data.stats);
      setSettings(data.settings);
      setActivities(data.activities);
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      if (silent) return;
      setError(err instanceof ApiError ? err.message : "Profil ma'lumotlarini yuklab bo'lmadi.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useLiveRefresh(() => void reload(true));

  return {
    profile,
    stats,
    settings,
    activities,
    sessions,
    loading,
    error,
    setProfile,
    setSettings,
    setActivities,
    setSessions,
    reload,
    updateProfile: profileService.updateProfile,
    uploadAvatar: profileService.uploadAvatar,
    changePassword: profileService.changePassword,
    deleteAccount: profileService.deleteAccount,
    getActivities: profileService.getActivities,
    getSessions: profileService.getSessions,
    getSettings: profileService.getSettings,
    updateSettings: profileService.updateSettings,
    terminateSession: profileService.terminateSession,
    setTwoFactor: profileService.setTwoFactor,
  };
}

export type UseProfileReturn = ReturnType<typeof useProfile>;
