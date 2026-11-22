import { AccessBanner } from "@/components/dashboard/access-banner";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { getMemberships, isPlatformAdmin, requireMerchant } from "@/lib/auth/session";
import { accessState, getSubscription } from "@/lib/merchant";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, permissions } = await requireMerchant();
  const [memberships, admin, sub, profile] = await Promise.all([
    getMemberships(),
    isPlatformAdmin(),
    getSubscription(membership.merchant.id),
    (await createClient()).from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  const shell = {
    permissions,
    workspaces: memberships.map((m) => ({ id: m.merchant.id, name: m.merchant.name, role: m.role.name, color: m.merchant.brand_color })),
    activeId: membership.merchant.id,
    user: { name: profile.data?.full_name || user.email!.split("@")[0]!, email: user.email! },
    isAdmin: admin,
  };
  const access = accessState(membership.merchant.status, sub);
  return (
    <div className="min-h-dvh">
      <Sidebar {...shell} />
      <MobileNav {...shell} />
      <div className="lg:ps-[264px]">
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          <div className="mb-6 empty:hidden"><AccessBanner state={access.state} daysLeft={access.daysLeft} canBill={can(permissions, "billing.manage")} /></div>
          {children}
        </main>
      </div>
    </div>
  );
}
