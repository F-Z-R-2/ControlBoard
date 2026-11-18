import { z } from "zod";
import { isStaff } from "./roles";

export const attendanceLabels = {
  PRESENT: "Presente",
  ABSENT: "Falta",
  LATE: "Tardanza",
  EXCUSED: "Justificada",
} as const;

export function attendancePercentage(counts: Record<keyof typeof attendanceLabels, number>) {
  const eligible = counts.PRESENT + counts.LATE + counts.ABSENT;
  return eligible === 0 ? null : Math.round(((counts.PRESENT + counts.LATE * 0.5) / eligible) * 100);
}

export function schoolDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function validAttendanceDate(value: string) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function canRecordAttendance(user: { id: string; role: string }, instructorId: string) {
  return isStaff(user.role) || (user.role === "INSTRUCTOR" && user.id === instructorId);
}

export const attendanceSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
  date: z.string().refine(validAttendanceDate, "Fecha inválida")
    .refine(value => value <= schoolDate(), "No se puede registrar asistencia futura"),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  note: z.string().trim().max(500, "La observación admite hasta 500 caracteres"),
  version: z.coerce.number().int().min(0).max(2147483646),
});
