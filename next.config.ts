import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host; } catch { return "*.supabase.co"; } })();
const isDev = process.env.NODE_ENV !== "production";
// Next.js App Router needs inline scripts for hydration; everything else is locked to known origins.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://maps.googleapis.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://${supabaseHost} https://tile.openstreetmap.org https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://nominatim.openstreetmap.org https://maps.googleapis.com https://*.googleapis.com`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
