import type { AbstractIntlMessages } from "next-intl";

const CLIENT_NAMESPACES = [
  "common",
  "login",
  "register",
  "auth",
  "validation",
  "contact",
] as const;

export function pickClientMessages(
  messages: AbstractIntlMessages
): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};

  for (const key of CLIENT_NAMESPACES) {
    const value = messages[key];
    if (value) picked[key] = value;
  }

  return picked;
}
