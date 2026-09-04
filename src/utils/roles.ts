import { UserRole } from "../types";

export const ADMIN_ROLES = ["owner", "admin"] as const;
export const STAFF_ROLES = ["owner", "admin", "staff", "employee"] as const;

export function normalizeRole(role?: string | null): UserRole {
  const value = String(role || "customer").toLowerCase();
  if (value === "admin" || value === "owner") return "owner";
  if (value === "employee" || value === "staff") return "staff";
  return "customer";
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === "owner";
}

export function isStaffRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "owner" || normalized === "staff";
}

export function roleLabel(role?: string | null, language: "ar" | "en" = "ar") {
  const normalized = normalizeRole(role);
  if (normalized === "owner") return language === "ar" ? "مدير" : "Admin";
  if (normalized === "staff") return language === "ar" ? "موظف" : "Employee";
  return language === "ar" ? "عميل" : "Customer";
}

export function toStoredRole(role: string): UserRole {
  return normalizeRole(role);
}
