"use server";

import { isAdmin as isAdministrator } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, isSerializationFailure, isUniqueViolation, newId, withTransaction } from "@/lib/db";
import type { Course, User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";

export async function getSectionStudentsAction(sectionId: string) {
  const user = await requireUser();
  if (!isAdministrator(user.role)) throw new Error("No tienes permiso para consultar estudiantes");
  if (!sectionId || sectionId.length > 100) return [];
  return db.query<{ id: string; name: string; email: string }>(
    `SELECT u."id", u."name", u."email"
     FROM "User" u
     JOIN "StudentProfile" sp ON sp."userId" = u."id"
     JOIN "SchoolSection" ss ON ss."id" = sp."schoolSectionId"
     JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
     JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
     WHERE ss."id" = $1 AND ay."isClosed" = FALSE
       AND sg."level" IN ('PRIMARY', 'SECONDARY') AND ss."name" IN ('A', 'B')
       AND u."role" = 'STUDENT' AND u."isActive" = TRUE
     ORDER BY u."name" ASC`,
    [sectionId],
  );
}

const courseSchema = z.object({
  title: z.string().trim().min(3, "Escribe el nombre del curso").max(120),
  term: z.string().trim().max(40).optional(),
  description: z.string().trim().max(1000).optional(),
  instructorId: z.string().trim().optional(),
  academicPeriodId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  includeSectionStudents: z.boolean(),
  studentIds: z.array(z.string().min(1)).max(500),
});

function fail(message: string): never {
  redirect(`/courses?error=${encodeURIComponent(message)}`);
}

function courseCodePart(value: string, fallback: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

export async function createCourseAction(formData: FormData) {
  const current = await requireUser();
  if (current.role !== "INSTRUCTOR" && !isAdministrator(current.role)) {
    fail("Solo docentes y administradores pueden crear cursos");
  }

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    term: formData.get("term") || undefined,
    description: formData.get("description") || undefined,
    instructorId: formData.get("instructorId") || undefined,
    academicPeriodId: formData.get("academicPeriodId") || undefined,
    sectionId: formData.get("sectionId") || undefined,
    includeSectionStudents: formData.get("includeSectionStudents") === "true",
    studentIds: formData.getAll("studentIds").filter((value): value is string => typeof value === "string"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const isAdmin = isAdministrator(current.role);
  if (isAdmin && (!parsed.data.academicPeriodId || !parsed.data.sectionId)) {
    fail("Selecciona un periodo académico y una sección configurados");
  }
  if (!isAdmin && !parsed.data.term) fail("Indica el periodo del curso");

  let courseId = "";
  try {
    await withTransaction(async (tx) => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      if (!actor?.isActive || (actor.role !== "INSTRUCTOR" && !isAdministrator(actor.role))) {
        throw new Error("Tu cuenta ya no tiene permiso para crear cursos");
      }

      let instructorId = actor.id;
      let term = parsed.data.term ?? "";
      let codeBase: string;
      let sectionId: string | null = null;
      let academicPeriodId: string | null = null;
      if (isAdministrator(actor.role)) {
        const teachers = await tx.sql<{ id: string }>`
          SELECT "id" FROM "User" WHERE "id" = ${parsed.data.instructorId ?? ""}
            AND "role" = 'INSTRUCTOR' AND "isActive" = TRUE LIMIT 1
        `;
        if (!teachers.length) throw new Error("Selecciona un docente activo");

        const academicRows = await tx.sql<{
          periodId: string;
          periodName: string;
          periodYearId: string;
          yearName: string;
          yearClosed: boolean;
          sectionId: string;
          sectionYearId: string;
          sectionName: string;
          gradeName: string;
        }>`
          SELECT ap."id" AS "periodId", ap."name" AS "periodName", ay."id" AS "periodYearId",
            ay."name" AS "yearName", ay."isClosed" AS "yearClosed", ss."id" AS "sectionId",
            ss."yearId" AS "sectionYearId", ss."name" AS "sectionName", sg."name" AS "gradeName"
          FROM "AcademicPeriod" ap
          JOIN "AcademicYear" ay ON ay."id" = ap."yearId"
          JOIN "SchoolSection" ss ON ss."id" = ${parsed.data.sectionId ?? ""}
          JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
          WHERE ap."id" = ${parsed.data.academicPeriodId ?? ""} AND ay."isClosed" = FALSE
            AND sg."level" IN ('PRIMARY', 'SECONDARY') AND ss."name" IN ('A', 'B')
          LIMIT 1
        `;
        const academic = academicRows[0];
        if (!academic || academic.periodYearId !== academic.sectionYearId || academic.yearClosed) {
          throw new Error("El periodo y la sección deben pertenecer al mismo año lectivo abierto");
        }
        instructorId = teachers[0]!.id;
        sectionId = academic.sectionId;
        academicPeriodId = academic.periodId;
        term = `${academic.yearName} · ${academic.periodName}`.slice(0, 40);
        codeBase = `${courseCodePart(parsed.data.title, "CURSO").slice(0, 7)}-${courseCodePart(academic.yearName, "YEAR").slice(-4)}-${courseCodePart(academic.gradeName, "GRADO").slice(0, 4)}${courseCodePart(academic.sectionName, "A").slice(0, 1)}`.slice(0, 20);
      } else {
        codeBase = `${courseCodePart(parsed.data.title, "CURSO").slice(0, 9)}-${courseCodePart(term, "PERIODO").slice(0, 8)}`.slice(0, 20);
      }

      const existingCodes = await tx.sql<{ code: string }>`SELECT "code" FROM "Course" WHERE "code" LIKE ${`${codeBase}%`}`;
      const usedCodes = new Set(existingCodes.map((row) => row.code));
      let code = codeBase;
      let suffix = 2;
      while (usedCodes.has(code)) {
        const suffixText = `-${suffix}`;
        code = `${codeBase.slice(0, 20 - suffixText.length)}${suffixText}`;
        suffix += 1;
      }

      const inserted = await tx.sql<{ id: string }>`
        INSERT INTO "Course" ("id", "code", "title", "term", "description", "instructorId", "sectionId", "academicPeriodId", "updatedAt")
        VALUES (${newId()}, ${code}, ${parsed.data.title}, ${term}, ${parsed.data.description ?? ""}, ${instructorId}, ${sectionId}, ${academicPeriodId}, NOW())
        RETURNING "id"
      `;
      courseId = inserted[0]!.id;

      const selectedStudents = new Set(parsed.data.studentIds);
      if (sectionId && parsed.data.includeSectionStudents) {
        const sectionStudents = await tx.sql<{ id: string }>`
          SELECT u."id" FROM "User" u JOIN "StudentProfile" sp ON sp."userId" = u."id"
          WHERE u."role" = 'STUDENT' AND u."isActive" = TRUE AND sp."schoolSectionId" = ${sectionId}
        `;
        sectionStudents.forEach((student) => selectedStudents.add(student.id));
      }
      const selectedStudentIds = [...selectedStudents];
      if (selectedStudentIds.length && sectionId) {
        const validStudents = await tx.query<{ id: string }>(
          `SELECT u."id" FROM "User" u JOIN "StudentProfile" sp ON sp."userId" = u."id"
           WHERE u."id" = ANY($1::text[]) AND u."role" = 'STUDENT' AND u."isActive" = TRUE
             AND sp."schoolSectionId" = $2`,
          [selectedStudentIds, sectionId],
        );
        if (validStudents.length !== selectedStudentIds.length) {
          throw new Error("Solo puedes agregar estudiantes activos de la sección seleccionada");
        }
        await tx.query(
          `INSERT INTO "Enrollment" ("id", "courseId", "userId")
           SELECT rows."id", $1, rows."userId"
           FROM unnest($2::text[], $3::text[]) AS rows("id", "userId")
           ON CONFLICT ("courseId", "userId") DO NOTHING`,
          [courseId, validStudents.map(() => newId()), validStudents.map(student => student.id)],
        );
      } else if (selectedStudentIds.length) {
        throw new Error("Para matricular estudiantes, el curso debe tener una sección asignada");
      }
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (isUniqueViolation(error) || isSerializationFailure(error)) fail("El curso cambió mientras se guardaba. Vuelve a intentarlo");
    if (error instanceof Error && [
      "Tu cuenta ya no tiene permiso para crear cursos",
      "Selecciona un docente activo",
      "El periodo y la sección deben pertenecer al mismo año lectivo abierto",
      "Solo puedes agregar estudiantes activos de la sección seleccionada",
      "Para matricular estudiantes, el curso debe tener una sección asignada",
    ].includes(error.message)) fail(error.message);
    throw error;
  }

  revalidatePath("/courses");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect(`/courses/${courseId}`);
}

export async function enrollAction(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) fail("Escribe el código del curso");

  const courses = await db.sql<Course>`SELECT * FROM "Course" WHERE "code" = ${code} LIMIT 1`;
  const course = courses[0];
  if (!course) fail("No existe un curso con ese código");
  if (course.instructorId === user.id) redirect(`/courses/${course.id}`);

  await db.sql`
    INSERT INTO "Enrollment" ("id", "courseId", "userId")
    VALUES (${newId()}, ${course.id}, ${user.id})
    ON CONFLICT ("courseId", "userId") DO NOTHING
  `;
  revalidatePath("/courses");
  redirect(`/courses/${course.id}`);
}
