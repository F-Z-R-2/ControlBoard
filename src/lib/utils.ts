import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "Sin fecha";
  return format(new Date(date), "d MMM yyyy", { locale: es });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "Sin fecha";
  return format(new Date(date), "d MMM yyyy, HH:mm", { locale: es });
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "Sin fecha";
  return format(new Date(date), "EEEE d 'de' MMMM, HH:mm", { locale: es });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    INSTRUCTOR: "Profesor",
    STUDENT: "Estudiante",
    TA: "Asistente",
  };
  return labels[role] ?? role;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
