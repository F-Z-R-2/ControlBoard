"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  isSerializationFailure,
  isUniqueViolation,
  jsonb,
  newId,
  withTransaction,
} from "@/lib/db";
import type {
  AcademicPeriod,
  AcademicYear,
  Course,
  GradingScale,
  PeriodGrade,
  SchoolGrade,
  SchoolSection,
  User,
} from "@/lib/db-types";
import { readScaleForm, scaleSchema, validGrade } from "@/lib/grading";
import { requireStaff, requireUser } from "@/lib/permissions";
import { isAdmin, isStaff } from "@/lib/roles";

class GradingError extends Error {}
function errorMessage(error: unknown) {
  if (error instanceof GradingError) return error.message;
  if (isUniqueViolation(error) || isSerializationFailure(error)) return "Los datos cambiaron mientras editabas. Revisa los valores y vuelve a guardar";
  throw error;
}

export async function saveGradingScaleAction(formData: FormData) {
  const current = await requireStaff();
  const fields = z.object({ yearId: z.string().min(1), level: z.enum(["INITIAL", "PRIMARY", "SECONDARY"]), version: z.coerce.number().int().min(0) }).safeParse(Object.fromEntries(formData));
  const config = readScaleForm(Object.fromEntries(formData));
  if (!fields.success || !config.success) redirect(`/grading-settings?error=${encodeURIComponent(!config.success ? config.error.issues[0]?.message ?? "Escala inválida" : "Datos inválidos")}`);
  const { yearId, level, version } = fields.data;
  let error: string | undefined;
  try {
    await withTransaction(async tx => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      if (!actor?.isActive || !isStaff(actor.role)) throw new GradingError("No tienes permiso para configurar notas");
      const years = await tx.sql<AcademicYear>`SELECT * FROM "AcademicYear" WHERE "id" = ${yearId} LIMIT 1`;
      const year = years[0];
      if (!year || year.isClosed) throw new GradingError("Selecciona un año lectivo abierto");
      const scales = await tx.sql<GradingScale>`SELECT * FROM "GradingScale" WHERE "yearId" = ${yearId} AND "level" = ${level} LIMIT 1`;
      const existing = scales[0];
      if ((existing?.version ?? 0) !== version) throw new GradingError("La configuración cambió. Revisa la escala actual antes de guardar");
      if (existing) {
        await tx.sql`
          UPDATE "GradingScale"
          SET "config" = ${jsonb(config.data)}::jsonb, "version" = "version" + 1
          WHERE "id" = ${existing.id}
        `;
      } else {
        await tx.sql`
          INSERT INTO "GradingScale" ("id", "yearId", "level", "config")
          VALUES (${newId()}, ${yearId}, ${level}, ${jsonb(config.data)}::jsonb)
        `;
      }
    }, { isolationLevel: "serializable" });
  } catch (caught) { error = errorMessage(caught); }
  revalidatePath("/", "layout");
  redirect(`/grading-settings?year=${encodeURIComponent(yearId)}&${error ? `error=${encodeURIComponent(error)}` : "success=Escala+guardada"}`);
}

