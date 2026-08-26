export type UserResponse = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  father_name: string;
  phone_number: string;
  nickname?: string;
  role: string;
};

export type AuthResponse = {
  token: string;
  user: UserResponse;
};

export type MessageResponse = {
  message: string;
};

export type LoginRequest =
  | { email: string; password: string; password_plain?: string }
  | { nickname: string; password: string; password_plain?: string };

export type RegisterRequest = {
  email: string;
  first_name: string;
  last_name: string;
  father_name: string;
  phone_number: string;
  password: string;
  password_confirm: string;
  password_plain?: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  code: string;
  new_password: string;
  password_plain?: string;
};
