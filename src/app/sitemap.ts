import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return ["", "/features", "/pricing", "/about", "/contact", "/legal/terms", "/legal/privacy", "/register", "/login"].map((p) => ({
    url: `${base}${p}`, changeFrequency: p === "" ? "weekly" : "monthly", priority: p === "" ? 1 : 0.6,
  }));
}
