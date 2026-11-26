const ARABIC_INDIC_DIGITS = /[٠-٩]/g;
const STRIP_CHARS = /[\s-]/g;
const EGYPTIAN_MOBILE_REGEX = /^01[0125]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(raw: string): string {
  const withWesternDigits = raw.replace(ARABIC_INDIC_DIGITS, (digit) =>
    String(digit.charCodeAt(0) - 0x0660),
  );
  return withWesternDigits.replace(STRIP_CHARS, "");
}

export function isValidPhone(raw: string): boolean {
  const normalized = normalizePhone(raw);
  return EGYPTIAN_MOBILE_REGEX.test(normalized);
}

export function normalizeName(raw: string): string {
  return raw.trim();
}

export function isValidName(raw: string): boolean {
  const trimmed = normalizeName(raw);
  return trimmed.length >= 3 && trimmed.length <= 60;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const normalized = normalizeEmail(raw);
  return EMAIL_REGEX.test(normalized);
}

export function isValidPassword(raw: string): boolean {
  return raw.length >= 8;
}

export function isValidObjectId(raw: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(raw);
}
