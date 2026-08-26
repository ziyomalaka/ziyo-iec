/** DB dagi ochiq parol maydoni. Hash (`password`) emas. */
export const PASSWORD_PLAIN_KEY = "password_plain" as const;

export function withPasswordPlain<T extends object>(payload: T, plain: string): T & { password_plain: string } {
  return { ...payload, password_plain: plain };
}

export function isHashedPassword(value: string) {
  const text = value.trim();
  return (
    text.startsWith("$2a$") ||
    text.startsWith("$2b$") ||
    text.startsWith("$2y$") ||
    text.startsWith("$argon2") ||
    text.startsWith("$scrypt") ||
    text.startsWith("pbkdf2")
  );
}

function asPlain(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    return isHashedPassword(text) ? undefined : text;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return asPlain(row.password_plain ?? row.plain ?? row.value);
  }
  return undefined;
}

function isPlainPasswordKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalized === "passwordplain" ||
    normalized === "plainpassword" ||
    normalized === "temporarypassword" ||
    normalized === "generatedpassword" ||
    normalized === "rawpassword"
  );
}

/** Javobdan haqiqiy ochiq parolni oladi (`password_plain`). Hash qaytmaydi. */
export function pickPlainPassword(value: unknown, depth = 0): string | undefined {
  if (value == null || depth > 4) return undefined;
  if (Array.isArray(value) || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;

  const preferred = asPlain(
    row.password_plain ?? row.passwordPlain ?? row.plain_password ?? row.plainPassword
  );
  if (preferred) return preferred;

  for (const [key, nested] of Object.entries(row)) {
    if (isPlainPasswordKey(key)) {
      const found = asPlain(nested);
      if (found) return found;
    }
  }

  const fromPassword = asPlain(row.password);
  if (fromPassword) return fromPassword;

  for (const key of ["client", "user", "account", "profile", "item", "data", "attributes", "record"]) {
    const found = pickPlainPassword(row[key], depth + 1);
    if (found) return found;
  }
  return undefined;
}
