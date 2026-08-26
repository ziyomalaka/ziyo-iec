export type CreateAppealRequest = {
  subject: string;
  message: string;
};

export type CreateApplicationRequest = {
  title: string;
  type?: string;
  comment?: string;
  course_id?: number;
};

export type ClientApplicationResponse = {
  id: number;
  client_id?: number;
  client_name?: string;
  client_email?: string;
  title: string;
  type?: string;
  status: string;
  status_label?: string;
  comment?: string;
  reject_reason?: string;
  course_id?: number;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
};
