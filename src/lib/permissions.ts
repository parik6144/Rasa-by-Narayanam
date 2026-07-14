/** Staff roles for /admin console (customers use role "customer"). */
export type StaffRole = "admin" | "manager" | "sales";
export type UserRole = StaffRole | "customer";

export type Permission =
  | "team.manage"
  | "catalog.write"
  | "catalog.read"
  | "leads.write"
  | "bookings.write"
  | "bookings.discount"
  | "customers.read"
  | "customers.ltv"
  | "chat.write"
  | "overview.finance"
  | "notifications.read"
  | "payments.manage"
  | "payments.approve"
  | "payments.read"
  | "offers.manage";

export type AdminTab =
  | "overview"
  | "catalog"
  | "leads"
  | "bookings"
  | "customers"
  | "chat"
  | "team"
  | "payments"
  | "offers";

export const STAFF_ROLES: StaffRole[] = ["admin", "manager", "sales"];

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  manager: "Manager",
  sales: "Sales Executive",
};

const ALL_PERMS: Permission[] = [
  "team.manage",
  "catalog.write",
  "catalog.read",
  "leads.write",
  "bookings.write",
  "bookings.discount",
  "customers.read",
  "customers.ltv",
  "chat.write",
  "overview.finance",
  "notifications.read",
  "payments.manage",
  "payments.approve",
  "payments.read",
  "offers.manage",
];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  admin: [...ALL_PERMS],
  manager: [
    "catalog.write",
    "catalog.read",
    "leads.write",
    "bookings.write",
    "bookings.discount",
    "customers.read",
    "customers.ltv",
    "chat.write",
    "overview.finance",
    "notifications.read",
    "payments.approve",
    "payments.read",
    "offers.manage",
  ],
  sales: [
    "leads.write",
    "bookings.write",
    "customers.read",
    "chat.write",
    "notifications.read",
    "payments.read",
    "offers.manage",
  ],
};

/** Tabs each role may open in the admin sidebar. */
export const ROLE_TABS: Record<StaffRole, AdminTab[]> = {
  admin: ["overview", "catalog", "leads", "bookings", "customers", "chat", "team", "payments", "offers"],
  manager: ["overview", "catalog", "leads", "bookings", "customers", "chat", "payments", "offers"],
  sales: ["overview", "leads", "bookings", "customers", "chat", "payments", "offers"],
};

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "admin" || role === "manager" || role === "sales";
}

export function hasPermission(role: string | null | undefined, perm: Permission): boolean {
  if (!isStaffRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(perm);
}

export function canAccessTab(role: string | null | undefined, tab: AdminTab): boolean {
  if (!isStaffRole(role)) return false;
  return ROLE_TABS[role].includes(tab);
}

export function staffRoleOptions(): { value: StaffRole; label: string }[] {
  return STAFF_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));
}
