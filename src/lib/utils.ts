import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an amount stored in millimes (1 TND = 1000 millimes). */
export function formatTND(millimes: number, locale = "fr-TN") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "TND", minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(millimes / 1000);
}

export function formatNumber(value: number, locale = "fr-FR") {
  return new Intl.NumberFormat(locale).format(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
