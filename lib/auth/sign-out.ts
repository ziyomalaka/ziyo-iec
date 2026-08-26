import { logout } from "@/lib/api/auth";
import { clearAuthSession } from "@/lib/auth/session";

/** Backendga chiqish so'rovini yuboradi, so'ng mahalliy sessiyani tozalaydi. */
export async function signOut() {
  try {
    await logout();
  } catch {
    // Token muddati o'tgan yoki tarmoq xatosi — baribir mahalliy sessiyani yopamiz
  }

  clearAuthSession();
}
