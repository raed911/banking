import { BarChart3, Bell, Building2, CreditCard, Gift, LayoutGrid, MapPin, Megaphone, Plug, Receipt, ScanLine, Settings, ShieldCheck, Ticket, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type NavItem = { key: string; href: string; icon: LucideIcon; perm?: Permission };
export type NavGroup = { key: string | null; items: NavItem[] };

export const NAV: NavGroup[] = [
  { key: null, items: [{ key: "overview", href: "/dashboard", icon: LayoutGrid, perm: "dashboard.view" }] },
  {
    key: "groupLoyalty",
    items: [
      { key: "programs", href: "/dashboard/programs", icon: CreditCard },
      { key: "customers", href: "/dashboard/customers", icon: Users, perm: "customers.view" },
      { key: "rewards", href: "/dashboard/rewards", icon: Gift },
      { key: "coupons", href: "/dashboard/coupons", icon: Ticket },
      { key: "transactions", href: "/dashboard/transactions", icon: Receipt, perm: "transactions.view" },
    ],
  },
  {
    key: "groupGrowth",
    items: [
      { key: "campaigns", href: "/dashboard/campaigns", icon: Megaphone, perm: "campaigns.manage" },
      { key: "notifications", href: "/dashboard/notifications", icon: Bell },
      { key: "analytics", href: "/dashboard/analytics", icon: BarChart3, perm: "analytics.view" },
    ],
  },
  {
    key: "groupBusiness",
    items: [
      { key: "employees", href: "/dashboard/employees", icon: UsersRound, perm: "employees.manage" },
      { key: "roles", href: "/dashboard/roles", icon: ShieldCheck, perm: "roles.manage" },
      { key: "locations", href: "/dashboard/locations", icon: MapPin },
      { key: "integrations", href: "/dashboard/integrations", icon: Plug, perm: "integrations.manage" },
      { key: "billing", href: "/dashboard/billing", icon: Building2, perm: "billing.manage" },
      { key: "settings", href: "/dashboard/settings", icon: Settings, perm: "settings.manage" },
    ],
  },
];

export const SCAN_ITEM: NavItem = { key: "scanner", href: "/scan", icon: ScanLine, perm: "cards.earn" };

export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}
