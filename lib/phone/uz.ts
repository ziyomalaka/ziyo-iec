export const UZ_PHONE_PREFIX = "+998";

export function uzLocalDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("998")) return digits.slice(3, 12);
  return digits.slice(0, 9);
}

export function formatUzLocalMask(value: string) {
  const digits = uzLocalDigits(value);
  const operator = digits.slice(0, 2);
  const a = digits.slice(2, 5);
  const b = digits.slice(5, 7);
  const c = digits.slice(7, 9);

  if (!digits) return "";
  if (digits.length <= 2) return `(${operator}`;
  if (digits.length <= 5) return `(${operator}) ${a}`;
  if (digits.length <= 7) return `(${operator}) ${a}-${b}`;
  return `(${operator}) ${a}-${b}-${c}`;
}

export function toUzApiPhone(value: string) {
  return `${UZ_PHONE_PREFIX}${uzLocalDigits(value)}`;
}

export function isCompleteUzPhone(value: string) {
  return uzLocalDigits(value).length === 9;
}
