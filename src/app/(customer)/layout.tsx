import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ink-50">{children}</div>;
}
