import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requirePlatformAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Super admin", template: "%s · Super admin · VAYRO" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return (
    <div className="min-h-dvh">
      <AdminNav />
      <div className="lg:ps-[248px]"><main className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8">{children}</main></div>
    </div>
  );
}
