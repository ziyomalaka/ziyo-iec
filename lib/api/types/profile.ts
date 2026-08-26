export type ProfileResponse = {
  id: number;
  public_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  father_name: string;
  full_name?: string;
  phone_number: string;
  date_of_birth?: string;
  gender?: string;
  avatar_url?: string;
  field_of_study?: string;
  position?: string;
  workplace?: string;
  city?: string;
  district?: string;
  address?: string;
  location?: string;
  status?: string;
  status_label?: string;
  two_factor_enabled?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  last_login_at?: string;
  edit_mode_required?: boolean;
  can_edit?: boolean;
  role?: string;
};

export type UpdateProfileRequest = {
  confirm_edit: true;
  first_name: string;
  last_name: string;
  father_name: string;
  phone_number: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  district?: string;
  position?: string;
  workplace?: string;
  field_of_study?: string;
  avatar_url?: string;
};

export type ChangePasswordRequest = {
  old_password: string;
  new_password: string;
  password_plain?: string;
};

export type ProfileStatsResponse = {
  total_courses: number;
  completed_courses: number;
  study_hours: number;
  certificates: number;
  average_result: number;
  average_label?: string;
};

export type SettingsResponse = {
  language?: string;
  language_label?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  privacy_show_profile?: boolean;
};

export type UpdateSettingsRequest = {
  email_notifications?: boolean;
  push_notifications?: boolean;
  privacy_show_profile?: boolean;
  language?: string;
};

export type SecurityResponse = {
  two_factor_enabled: boolean;
  active_sessions: number;
};

export type ActivityResponse = {
  id?: number;
  action: string;
  description: string;
  browser?: string;
  device?: string;
  ip_address?: string;
  created_at: string;
};

export type SessionResponse = {
  id: number | string;
  browser?: string;
  device?: string;
  ip_address?: string;
  last_active_at?: string;
  created_at?: string;
  is_current?: boolean;
};

export type ProfileDashboardResponse = {
  profile: ProfileResponse;
  stats: ProfileStatsResponse;
  settings: SettingsResponse;
  security: SecurityResponse;
  activities: ActivityResponse[];
  sessions: SessionResponse[];
};

export type UpdateTwoFactorRequest = {
  enabled: boolean;
};

export type DeleteProfileRequest = {
  confirm: true;
};
