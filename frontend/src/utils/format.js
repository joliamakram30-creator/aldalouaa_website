// Egyptian mobile number: accepts Arabic digits, spaces, +20 / 0020 prefix -> "01XXXXXXXXX" or null
export function normalizeEgyptPhone(value) {
  let digits = String(value || "")
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// S, M, L ... in a sensible order (not alphabetical); numeric sizes ascending; anything else last.
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "FREE SIZE"];
export function sortSizes(sizes) {
  const rank = (name) => {
    const index = SIZE_ORDER.indexOf(String(name).trim().toUpperCase());
    if (index !== -1) return [0, index, ""];
    const number = parseFloat(name);
    if (!Number.isNaN(number)) return [1, number, ""];
    return [2, 0, String(name)];
  };
  return [...sizes].sort((a, b) => {
    const [ga, na, sa] = rank(a);
    const [gb, nb, sb] = rank(b);
    return ga - gb || na - nb || sa.localeCompare(sb);
  });
}
