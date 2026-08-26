export type UserProfile = {
  id: number;
  publicId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
  birthDate?: string;
  gender?: string;
  region?: string;
  district?: string;
  address?: string;
  location?: string;
  profession?: string;
  position?: string;
  workplace?: string;
  specialization?: string;
  qualificationDirection?: string;
  status: "active" | "inactive" | string;
  statusLabel: string;
  registeredAt?: string;
  lastLoginAt?: string;
  twoFactorEnabled: boolean;
  editModeRequired: boolean;
  canEdit: boolean;
};

export type ProfileStatistics = {
  totalCourses: number;
  completedCourses: number;
  averageScore: number;
  averageLabel: string;
  certificateCount: number;
  totalLearningHours: number;
};

export type ActivityLog = {
  id: number;
  type: string;
  title: string;
  description: string;
  device?: string;
  browser?: string;
  ip?: string;
  createdAt: string;
};

export type UserSession = {
  id: string;
  browser: string;
  device: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
};

export type ProfileSettings = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  privacyShowProfile: boolean;
  language: string;
  languageLabel: string;
};

export type ProfileSecurity = {
  twoFactorEnabled: boolean;
  activeSessions: number;
};

export type ProfileDashboard = {
  profile: UserProfile;
  stats: ProfileStatistics;
  settings: ProfileSettings;
  security: ProfileSecurity;
  activities: ActivityLog[];
  sessions: UserSession[];
};

export type ProfileEditPayload = {
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  email: string;
  birthDate?: string;
  gender?: string;
  region?: string;
  district?: string;
  address?: string;
  position?: string;
  workplace?: string;
  qualificationDirection?: string;
};
