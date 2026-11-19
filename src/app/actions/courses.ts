"use server";
import { isAdmin as isAdministrator } from "@/lib/roles";


import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, isUniqueViolation, newId } from "@/lib/db";
import type { Course } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";

const courseSchema = z.object({
  code: z.string().trim().min(2, "El código es obligatorio").max(20),
  title: z.string().trim().min(3, "El título es obligatorio").max(120),
  term: z.string().trim().min(2, "El periodo es obligatorio").max(40),
  description: z.string().trim().max(1000).optional(),
  instructorId: z.string().trim().min(1).optional(),
});

function fail(message: string): never {
  redirect(`/courses?error=${encodeURIComponent(message)}`);
}

export async function createCourseAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "INSTRUCTOR" && !isAdministrator(user.role)) {
    fail("Solo profesores y administradores pueden crear cursos");
  }

  const parsed = courseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    term: formData.get("term"),
    description: formData.get("description") || undefined,
    instructorId: formData.get("instructorId") || undefined,
  });

  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const code = parsed.data.code.toUpperCase();
  let instructorId = user.id;
  if (isAdministrator(user.role)) {
    if (!parsed.data.instructorId) {
      fail("Selecciona un docente para el curso");
    }
    const teachers = await db.sql<{ id: string }>`
      SELECT "id" FROM "User"
      WHERE "id" = ${parsed.data.instructorId} AND "role" = 'INSTRUCTOR' AND "isActive" = true
      LIMIT 1
    `;
    if (!teachers.length) {
      fail("El docente seleccionado no es válido");
    }
    instructorId = teachers[0]!.id;
  }

  const existing = await db.sql<{ id: string }>`
    SELECT "id" FROM "Course" WHERE "code" = ${code} LIMIT 1
  `;
  if (existing.length) {
    fail("Ya existe un curso con ese código");
  }

  let courseId: string;
  try {
    const created = await db.sql<{ id: string }>`
      INSERT INTO "Course" ("id", "code", "title", "term", "description", "instructorId", "updatedAt")
      VALUES (${newId()}, ${code}, ${parsed.data.title}, ${parsed.data.term}, ${parsed.data.description ?? ""}, ${instructorId}, NOW())
      RETURNING "id"
    `;
    courseId = created[0]!.id;
  } catch (error) {
    if (isUniqueViolation(error)) fail("Ya existe un curso con ese código");
    throw error;
  }

  revalidatePath("/courses");
  redirect(`/courses/${courseId}`);
}

export async function enrollAction(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (!code) {
    fail("Escribe el código del curso");
  }

  const courses = await db.sql<Course>`
    SELECT * FROM "Course" WHERE "code" = ${code} LIMIT 1
  `;
  const course = courses[0];
  if (!course) {
    fail("No existe un curso con ese código");
  }

  if (course.instructorId === user.id) {
    redirect(`/courses/${course.id}`);
  }

  await db.sql`
    INSERT INTO "Enrollment" ("id", "courseId", "userId")
    VALUES (${newId()}, ${course.id}, ${user.id})
    ON CONFLICT ("courseId", "userId") DO NOTHING
  `;

  revalidatePath("/courses");
  redirect(`/courses/${course.id}`);
}
