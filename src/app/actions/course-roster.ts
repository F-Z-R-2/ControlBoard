"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, newId } from "@/lib/db";
import { getCourseAccess } from "@/lib/permissions";

export async function enrollStudentInCourseAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const { course, canManage } = await getCourseAccess(courseId);
  if (!canManage) redirect("/courses");

  const students = await db.sql<{ id: string }>`
    SELECT u."id" FROM "User" u
    LEFT JOIN "StudentProfile" sp ON sp."userId" = u."id"
    WHERE u."id" = ${studentId} AND u."role" = 'STUDENT' AND u."isActive" = TRUE
      AND (${course.sectionId}::text IS NULL OR sp."schoolSectionId" = ${course.sectionId})
    LIMIT 1
  `;
  if (!students.length) redirect(`/courses/${course.id}/people?error=${encodeURIComponent("El estudiante no está activo o no pertenece a la sección del curso")}`);

  await db.sql`
    INSERT INTO "Enrollment" ("id", "courseId", "userId")
    VALUES (${newId()}, ${course.id}, ${studentId})
    ON CONFLICT ("courseId", "userId") DO NOTHING
  `;
  revalidatePath(`/courses/${course.id}/people`);
  revalidatePath(`/courses/${course.id}/attendance`);
  revalidatePath(`/students/${studentId}`);
  redirect(`/courses/${course.id}/people?success=${encodeURIComponent("Estudiante matriculado correctamente")}`);
}
