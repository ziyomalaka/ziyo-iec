import { normalizeAppRole } from "@/lib/auth/roles";
import type { UserResponse } from "@/lib/api/types/auth";

const TOKEN_KEY = "zm_auth_token";
const USER_KEY = "zm_auth_user";

function getStorage(remember: boolean) {
  return remember ? localStorage : sessionStorage;
}

function withNormalizedRole(user: UserResponse): UserResponse {
  const role = normalizeAppRole(user.role);
  return role && role !== user.role ? { ...user, role } : user;
}

export function saveAuthSession(token: string, user: UserResponse, remember: boolean) {
  clearAuthSession();
  const storage = getStorage(remember);
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(withNormalizedRole(user)));
}

function getAuthStore(): Storage | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem(TOKEN_KEY)) return localStorage;
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
  return null;
}

export function getAuthToken(): string | null {
  return getAuthStore()?.getItem(TOKEN_KEY) ?? null;
}

export function getAuthUser(): UserResponse | null {
  const store = getAuthStore();
  if (!store) return null;
  const raw = store.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return withNormalizedRole(JSON.parse(raw) as UserResponse);
  } catch {
    return null;
  }
}

/** JWT payload ichidagi role — token matni log qilinmaydi. */
export function peekTokenRole(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = json + "=".repeat((4 - (json.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const nested = payload.user && typeof payload.user === "object" ? (payload.user as Record<string, unknown>) : null;
    const role = payload.role ?? payload.user_role ?? nested?.role;
    return typeof role === "string" && role.trim() ? role.trim() : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function updateAuthUser(partial: Partial<UserResponse>) {
  const storage = getAuthStore();
  if (!storage) return;
  const user = getAuthUser();
  if (!user) return;
  storage.setItem(USER_KEY, JSON.stringify(withNormalizedRole({ ...user, ...partial })));
}
