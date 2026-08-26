import { apiRequest } from "@/lib/api/client";
import type { MessageResponse } from "@/lib/api/types/auth";
import type {
  ActivityResponse,
  ChangePasswordRequest,
  ProfileDashboardResponse,
  ProfileResponse,
  ProfileStatsResponse,
  SessionResponse,
  SettingsResponse,
  UpdateProfileRequest,
  UpdateSettingsRequest,
} from "@/lib/api/types/profile";
import { withPasswordPlain } from "@/lib/auth/password-plain";
import { unwrapApiPayload, unwrapNamed } from "@/lib/api/unwrap";

function asList<T>(data: unknown, keys: string[]): T[] {
  const inner = unwrapApiPayload<unknown>(data);
  if (Array.isArray(inner)) return inner as T[];
  if (inner && typeof inner === "object") {
    const obj = inner as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function asProfile(data: unknown): ProfileResponse {
  const inner = unwrapApiPayload<unknown>(data);
  if (inner && typeof inner === "object" && "first_name" in inner && "id" in inner) {
    return inner as ProfileResponse;
  }
  return unwrapNamed<ProfileResponse>(data, "profile");
}

function asDashboard(data: unknown): ProfileDashboardResponse {
  const inner = unwrapApiPayload<unknown>(data);
  if (inner && typeof inner === "object" && "profile" in inner) {
    return inner as ProfileDashboardResponse;
  }
  return inner as ProfileDashboardResponse;
}

function asStats(data: unknown): ProfileStatsResponse {
  return unwrapNamed<ProfileStatsResponse>(data, "stats");
}

function asSettings(data: unknown): SettingsResponse {
  return unwrapNamed<SettingsResponse>(data, "settings");
}

/** GET /profile/dashboard */
export async function getProfileDashboard() {
  const data = await apiRequest<unknown>("/profile/dashboard");
  return asDashboard(data);
}

/** GET /profile */
export async function getProfile() {
  const data = await apiRequest<unknown>("/profile");
  return asProfile(data);
}

/** PUT /profile */
export async function updateProfile(payload: UpdateProfileRequest) {
  const body: UpdateProfileRequest = {
    confirm_edit: true,
    first_name: payload.first_name,
    last_name: payload.last_name,
    father_name: payload.father_name,
    phone_number: payload.phone_number,
  };

  if (payload.date_of_birth) body.date_of_birth = payload.date_of_birth;
  if (payload.gender) body.gender = payload.gender;
  if (payload.address) body.address = payload.address;
  if (payload.city) body.city = payload.city;
  if (payload.district) body.district = payload.district;
  if (payload.position) body.position = payload.position;
  if (payload.workplace) body.workplace = payload.workplace;
  if (payload.field_of_study) body.field_of_study = payload.field_of_study;
  if (payload.avatar_url) body.avatar_url = payload.avatar_url;

  const data = await apiRequest<unknown>("/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return asProfile(data);
}

/** DELETE /profile */
export function deleteProfile() {
  return apiRequest<MessageResponse>("/profile", {
    method: "DELETE",
    body: JSON.stringify({ confirm: true }),
  });
}

/** GET /profile/activity */
export async function getProfileActivity() {
  const data = await apiRequest<unknown>("/profile/activity");
  return asList<ActivityResponse>(data, ["activities", "data", "items"]);
}

/** POST /profile/avatar */
export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  const data = await apiRequest<unknown>("/profile/avatar", {
    method: "POST",
    body: formData,
  });
  return asProfile(data);
}

/** PUT /profile/password */
export function changePassword(payload: ChangePasswordRequest) {
  return apiRequest<MessageResponse>("/profile/password", {
    method: "PUT",
    body: JSON.stringify(withPasswordPlain(payload, payload.new_password)),
  });
}

/** GET /profile/sessions */
export async function getProfileSessions() {
  const data = await apiRequest<unknown>("/profile/sessions");
  return asList<SessionResponse>(data, ["sessions", "data", "items"]);
}

/** DELETE /profile/sessions/{id} */
export function terminateSession(sessionId: string) {
  return apiRequest<MessageResponse>(`/profile/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

/** GET /profile/settings */
export async function getProfileSettings() {
  const data = await apiRequest<unknown>("/profile/settings");
  return asSettings(data);
}

/** PUT /profile/settings */
export async function updateProfileSettings(payload: UpdateSettingsRequest) {
  const data = await apiRequest<unknown>("/profile/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return asSettings(data);
}

/** GET /profile/stats */
export async function getProfileStats() {
  const data = await apiRequest<unknown>("/profile/stats");
  return asStats(data);
}

/** PUT /profile/two-factor */
export async function updateTwoFactor(enabled: boolean) {
  const data = await apiRequest<unknown>("/profile/two-factor", {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
  return asProfile(data);
}
