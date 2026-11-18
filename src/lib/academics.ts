import { z } from "zod";
import { validAttendanceDate } from "./attendance";

export const schoolLevels = { INITIAL: "Inicial", PRIMARY: "Primaria", SECONDARY: "Secundaria" } as const;
const id = z.string().trim().min(1);
const name = z.string().trim().min(1, "Escribe un nombre").max(60);
const date = z.string().refine(validAttendanceDate, "Fecha inválida (2000–2099)");
const editingId = z.string().optional();

export const academicSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("year"), id: editingId, name, startsOn: date, endsOn: date, isClosed: z.enum(["true", "false"]).transform(value => value === "true") }),
  z.object({ kind: z.literal("period"), id: editingId, yearId: id, name, startsOn: date, endsOn: date }),
  z.object({ kind: z.literal("grade"), id: editingId, level: z.enum(["INITIAL", "PRIMARY", "SECONDARY"]), name, position: z.coerce.number().int().min(1).max(20) }),
  z.object({ kind: z.literal("section"), id: editingId, yearId: id, gradeId: id, name }),
  z.object({ kind: z.literal("assignment"), courseId: id, sectionId: id, academicPeriodId: id }),
  z.object({ kind: z.literal("unlink"), courseId: id }),
]).refine(data => !("startsOn" in data) || data.startsOn <= data.endsOn, "La fecha final debe ser igual o posterior a la inicial");

export function periodFitsYear(period: { startsOn: Date; endsOn: Date }, year: { startsOn: Date; endsOn: Date }) {
  return period.startsOn >= year.startsOn && period.endsOn <= year.endsOn;
}

export function periodsOverlap(a: { startsOn: Date; endsOn: Date }, b: { startsOn: Date; endsOn: Date }) {
  return a.startsOn <= b.endsOn && a.endsOn >= b.startsOn;
}
