export type ForgotPasswordFormValues = {
  email: string;
};

export type ResetPasswordFormValues = {
  email: string;
  code: string;
  newPassword: string;
};
