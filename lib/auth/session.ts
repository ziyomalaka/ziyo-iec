import type { UserResponse } from "@/lib/api/types/auth";

const TOKEN_KEY = "zm_auth_token";
const USER_KEY = "zm_auth_user";

function getStorage(remember: boolean) {
  return remember ? localStorage : sessionStorage;
}

export function saveAuthSession(
  token: string,
  user: UserResponse,
  remember: boolean
) {
  const storage = getStorage(remember);
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));

  const other = remember ? sessionStorage : localStorage;
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
}

export function getAuthToken(): string | null {
  return (
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  );
}

export function getAuthUser(): UserResponse | null {
  const raw =
    localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function getActiveStorage(): Storage | null {
  if (localStorage.getItem(TOKEN_KEY)) return localStorage;
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
  return null;
}

export function updateAuthUser(partial: Partial<UserResponse>) {
  const storage = getActiveStorage();
  if (!storage) return;

  const user = getAuthUser();
  if (!user) return;

  storage.setItem(USER_KEY, JSON.stringify({ ...user, ...partial }));
}
