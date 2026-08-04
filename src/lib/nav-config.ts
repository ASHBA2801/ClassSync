import type { Role } from "@prisma/client";

export type NavIconName =
  | "layout-dashboard"
  | "school"
  | "users"
  | "key"
  | "activity"
  | "user-check"
  | "graduation-cap"
  | "book-open"
  | "calendar-days"
  | "clipboard-check"
  | "file-text"
  | "dollar-sign"
  | "settings"
  | "calendar"
  | "clock"
  | "upload"
  | "credit-card";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

export const systemAdminNav: NavItem[] = [
  { href: "/system", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/system/schools", label: "Schools", icon: "school" },
  { href: "/system/users", label: "Global Users", icon: "users" },
  { href: "/system/ai-keys", label: "AI Keys", icon: "key" },
  { href: "/system/monitoring", label: "Monitoring", icon: "activity" },
];

export const schoolAdminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/admin/teachers", label: "Teachers", icon: "user-check" },
  { href: "/admin/students", label: "Students", icon: "graduation-cap" },
  { href: "/admin/classes", label: "Classes", icon: "book-open" },
  { href: "/admin/schedule/setup", label: "Timetable Setup", icon: "calendar-days" },
  { href: "/admin/schedule", label: "Schedule", icon: "calendar" },
  { href: "/admin/attendance", label: "Attendance", icon: "clipboard-check" },
  { href: "/admin/leave", label: "Leave Requests", icon: "file-text" },
  { href: "/admin/fees", label: "Fees", icon: "dollar-sign" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export const teacherNav: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/teacher/schedule", label: "Schedule", icon: "calendar" },
  { href: "/teacher/schedule/swaps", label: "Swaps", icon: "clock" },
  { href: "/teacher/attendance", label: "Mark Attendance", icon: "clipboard-check" },
  { href: "/teacher/leave", label: "Leave Requests", icon: "clock" },
];

export const parentNav: NavItem[] = [
  { href: "/parent", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/parent/documents", label: "Documents", icon: "upload" },
  { href: "/parent/leave", label: "Leave Requests", icon: "file-text" },
  { href: "/parent/fees", label: "Fees & Payments", icon: "credit-card" },
];

export function getNavForRole(role: Role): NavItem[] {
  switch (role) {
    case "SYSTEM_ADMIN":
      return systemAdminNav;
    case "SCHOOL_ADMIN":
      return schoolAdminNav;
    case "TEACHER":
      return teacherNav;
    case "PARENT":
      return parentNav;
    default:
      return [];
  }
}

export function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
