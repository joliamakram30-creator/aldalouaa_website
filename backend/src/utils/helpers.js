// ======================================
// Small shared helpers (validation, parsing, money)
// ======================================

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

// "٠١٠٢٣..." -> "01023..."
const normalizeDigits = (value) =>
  String(value ?? "").replace(/[٠-٩۰-۹]/g, (ch) => {
    const arabicIndex = ARABIC_DIGITS.indexOf(ch);
    if (arabicIndex !== -1) return String(arabicIndex);
    return String(PERSIAN_DIGITS.indexOf(ch));
  });

// Egyptian mobile numbers: 010 / 011 / 012 / 015 + 8 digits.
// Accepts +20 / 0020 / 20 prefixes and spaces/dashes, returns "01XXXXXXXXX" or null.
const normalizeEgyptPhone = (value) => {
  let digits = normalizeDigits(value).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
};

const isValidEmail = (value) =>
  typeof value === "string" &&
  value.length <= 190 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

// Multipart forms send arrays as JSON strings ("[1,2]") or comma lists.
const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const parseIdList = (value) => [
  ...new Set(parseArray(value).map(Number).filter((n) => Number.isInteger(n) && n > 0)),
];

const cleanText = (value, max = 191) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
};

// ---- money (avoid 0.1 + 0.2 float drift; prices have 2 decimals) ----
const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (cents) => Math.round(cents) / 100;

const toId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

module.exports = {
  normalizeDigits,
  normalizeEgyptPhone,
  isValidEmail,
  slugify,
  parseBoolean,
  parseArray,
  parseIdList,
  cleanText,
  toCents,
  fromCents,
  toId,
};
