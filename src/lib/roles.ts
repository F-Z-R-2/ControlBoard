import type { Role } from "@/lib/db-types";

export function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isStaff(role: string) {
  return isAdmin(role) || role === "SECRETARY";
}

export function manageableRoles(role: string): Role[] {
  if (role === "SUPER_ADMIN") return ["STUDENT", "INSTRUCTOR", "PSYCHOLOGIST", "SECRETARY", "ADMIN", "SUPER_ADMIN"];
  if (role === "ADMIN") return ["STUDENT", "INSTRUCTOR", "PSYCHOLOGIST", "SECRETARY"];
  if (role === "SECRETARY") return ["STUDENT"];
  return [];
}

export function canManageUser(actor: { id: string; role: string }, target: { id: string; role: Role }) {
  return actor.id !== target.id && manageableRoles(actor.role).includes(target.role);
}
