/**
 * Display-only Rim raqami. Backend/DB qiymatini o'zgartirmaydi.
 * toRoman(1) → "I", toRoman(4) → "IV", toRoman(9) → "IX", toRoman(10) → "X"
 */
const ROMAN_MAP: Array<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(number: number): string {
  let n = Math.floor(Number(number));
  if (!Number.isFinite(n) || n <= 0) return "";
  let out = "";
  for (const [value, symbol] of ROMAN_MAP) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}
