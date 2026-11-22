export const locales = ["fr", "ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const LOCALE_COOKIE = "VAYRO_LOCALE";
export const rtlLocales: Locale[] = ["ar"];
export const localeNames: Record<Locale, string> = { fr: "Français", ar: "العربية", en: "English" };
export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (locales as readonly string[]).includes(v);
}
export function dirFor(locale: Locale) {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}
