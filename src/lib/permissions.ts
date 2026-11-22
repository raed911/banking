/** Permission catalogue — must stay in sync with private.default_role_permissions() in SQL. */
export const PERMISSIONS = [
  "dashboard.view",
  "programs.manage",
  "customers.view",
  "customers.manage",
  "customers.export",
  "cards.earn",
  "cards.adjust",
  "rewards.manage",
  "rewards.redeem",
  "coupons.manage",
  "coupons.redeem",
  "campaigns.manage",
  "analytics.view",
  "transactions.view",
  "employees.manage",
  "roles.manage",
  "locations.manage",
  "integrations.manage",
  "billing.manage",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS: { key: string; permissions: Permission[] }[] = [
  { key: "loyalty", permissions: ["programs.manage", "rewards.manage", "coupons.manage"] },
  { key: "counter", permissions: ["cards.earn", "rewards.redeem", "coupons.redeem", "cards.adjust"] },
  { key: "customers", permissions: ["customers.view", "customers.manage", "customers.export"] },
  { key: "insights", permissions: ["dashboard.view", "analytics.view", "transactions.view"] },
  { key: "marketing", permissions: ["campaigns.manage"] },
  { key: "admin", permissions: ["employees.manage", "roles.manage", "locations.manage", "integrations.manage", "settings.manage", "billing.manage"] },
];

export function can(granted: readonly string[] | null | undefined, perm: Permission) {
  return !!granted && (granted.includes("*") || granted.includes(perm));
}