export async function savePeriodGradeAction(formData: FormData) {
  const current = await requireUser();
  const parsed = z.object({
    courseId: z.string().min(1), periodId: z.string().min(1), studentId: z.string().min(1),
    value: z.string().trim().min(1).max(30), comment: z.string().trim().max(1000),
    version: z.coerce.number().int().min(0), scaleVersion: z.coerce.number().int().min(1), scaleId: z.string().min(1),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/courses?error=Calificación+inválida");
  const { courseId, periodId, studentId, value, comment, version, scaleVersion, scaleId } = parsed.data;
  let error: string | undefined;
  try {
    await withTransaction(async tx => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      const courseRows = await tx.sql<Course>`SELECT * FROM "Course" WHERE "id" = ${courseId} LIMIT 1`;
      const courseRow = courseRows[0];
      if (!actor?.isActive || !courseRow || !(isAdmin(actor.role) || (actor.role === "INSTRUCTOR" && courseRow.instructorId === actor.id))) throw new GradingError("Solo el docente asignado o un administrador puede registrar notas");
      let section: (SchoolSection & { grade: SchoolGrade; year: AcademicYear }) | null = null;
      if (courseRow.sectionId) {
        const sections = await tx.sql<SchoolSection & { grade: SchoolGrade; year: AcademicYear }>`
          SELECT ss.*, to_jsonb(sg) AS "grade", to_jsonb(ay) AS "year"
          FROM "SchoolSection" ss
          JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
          JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
          WHERE ss."id" = ${courseRow.sectionId} LIMIT 1
        `;
        section = sections[0] ?? null;
      }
      let academicPeriod: AcademicPeriod | null = null;
      if (courseRow.academicPeriodId) {
        const periods = await tx.sql<AcademicPeriod>`SELECT * FROM "AcademicPeriod" WHERE "id" = ${courseRow.academicPeriodId} LIMIT 1`;
        academicPeriod = periods[0] ?? null;
      }
      const course = { ...courseRow, section, academicPeriod };
      if (!course.section || !course.academicPeriod || course.academicPeriodId !== periodId || course.section.yearId !== course.academicPeriod.yearId || course.section.year.isClosed) throw new GradingError("El curso debe tener sección y periodo de un año abierto");
      const scales = await tx.sql<GradingScale>`SELECT * FROM "GradingScale" WHERE "yearId" = ${course.section.yearId} AND "level" = ${course.section.grade.level} LIMIT 1`;
      const scale = scales[0];
      if (!scale || scale.id !== scaleId || scale.version !== scaleVersion) throw new GradingError("La escala cambió. Revisa la configuración actual antes de guardar");
      const config = scaleSchema.parse(scale.config);
      if (!validGrade(value, config)) throw new GradingError("La nota no corresponde a la escala o a sus decimales permitidos");
      const enrollments = await tx.sql<{ id: string }>`
        SELECT e."id" FROM "Enrollment" e JOIN "User" u ON u."id" = e."userId"
        WHERE e."courseId" = ${courseId} AND e."userId" = ${studentId} AND e."role" = 'STUDENT'
          AND u."role" = 'STUDENT' AND u."isActive" = TRUE LIMIT 1
      `;
      if (!enrollments.length) throw new GradingError("El estudiante no tiene matrícula activa");
      const existingRows = await tx.sql<PeriodGrade>`SELECT * FROM "PeriodGrade" WHERE "courseId" = ${courseId} AND "periodId" = ${periodId} AND "studentId" = ${studentId} LIMIT 1`;
      const existing = existingRows[0];
      if ((existing?.version ?? 0) !== version) throw new GradingError("La nota cambió. Revisa el valor actualizado antes de guardar");
      if (existing) {
        await tx.sql`
          UPDATE "PeriodGrade"
          SET "value" = ${value}, "comment" = ${comment}, "scaleSnapshot" = ${jsonb(config)}::jsonb,
              "recordedById" = ${actor.id}, "version" = "version" + 1, "updatedAt" = NOW()
          WHERE "id" = ${existing.id}
        `;
      } else {
        await tx.sql`
          INSERT INTO "PeriodGrade" ("id", "courseId", "periodId", "studentId", "value", "scaleSnapshot", "comment", "recordedById", "updatedAt")
          VALUES (${newId()}, ${courseId}, ${periodId}, ${studentId}, ${value}, ${jsonb(config)}::jsonb, ${comment}, ${actor.id}, NOW())
        `;
      }
    }, { isolationLevel: "serializable" });
  } catch (caught) { error = errorMessage(caught); }
  revalidatePath(`/courses/${courseId}/period-grades`);
  redirect(`/courses/${encodeURIComponent(courseId)}/period-grades?${error ? `error=${encodeURIComponent(error)}` : "success=Nota+guardada"}`);
}
