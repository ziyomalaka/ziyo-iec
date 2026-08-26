import {
  changePassword as apiChangePassword,
  deleteProfile as apiDeleteProfile,
  getProfile as apiGetProfile,
  getProfileActivity,
  getProfileDashboard,
  getProfileSessions,
  getProfileSettings,
  getProfileStats,
  terminateSession as apiTerminateSession,
  updateProfile as apiUpdateProfile,
  updateProfileSettings,
  updateTwoFactor,
  uploadAvatar as apiUploadAvatar,
} from "@/lib/api/profile";
import type { MessageResponse } from "@/lib/api/types/auth";
import type { ProfileResponse } from "@/lib/api/types/profile";
import {
  editPayloadToUpdateRequest,
  mapActivityResponse,
  mapDashboardResponse,
  mapProfileResponse,
  mapSessionResponse,
  mapSettingsResponse,
  mapStatsResponse,
} from "./mappers";
import type {
  ActivityLog,
  ProfileDashboard,
  ProfileEditPayload,
  ProfileSettings,
  ProfileStatistics,
  UserProfile,
  UserSession,
} from "./types";

function toUser(data: ProfileResponse | null | undefined): UserProfile | null {
  if (!data || typeof data.id !== "number" || !data.first_name) return null;
  return mapProfileResponse(data);
}

const emptyStats: ProfileStatistics = {
  totalCourses: 0,
  completedCourses: 0,
  averageScore: 0,
  averageLabel: "-",
  certificateCount: 0,
  totalLearningHours: 0,
};

const emptySettings: ProfileSettings = {
  emailNotifications: true,
  pushNotifications: true,
  privacyShowProfile: true,
  language: "uz",
  languageLabel: "O'zbek (lotin)",
};

export const profileService = {
  /** GET /profile/dashboard */
  async getDashboard(): Promise<ProfileDashboard> {
    const data = await getProfileDashboard();
    return mapDashboardResponse(data);
  },

  /** GET /profile */
  async getProfile(): Promise<UserProfile> {
    const data = await apiGetProfile();
    return mapProfileResponse(data);
  },

  /** GET /profile/stats */
  async getStatistics(): Promise<ProfileStatistics> {
    const data = await getProfileStats();
    return mapStatsResponse(data);
  },

  /** GET /profile/activity */
  async getActivities(): Promise<ActivityLog[]> {
    const data = await getProfileActivity();
    return mapActivityResponse(data);
  },

  /** GET /profile/sessions */
  async getSessions(): Promise<UserSession[]> {
    const data = await getProfileSessions();
    return mapSessionResponse(data);
  },

  /** GET /profile/settings */
  async getSettings(): Promise<ProfileSettings> {
    const data = await getProfileSettings();
    return mapSettingsResponse(data);
  },

  /** Avval GET /profile/dashboard, ishlamasa alohida GET lar */
  async getPageData(): Promise<ProfileDashboard> {
    try {
      const dash = await this.getDashboard();
      const [stats, settings, activities, sessions] = await Promise.all([
        this.getStatistics().catch(() => dash.stats),
        this.getSettings().catch(() => dash.settings),
        this.getActivities().catch(() => dash.activities),
        this.getSessions().catch(() => dash.sessions),
      ]);
      return { ...dash, stats, settings, activities, sessions };
    } catch {
      const [profile, stats, settings, activities, sessions] = await Promise.all([
        this.getProfile(),
        this.getStatistics().catch(() => null),
        this.getSettings().catch(() => null),
        this.getActivities().catch(() => [] as ActivityLog[]),
        this.getSessions().catch(() => [] as UserSession[]),
      ]);

      return {
        profile,
        stats: stats ?? emptyStats,
        settings: settings ?? emptySettings,
        security: {
          twoFactorEnabled: profile.twoFactorEnabled,
          activeSessions: sessions.length,
        },
        activities,
        sessions,
      };
    }
  },

  /** PUT /profile → GET /profile */
  async updateProfile(payload: ProfileEditPayload): Promise<UserProfile> {
    const saved = toUser(await apiUpdateProfile(editPayloadToUpdateRequest(payload)));
    return saved ?? this.getProfile();
  },

  /** POST /profile/avatar → GET /profile */
  async uploadAvatar(file: File): Promise<UserProfile> {
    const saved = toUser(await apiUploadAvatar(file));
    return saved ?? this.getProfile();
  },

  /** PUT /profile/password */
  async changePassword(oldPassword: string, newPassword: string): Promise<MessageResponse> {
    return apiChangePassword({ old_password: oldPassword, new_password: newPassword });
  },

  /** DELETE /profile/sessions/{id} */
  async terminateSession(sessionId: string): Promise<void> {
    await apiTerminateSession(sessionId);
  },

  /** PUT /profile/two-factor → GET /profile */
  async setTwoFactor(enabled: boolean): Promise<UserProfile> {
    const saved = toUser(await updateTwoFactor(enabled));
    return saved ?? this.getProfile();
  },

  /** PUT /profile/settings → GET /profile/settings */
  async updateSettings(settings: ProfileSettings): Promise<ProfileSettings> {
    const saved = await updateProfileSettings({
      language: settings.language,
      email_notifications: settings.emailNotifications,
      push_notifications: settings.pushNotifications,
      privacy_show_profile: settings.privacyShowProfile,
    });
    if (saved && typeof saved === "object") {
      return mapSettingsResponse(saved);
    }
    return this.getSettings();
  },

  /** DELETE /profile */
  async deleteAccount(): Promise<MessageResponse> {
    return apiDeleteProfile();
  },
};
