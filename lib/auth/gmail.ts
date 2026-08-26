export const GMAIL_ONLY_MESSAGE = "faqat Gmail manzil qabul qilinadi (@gmail.com)";

const GMAIL_RE = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i;

export function isGmailAddress(value?: string | null) {
  return GMAIL_RE.test((value ?? "").trim());
}

export const STAFF_NICKNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;

export function isStaffNickname(value?: string | null) {
  return STAFF_NICKNAME_RE.test((value ?? "").trim());
}
