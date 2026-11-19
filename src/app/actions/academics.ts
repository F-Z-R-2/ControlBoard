"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { academicSchema, periodFitsYear, periodsOverlap } from "@/lib/academics";
import { isSerializationFailure, isUniqueViolation, newId, withTransaction } from "@/lib/db";
import type {
  AcademicPeriod,
  AcademicYear,
  Course,
  SchoolGrade,
  SchoolSection,
  User,
} from "@/lib/db-types";
import { requireStaff } from "@/lib/permissions";
import { isStaff } from "@/lib/roles";

class AcademicError extends Error {}

export async function saveAcademicAction(formData: FormData) {
  const current = await requireStaff();
  const values = Object.fromEntries(formData);
  const parsed = academicSchema.safeParse({ ...values, id: values.id || undefined });
  if (!parsed.success) redirect(`/academics?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  const data = parsed.data;
  let errorMessage: string | undefined;
  let selectedYear = "yearId" in data ? data.yearId : data.kind === "year" ? data.id : undefined;
  try {
    await withTransaction(async tx => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      if (!actor?.isActive || !isStaff(actor.role)) throw new AcademicError("No tienes permiso para gestionar la estructura académica");
      if (data.kind === "year") {
        const dates = { startsOn: new Date(`${data.startsOn}T00:00:00Z`), endsOn: new Date(`${data.endsOn}T00:00:00Z`) };
        if (data.id) {
          const years = await tx.sql<AcademicYear>`SELECT * FROM "AcademicYear" WHERE "id" = ${data.id} LIMIT 1`;
          const existing = years[0];
          if (!existing) throw new AcademicError("El año lectivo ya no existe");
          const periods = await tx.sql<AcademicPeriod>`SELECT * FROM "AcademicPeriod" WHERE "yearId" = ${data.id}`;
          if (periods.some(period => !periodFitsYear(period, dates))) throw new AcademicError("Las fechas dejarían periodos fuera del año lectivo");
          await tx.sql`
            UPDATE "AcademicYear"
            SET "name" = ${data.name}, "startsOn" = ${dates.startsOn}, "endsOn" = ${dates.endsOn}, "isClosed" = ${data.isClosed}
            WHERE "id" = ${data.id}
          `;
        } else {
          const created = await tx.sql<{ id: string }>`
            INSERT INTO "AcademicYear" ("id", "name", "startsOn", "endsOn", "isClosed")
            VALUES (${newId()}, ${data.name}, ${dates.startsOn}, ${dates.endsOn}, ${data.isClosed})
            RETURNING "id"
          `;
          selectedYear = created[0]!.id;
        }
      } else if (data.kind === "grade") {
        if (data.id) {
          const sections = await tx.sql<{ count: number }>`
            SELECT COUNT(*)::int AS "count"
            FROM "SchoolSection" ss JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
            WHERE ss."gradeId" = ${data.id} AND ay."isClosed" = TRUE
          `;
          if (sections[0]!.count) throw new AcademicError("Este grado tiene secciones en años cerrados y no puede modificarse");
          const updated = await tx.sql<{ id: string }>`
            UPDATE "SchoolGrade"
            SET "level" = ${data.level}, "name" = ${data.name}, "position" = ${data.position}
            WHERE "id" = ${data.id} RETURNING "id"
          `;
          if (!updated.length) throw new AcademicError("Alguno de los registros seleccionados ya no existe");
        } else {
          await tx.sql`
            INSERT INTO "SchoolGrade" ("id", "level", "name", "position")
            VALUES (${newId()}, ${data.level}, ${data.name}, ${data.position})
          `;
        }
      } else if (data.kind === "period" || data.kind === "section") {
        const years = await tx.sql<AcademicYear>`SELECT * FROM "AcademicYear" WHERE "id" = ${data.yearId} LIMIT 1`;
        const year = years[0];
        if (!year || year.isClosed) throw new AcademicError("Selecciona un año lectivo abierto");
        if (data.kind === "period") {
          const dates = { startsOn: new Date(`${data.startsOn}T00:00:00Z`), endsOn: new Date(`${data.endsOn}T00:00:00Z`) };
          if (!periodFitsYear(dates, year)) throw new AcademicError("El periodo debe estar dentro de las fechas del año lectivo");
          const periods = await tx.sql<AcademicPeriod>`SELECT * FROM "AcademicPeriod" WHERE "yearId" = ${year.id}`;
          if (data.id && !periods.some(period => period.id === data.id)) throw new AcademicError("No se puede trasladar un periodo a otro año");
          if (periods.some(period => period.id !== data.id && periodsOverlap(period, dates))) throw new AcademicError("El periodo se superpone con otro del mismo año");
          if (data.id) {
            await tx.sql`
              UPDATE "AcademicPeriod"
              SET "yearId" = ${year.id}, "name" = ${data.name}, "startsOn" = ${dates.startsOn}, "endsOn" = ${dates.endsOn}
              WHERE "id" = ${data.id}
            `;
          } else {
            await tx.sql`
              INSERT INTO "AcademicPeriod" ("id", "yearId", "name", "startsOn", "endsOn")
              VALUES (${newId()}, ${year.id}, ${data.name}, ${dates.startsOn}, ${dates.endsOn})
            `;
          }
        } else {
          const grades = await tx.sql<SchoolGrade>`SELECT * FROM "SchoolGrade" WHERE "id" = ${data.gradeId} LIMIT 1`;
          if (!grades[0]) throw new AcademicError("El grado no existe");
          if (data.id) {
            const sections = await tx.sql<SchoolSection>`SELECT * FROM "SchoolSection" WHERE "id" = ${data.id} LIMIT 1`;
            const section = sections[0];
            if (!section || section.yearId !== year.id || section.gradeId !== data.gradeId) throw new AcademicError("No se puede trasladar una sección a otro año o grado");
            await tx.sql`UPDATE "SchoolSection" SET "name" = ${data.name} WHERE "id" = ${data.id}`;
          } else {
            await tx.sql`
              INSERT INTO "SchoolSection" ("id", "name", "yearId", "gradeId")
              VALUES (${newId()}, ${data.name}, ${year.id}, ${data.gradeId})
            `;
          }
        }
      } else {
        const courseRows = await tx.sql<Course>`SELECT * FROM "Course" WHERE "id" = ${data.courseId} LIMIT 1`;
        const courseRow = courseRows[0];
        if (!courseRow) throw new AcademicError("El curso no existe");
        let section: (SchoolSection & { year: AcademicYear }) | null = null;
        if (courseRow.sectionId) {
          const sections = await tx.sql<SchoolSection & { year: AcademicYear }>`
            SELECT ss.*, to_jsonb(ay) AS "year"
            FROM "SchoolSection" ss JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
            WHERE ss."id" = ${courseRow.sectionId} LIMIT 1
          `;
          section = sections[0] ?? null;
        }
        let academicPeriod: (AcademicPeriod & { year: AcademicYear }) | null = null;
        if (courseRow.academicPeriodId) {
          const periods = await tx.sql<AcademicPeriod & { year: AcademicYear }>`
            SELECT ap.*, to_jsonb(ay) AS "year"
            FROM "AcademicPeriod" ap JOIN "AcademicYear" ay ON ay."id" = ap."yearId"
            WHERE ap."id" = ${courseRow.academicPeriodId} LIMIT 1
          `;
          academicPeriod = periods[0] ?? null;
        }
        const course = { ...courseRow, section, academicPeriod };
        if (course.section?.year.isClosed || course.academicPeriod?.year.isClosed) throw new AcademicError("Reabre el año lectivo para modificar la vinculación del curso");
        if (data.kind === "unlink") {
          selectedYear = course.section?.yearId;
          await tx.sql`
            UPDATE "Course" SET "sectionId" = NULL, "academicPeriodId" = NULL, "updatedAt" = NOW()
            WHERE "id" = ${course.id}
          `;
        } else {
          const sections = await tx.sql<SchoolSection & { year: AcademicYear }>`
            SELECT ss.*, to_jsonb(ay) AS "year"
            FROM "SchoolSection" ss JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
            WHERE ss."id" = ${data.sectionId} LIMIT 1
          `;
          const newSection = sections[0];
          const periods = await tx.sql<AcademicPeriod>`SELECT * FROM "AcademicPeriod" WHERE "id" = ${data.academicPeriodId} LIMIT 1`;
          const period = periods[0];
          if (!newSection || !period || newSection.yearId !== period.yearId || newSection.year.isClosed) throw new AcademicError("La sección y el periodo deben pertenecer al mismo año abierto");
          await tx.sql`
            UPDATE "Course" SET "sectionId" = ${newSection.id}, "academicPeriodId" = ${period.id}, "updatedAt" = NOW()
            WHERE "id" = ${course.id}
          `;
          selectedYear = newSection.yearId;
        }
      }
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (error instanceof AcademicError) errorMessage = error.message;
    else if (isUniqueViolation(error)) errorMessage = "Ya existe un registro con ese nombre en la misma estructura";
    else if ((error as { code?: string }).code === "23503") errorMessage = "Alguno de los registros seleccionados ya no existe";
    else if (isSerializationFailure(error)) errorMessage = "Otra persona modificó los datos. Revisa y vuelve a intentarlo";
    else throw error;
  }
  if (errorMessage) selectedYear = undefined;
  revalidatePath("/", "layout");

  redirect(`/academics?${selectedYear ? `year=${encodeURIComponent(selectedYear)}&` : ""}${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "success=Cambios+guardados"}`);
}
