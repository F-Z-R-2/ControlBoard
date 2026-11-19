"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  isSerializationFailure,
  isUniqueViolation,
  newId,
  withTransaction,
} from "@/lib/db";
import type { PsychologyAppointment, PsychologyCase, User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";
import { appointmentTime, canAccessPsychology, canManagePsychologyCase, canWritePsychologyNotes, psychologyActionSchema } from "@/lib/psychology";

class PsychologyError extends Error {}

export async function psychologyAction(formData: FormData) {
  const current = await requireUser();
  if (!canAccessPsychology(current.role)) redirect("/dashboard");
  const parsed = psychologyActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/psychology?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  const data = parsed.data;
  let caseId = "caseId" in data ? data.caseId : "";
  let errorMessage: string | undefined;
  try {
    await withTransaction(async tx => {
      const users = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const user = users[0];
      if (!user?.isActive || !canAccessPsychology(user.role)) throw new PsychologyError("No tienes acceso al módulo");
      if (data.operation === "open") {
        if (user.role === "PSYCHOLOGIST" && data.psychologistId !== user.id) throw new PsychologyError("Solo puedes abrir fichas asignadas a ti");
        const students = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${data.studentId} LIMIT 1`;
        const student = students[0];
        const professionals = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${data.psychologistId} LIMIT 1`;
        const professional = professionals[0];
        if (!student?.isActive || student.role !== "STUDENT" || !professional?.isActive || professional.role !== "PSYCHOLOGIST") throw new PsychologyError("Selecciona un estudiante y un profesional activos");
        const existing = await tx.sql<{ id: string }>`SELECT "id" FROM "PsychologyCase" WHERE "studentId" = ${student.id} LIMIT 1`;
        if (existing.length) throw new PsychologyError("El estudiante ya tiene una ficha. Solicita al profesional responsable que la revise o reabra");
        const created = await tx.sql<{ id: string }>`
          INSERT INTO "PsychologyCase" ("id", "studentId", "psychologistId", "openedById", "category", "updatedAt")
          VALUES (${newId()}, ${student.id}, ${professional.id}, ${user.id}, ${data.category}, NOW())
          RETURNING "id"
        `;
        caseId = created[0]!.id;
        return;
      }
      const records = await tx.sql<PsychologyCase & { psychologist: Pick<User, "role" | "isActive">; student: Pick<User, "isActive"> }>`
        SELECT pc.*, to_jsonb(pu) AS "psychologist", to_jsonb(su) AS "student"
        FROM "PsychologyCase" pc
        JOIN "User" pu ON pu."id" = pc."psychologistId"
        JOIN "User" su ON su."id" = pc."studentId"
        WHERE pc."id" = ${data.caseId} LIMIT 1
      `;
      const record = records[0];
      if (!record || !canManagePsychologyCase(user, record.psychologistId)) throw new PsychologyError("Ficha no disponible");
      const clinical = canWritePsychologyNotes(user, record.psychologistId);
      if (data.operation === "note") {
        if (!clinical) throw new PsychologyError("Solo el profesional asignado puede registrar notas de atención");
        await tx.sql`
          INSERT INTO "PsychologyNote" ("id", "caseId", "authorId", "attendedOn", "body")
          VALUES (${newId()}, ${record.id}, ${user.id}, ${new Date(`${data.attendedOn}T00:00:00Z`)}, ${data.body})
        `;
      } else if (data.operation === "case-status") {
        if (!clinical) throw new PsychologyError("Solo el profesional asignado puede cerrar o reabrir una ficha");
        if (record.version !== data.version) throw new PsychologyError("La ficha cambió. Revisa su estado actual");
        await tx.sql`
          UPDATE "PsychologyCase"
          SET "status" = ${data.status}, "version" = "version" + 1, "updatedAt" = NOW()
          WHERE "id" = ${record.id}
        `;
        if (data.status === "CLOSED") {
          await tx.sql`
            UPDATE "PsychologyAppointment"
            SET "status" = 'CANCELLED', "version" = "version" + 1
            WHERE "caseId" = ${record.id} AND "status" = 'SCHEDULED' AND "startsAt" > ${new Date()}
          `;
        }
      } else if (data.operation === "schedule") {
        if (record.status === "CLOSED") throw new PsychologyError("Reabre la ficha antes de programar una cita");
        if (!record.student.isActive || !record.psychologist.isActive || record.psychologist.role !== "PSYCHOLOGIST") throw new PsychologyError("El estudiante y el profesional deben estar activos");
        const startsAt = appointmentTime(data.startsAt)!;
        const endsAt = new Date(startsAt.getTime() + Number(data.minutes) * 60000);
        if (startsAt <= new Date()) throw new PsychologyError("La cita debe estar en el futuro");
        const conflicts = await tx.sql<{ id: string }>`
          SELECT a."id" FROM "PsychologyAppointment" a
          JOIN "PsychologyCase" c ON c."id" = a."caseId"
          WHERE a."status" = 'SCHEDULED' AND a."startsAt" < ${endsAt} AND a."endsAt" > ${startsAt}
            AND (c."psychologistId" = ${record.psychologistId} OR c."studentId" = ${record.studentId})
          LIMIT 1
        `;
        if (conflicts.length) throw new PsychologyError("El profesional o estudiante ya tiene una cita en ese horario");
        await tx.sql`
          INSERT INTO "PsychologyAppointment" ("id", "caseId", "startsAt", "endsAt")
          VALUES (${newId()}, ${record.id}, ${startsAt}, ${endsAt})
        `;
      } else {
        if (data.status !== "CANCELLED" && !clinical) throw new PsychologyError("Solo el profesional asignado puede confirmar la atención o inasistencia");
        const appointments = await tx.sql<PsychologyAppointment>`SELECT * FROM "PsychologyAppointment" WHERE "id" = ${data.appointmentId} AND "caseId" = ${record.id} LIMIT 1`;
        const appointment = appointments[0];
        if (!appointment || appointment.version !== data.version || appointment.status !== "SCHEDULED") throw new PsychologyError("La cita ya cambió de estado. Actualiza la página");
        if (data.status !== "CANCELLED" && appointment.startsAt > new Date()) throw new PsychologyError("Espera hasta la hora de la cita para registrar su resultado");
        await tx.sql`
          UPDATE "PsychologyAppointment"
          SET "status" = ${data.status}, "version" = "version" + 1
          WHERE "id" = ${appointment.id}
        `;
      }
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (error instanceof PsychologyError) errorMessage = error.message;
    else if (isUniqueViolation(error) || isSerializationFailure(error)) errorMessage = "Otra persona modificó estos datos. Actualiza y vuelve a intentarlo";
    else throw error;
  }
  revalidatePath("/psychology", "layout");
  if (caseId) revalidatePath(`/psychology/${caseId}`);
  // Do not place private note text in redirects or diagnostic messages.
  const path = errorMessage ? "/psychology" : caseId ? `/psychology/${encodeURIComponent(caseId)}` : "/psychology";
  redirect(`${path}?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "success=Datos+guardados"}`);
}
