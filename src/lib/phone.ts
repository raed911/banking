/**
 * Normalizes a phone number to E.164. Numbers without a country code are treated as Tunisian (+216, 8 digits).
 * Returns null when the number is not plausible.
 */
export function normalizePhone(input: string, defaultCountry = "216"): string | null {
  const cleaned = input.replace(/[\s().-]/g, "");
  let digits: string;
  if (cleaned.startsWith("+")) digits = cleaned.slice(1);
  else if (cleaned.startsWith("00")) digits = cleaned.slice(2);
  else if (defaultCountry === "216" && /^[2-9]\d{7}$/.test(cleaned)) digits = `216${cleaned}`;
  else digits = cleaned;
  if (!/^[1-9]\d{6,14}$/.test(digits)) return null;
  if (digits.startsWith("216") && !/^216[2-9]\d{7}$/.test(digits)) return null;
  return `+${digits}`;
}
