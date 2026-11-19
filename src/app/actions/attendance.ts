"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { attendanceSchema, canRecordAttendance } from "@/lib/attendance";
import {
  isSerializationFailure,
  isUniqueViolation,
  newId,
  withTransaction,
} from "@/lib/db";
import type { Attendance, Course, User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";

class AttendanceError extends Error {}

function attendanceRedirectPath(courseId: string, day: string, formData: FormData) {
  const raw = formData.get("returnTo");
  const base = typeof raw === "string" && /^\/(?!\/)/.test(raw) ? raw : "/attendance";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}course=${encodeURIComponent(courseId)}&date=${day}`;
}

export async function saveAttendanceAction(formData: FormData) {
  const current = await requireUser();
  const parsed = attendanceSchema.safeParse(Object.fromEntries(formData));
  const fallback = typeof formData.get("returnTo") === "string" && /^\/(?!\/)/.test(String(formData.get("returnTo")))
    ? String(formData.get("returnTo")) : "/attendance";
  if (!parsed.success) {
    redirect(`${fallback}${fallback.includes("?") ? "&" : "?"}error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }
  const { courseId, studentId, date: day, status, note, version } = parsed.data;
  const date = new Date(`${day}T00:00:00.000Z`);
  const path = attendanceRedirectPath(courseId, day, formData);
  let errorMessage: string | undefined;
  try {
    await withTransaction(async tx => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      const courses = await tx.sql<Course>`SELECT * FROM "Course" WHERE "id" = ${courseId} LIMIT 1`;
      const course = courses[0];
      if (!actor?.isActive || !course || !canRecordAttendance(actor, course.instructorId)) {
        throw new AttendanceError("No tienes permiso para registrar asistencia en este curso");
      }
      const existingRows = await tx.sql<Attendance>`SELECT * FROM "Attendance" WHERE "courseId" = ${courseId} AND "studentId" = ${studentId} AND "date" = ${date} LIMIT 1`;
      const existing = existingRows[0];
      if ((existing?.version ?? 0) !== version) {
        throw new AttendanceError("El registro cambió. Revisa los datos actualizados antes de guardar");
      }
      if (!existing) {
        const enrollments = await tx.sql<{ id: string }>`
          SELECT e."id" FROM "Enrollment" e JOIN "User" u ON u."id" = e."userId"
          WHERE e."courseId" = ${courseId} AND e."userId" = ${studentId} AND e."role" = 'STUDENT'
            AND u."role" = 'STUDENT' AND u."isActive" = TRUE LIMIT 1
        `;
        if (!enrollments.length) throw new AttendanceError("El estudiante no tiene matrícula activa en este curso");
        await tx.sql`
          INSERT INTO "Attendance" ("id", "courseId", "studentId", "date", "status", "note", "recordedById", "updatedAt")
          VALUES (${newId()}, ${courseId}, ${studentId}, ${date}, ${status}, ${note}, ${actor.id}, NOW())
        `;
      } else {
        await tx.sql`
          UPDATE "Attendance"
          SET "status" = ${status}, "note" = ${note}, "recordedById" = ${actor.id}, "version" = "version" + 1, "updatedAt" = NOW()
          WHERE "id" = ${existing.id}
        `;
      }
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (error instanceof AttendanceError) errorMessage = error.message;
    else if (isUniqueViolation(error) || isSerializationFailure(error)) {
      errorMessage = "Otro usuario actualizó la asistencia. Revisa los datos y vuelve a guardar";
    } else throw error;
  }
  revalidatePath("/attendance");
  revalidatePath(`/courses/${courseId}/attendance`);
  redirect(`${path}&${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "success=Asistencia+guardada"}`);
}
