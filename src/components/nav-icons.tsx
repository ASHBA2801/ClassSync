"use client";

import {
  LayoutDashboard,
  School,
  Users,
  Activity,
  GraduationCap,
  UserCheck,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  DollarSign,
  Settings,
  Calendar,
  Clock,
  Upload,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "@/lib/nav-config";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  school: School,
  users: Users,
  activity: Activity,
  "user-check": UserCheck,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  "calendar-days": CalendarDays,
  "clipboard-check": ClipboardCheck,
  "file-text": FileText,
  "dollar-sign": DollarSign,
  settings: Settings,
  calendar: Calendar,
  clock: Clock,
  upload: Upload,
  "credit-card": CreditCard,
};

export function getNavIcon(name: NavIconName): LucideIcon {
  return NAV_ICONS[name];
}
