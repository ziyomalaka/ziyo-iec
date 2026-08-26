import { apiRequest } from "@/lib/api/client";
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/lib/api/types/auth";
import { withPasswordPlain } from "@/lib/auth/password-plain";

/** POST /auth/login — email+password (student) yoki nickname+password (staff). Ikkalasini birga yubormang. */
export function login(payload: LoginRequest) {
  const body =
    "email" in payload
      ? { email: payload.email, password: payload.password }
      : { nickname: payload.nickname, password: payload.password };
  return apiRequest<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    false
  );
}

/** POST /auth/register — yangi foydalanuvchini ro'yxatdan o'tkazish */
export function register(payload: RegisterRequest) {
  return apiRequest<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        father_name: payload.father_name,
        phone_number: payload.phone_number,
        password: payload.password,
        password_confirm: payload.password_confirm,
      }),
    },
    false
  );
}

/** POST /auth/forgot-password — emailga 4 xonali kod yuborish */
export function forgotPassword(payload: ForgotPasswordRequest) {
  return apiRequest<MessageResponse>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    false
  );
}

/** POST /auth/reset-password — kodni tasdiqlab yangi parol o'rnatish */
export function resetPassword(payload: ResetPasswordRequest) {
  return apiRequest<MessageResponse>(
    "/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify(withPasswordPlain(payload, payload.new_password)),
    },
    false
  );
}

/** POST /auth/logout — faqat confirm: true bilan */
export function logout() {
  return apiRequest<MessageResponse>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}
