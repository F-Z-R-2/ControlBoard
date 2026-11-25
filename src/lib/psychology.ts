import { z } from "zod";
import { isStaff } from "./roles";
import { schoolDate, validAttendanceDate } from "./attendance";

export const psychologyCategories = { LEARNING: "Aprendizaje", COEXISTENCE: "Convivencia", EMOTIONAL: "Bienestar emocional", FAMILY: "Orientación familiar", OTHER: "Orientación general" } as const;
export const psychologyStatuses = { OPEN: "Por atender", FOLLOW_UP: "En seguimiento", CLOSED: "Cerrado" } as const;
export const appointmentStatuses = { SCHEDULED: "Programada", ATTENDED: "Atendida", CANCELLED: "Cancelada", NO_SHOW: "No asistió" } as const;

export function canAccessPsychology(role: string) {
  return isStaff(role) || role === "PSYCHOLOGIST";
}
export function canViewPsychologyMaterials(role: string) {
  return role === "STUDENT" || canAccessPsychology(role);
}
export function canManagePsychologyMaterials(role: string) {
  return canAccessPsychology(role);
}
export function canWritePsychologyNotes(user: { id: string; role: string }, psychologistId: string) {
  return user.role === "PSYCHOLOGIST" && user.id === psychologistId;
}
export function canManagePsychologyCase(user: { id: string; role: string }, psychologistId: string) {
  return isStaff(user.role) || canWritePsychologyNotes(user, psychologistId);
}
export function appointmentTime(local: string): Date | null {
  if (!/^20\d{2}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(local) || !validAttendanceDate(local.slice(0, 10))) return null;
  return new Date(`${local}:00-05:00`);
}
export function slotsOverlap(a: { startsAt: Date; endsAt: Date }, b: { startsAt: Date; endsAt: Date }) {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}
export const psychologyActionSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("open"), studentId: z.string().min(1), psychologistId: z.string().min(1), category: z.enum(["LEARNING", "COEXISTENCE", "EMOTIONAL", "FAMILY", "OTHER"]) }),
  z.object({ operation: z.literal("note"), caseId: z.string().min(1), attendedOn: z.string().refine(validAttendanceDate, "Fecha inválida").refine(day => day <= schoolDate(), "La atención no puede tener fecha futura"), body: z.string().trim().min(1, "Escribe la nota de atención").max(5000) }),
  z.object({ operation: z.literal("case-status"), caseId: z.string().min(1), status: z.enum(["OPEN", "FOLLOW_UP", "CLOSED"]), version: z.coerce.number().int().min(1) }),
  z.object({ operation: z.literal("schedule"), caseId: z.string().min(1), startsAt: z.string().refine(value => appointmentTime(value) !== null, "Fecha y hora inválidas"), minutes: z.enum(["30", "45", "60"]) }),
  z.object({ operation: z.literal("appointment-status"), caseId: z.string().min(1), appointmentId: z.string().min(1), status: z.enum(["ATTENDED", "CANCELLED", "NO_SHOW"]), version: z.coerce.number().int().min(1) }),
]);
