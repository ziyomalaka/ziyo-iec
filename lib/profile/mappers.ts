import type {
  ActivityResponse,
  ProfileDashboardResponse,
  ProfileResponse,
  ProfileStatsResponse,
  SessionResponse,
  SettingsResponse,
  UpdateProfileRequest,
} from "@/lib/api/types/profile";
import type {
  ActivityLog,
  ProfileDashboard,
  ProfileEditPayload,
  ProfileSettings,
  ProfileStatistics,
  UserProfile,
  UserSession,
} from "./types";

export function mapProfileResponse(data: ProfileResponse): UserProfile {
  const fullName =
    data.full_name?.trim() ||
    `${data.first_name} ${data.last_name}`.trim() ||
    `${data.last_name} ${data.first_name} ${data.father_name}`.trim();

  return {
    id: data.id,
    publicId: data.public_id ?? `ZM-${data.id}`,
    firstName: data.first_name,
    lastName: data.last_name,
    middleName: data.father_name,
    fullName,
    avatarUrl: data.avatar_url,
    email: data.email,
    emailVerified: data.email_verified ?? false,
    phone: data.phone_number,
    phoneVerified: data.phone_verified ?? false,
    birthDate: data.date_of_birth,
    gender: data.gender,
    region: data.city,
    district: data.district,
    address: data.address,
    location: data.location,
    profession: data.field_of_study,
    position: data.position,
    workplace: data.workplace,
    specialization: data.field_of_study,
    qualificationDirection: data.field_of_study,
    status: data.status ?? "active",
    statusLabel: data.status_label ?? "Faol foydalanuvchi",
    registeredAt: data.created_at,
    lastLoginAt: data.last_login_at,
    twoFactorEnabled: data.two_factor_enabled ?? false,
    editModeRequired: data.edit_mode_required ?? true,
    canEdit: data.can_edit ?? false,
  };
}

export function mapStatsResponse(data?: ProfileStatsResponse | null): ProfileStatistics {
  return {
    totalCourses: data?.total_courses ?? 0,
    completedCourses: data?.completed_courses ?? 0,
    averageScore: data?.average_result ?? 0,
    averageLabel: data?.average_label ?? formatScoreLabel(data?.average_result ?? 0),
    certificateCount: data?.certificates ?? 0,
    totalLearningHours: data?.study_hours ?? 0,
  };
}

export function mapSettingsResponse(data: SettingsResponse): ProfileSettings {
  return {
    emailNotifications: data.email_notifications ?? true,
    pushNotifications: data.push_notifications ?? true,
    privacyShowProfile: data.privacy_show_profile ?? true,
    language: data.language ?? "uz",
    languageLabel: data.language_label ?? (data.language === "ru" ? "Rus" : "O'zbek (lotin)"),
  };
}

export function mapActivityResponse(items: ActivityResponse[]): ActivityLog[] {
  return (items ?? []).map((item, index) => ({
    id: item.id ?? index + 1,
    type: item.action,
    title: item.description || item.action,
    description: item.description,
    browser: item.browser,
    device: item.device,
    ip: item.ip_address,
    createdAt: item.created_at,
  }));
}

export function mapSessionResponse(items: SessionResponse[]): UserSession[] {
  return (items ?? []).map((item) => ({
    id: String(item.id),
    browser: item.browser ?? "—",
    device: item.device ?? "—",
    location: item.ip_address ?? "—",
    lastActiveAt: item.last_active_at ?? item.created_at ?? "",
    isCurrent: item.is_current ?? false,
  }));
}

export function mapDashboardResponse(data: ProfileDashboardResponse): ProfileDashboard {
  const nested = (data as unknown as { data?: ProfileDashboardResponse }).data;
  if (nested?.profile && !data.profile) {
    data = nested;
  }

  const profile = mapProfileResponse(data.profile);
  const security = data.security ?? {
    two_factor_enabled: profile.twoFactorEnabled,
    active_sessions: data.sessions?.length ?? 0,
  };

  return {
    profile: {
      ...profile,
      twoFactorEnabled: security.two_factor_enabled ?? profile.twoFactorEnabled,
    },
    stats: mapStatsResponse(data.stats),
    settings: mapSettingsResponse(data.settings ?? {}),
    security: {
      twoFactorEnabled: security.two_factor_enabled,
      activeSessions: security.active_sessions,
    },
    activities: mapActivityResponse(data.activities ?? []),
    sessions: mapSessionResponse(data.sessions ?? []),
  };
}

function toApiGender(value?: string) {
  const gender = value?.trim().toLowerCase();
  if (!gender) return undefined;
  if (gender === "male" || gender === "erkak" || gender === "m") return "Erkak";
  if (gender === "female" || gender === "ayol" || gender === "f") return "Ayol";
  if (value === "Erkak" || value === "Ayol") return value;
  return undefined;
}

function toIsoDate(value?: string) {
  if (!value?.trim()) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const dotted = value.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;

  const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function toApiPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  return value.trim();
}

function optionalText(value?: string) {
  const text = value?.trim();
  return text || undefined;
}

export function profileToEditPayload(profile: UserProfile): ProfileEditPayload {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    middleName: profile.middleName,
    phone: profile.phone,
    email: profile.email,
    birthDate: toIsoDate(profile.birthDate),
    gender: toApiGender(profile.gender),
    region: profile.region,
    district: profile.district,
    address: profile.address,
    position: profile.position,
    workplace: profile.workplace,
    qualificationDirection: profile.qualificationDirection,
  };
}

export function editPayloadToUpdateRequest(payload: ProfileEditPayload): UpdateProfileRequest {
  return {
    confirm_edit: true,
    first_name: payload.firstName.trim(),
    last_name: payload.lastName.trim(),
    father_name: payload.middleName.trim(),
    phone_number: toApiPhone(payload.phone),
    date_of_birth: toIsoDate(payload.birthDate),
    gender: toApiGender(payload.gender),
    city: optionalText(payload.region),
    district: optionalText(payload.district),
    address: optionalText(payload.address),
    field_of_study: optionalText(payload.qualificationDirection),
    position: optionalText(payload.position),
    workplace: optionalText(payload.workplace),
  };
}

export function formatGender(gender?: string) {
  if (gender === "female" || gender === "Ayol") return "Ayol";
  if (gender === "male" || gender === "Erkak") return "Erkak";
  return gender ?? "—";
}

export function formatScoreLabel(score: number) {
  if (!score) return "-";
  if (score >= 90) return "A'lo";
  if (score >= 80) return "Yaxshi";
  if (score >= 70) return "Qoniqarli";
  return "Rivojlantirish kerak";
}

export function formatDisplayDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDisplayDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRegion(profile: UserProfile) {
  if (profile.location) return profile.location;
  const parts = [profile.region, profile.district].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}
