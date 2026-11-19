"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { db, newId } from "@/lib/db";
import type { Assignment, Submission } from "@/lib/db-types";
import {
  getCourseAccess,
  requireCourseManager,
} from "@/lib/permissions";

const assignmentSchema = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(140),
  description: z.string().trim().min(5, "La consigna es obligatoria").max(8000),
  dueAt: z.string().optional(),
  points: z.coerce.number().int().min(1).max(1000).default(100),
});

export async function createAssignmentAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  await requireCourseManager(courseId);

  const parsed = assignmentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt") || undefined,
    points: formData.get("points") || 100,
  });

  if (!parsed.success) {
    redirect(
      `/courses/${courseId}/assignments?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
      )}`,
    );
  }

  await db.sql`
    INSERT INTO "Assignment" ("id", "courseId", "title", "description", "points", "dueAt", "updatedAt")
    VALUES (
      ${newId()}, ${courseId}, ${parsed.data.title}, ${parsed.data.description},
      ${parsed.data.points}, ${parsed.data.dueAt ? new Date(parsed.data.dueAt) : null}, NOW()
    )
  `;

  revalidatePath(`/courses/${courseId}/assignments`);
  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}/assignments`);
}

export async function submitAssignmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const { user, isInstructor } = await getCourseAccess(courseId);

  if (isInstructor) {
    return { error: "El docente no entrega tareas en este curso" };
  }

  const assignments = await db.sql<Assignment>`
    SELECT * FROM "Assignment" WHERE "id" = ${assignmentId} AND "courseId" = ${courseId} LIMIT 1
  `;
  const assignment = assignments[0];
  if (!assignment) {
    return { error: "La tarea no existe" };
  }

  const text = String(formData.get("text") ?? "").trim();
  let fileUrl: string | undefined;
  const file = formData.get("file");

  if (file instanceof File && file.size > 0) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        error:
          "Falta BLOB_READ_WRITE_TOKEN. Configúralo o entrega un enlace de texto.",
      };
    }
    const blob = await put(
      `submissions/${courseId}/${assignmentId}/${Date.now()}-${file.name}`,
      file,
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      },
    );
    fileUrl = blob.url;
  }

  if (!text && !fileUrl) {
    return { error: "Escribe una respuesta o adjunta un archivo" };
  }

  await db.sql`
    INSERT INTO "Submission" ("id", "assignmentId", "studentId", "text", "fileUrl", "submittedAt")
    VALUES (${newId()}, ${assignmentId}, ${user.id}, ${text || null}, ${fileUrl ?? null}, NOW())
    ON CONFLICT ("assignmentId", "studentId") DO UPDATE
    SET "text" = EXCLUDED."text",
        "fileUrl" = COALESCE(EXCLUDED."fileUrl", "Submission"."fileUrl"),
        "submittedAt" = NOW()
  `;

  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`);
  revalidatePath(`/courses/${courseId}/grades`);
  redirect(`/courses/${courseId}/assignments/${assignmentId}?ok=1`);
}

export async function gradeSubmissionAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  await requireCourseManager(courseId);

  const submissions = await db.sql<Submission & { assignment: Assignment }>`
    SELECT s.*, to_jsonb(a) AS "assignment"
    FROM "Submission" s
    JOIN "Assignment" a ON a."id" = s."assignmentId"
    WHERE s."id" = ${submissionId} AND s."assignmentId" = ${assignmentId} AND a."courseId" = ${courseId}
    LIMIT 1
  `;
  const submission = submissions[0];

  if (!submission) {
    redirect(`/courses/${courseId}/assignments/${assignmentId}?error=Entrega no encontrada`);
  }

  const grade = z.coerce
    .number()
    .min(0)
    .max(submission.assignment.points)
    .safeParse(formData.get("grade"));

  if (!grade.success) {
    redirect(
      `/courses/${courseId}/assignments/${assignmentId}?error=${encodeURIComponent(
        `La nota debe estar entre 0 y ${submission.assignment.points}`,
      )}`,
    );
  }

  const feedback = String(formData.get("feedback") ?? "").trim();

  await db.sql`
    UPDATE "Submission"
    SET "grade" = ${grade.data}, "feedback" = ${feedback || null}, "gradedAt" = NOW()
    WHERE "id" = ${submission.id}
  `;

  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`);
  revalidatePath(`/courses/${courseId}/grades`);
  redirect(`/courses/${courseId}/assignments/${assignmentId}`);
}
