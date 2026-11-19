"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, newId } from "@/lib/db";
import { requireCourseManager } from "@/lib/permissions";
import { slugify } from "@/lib/utils";

const sessionSchema = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(140),
});

export async function createLiveSessionAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const { course, user } = await requireCourseManager(courseId);

  const parsed = sessionSchema.safeParse({
    title: formData.get("title"),
  });

  if (!parsed.success) {
    redirect(
      `/courses/${courseId}/live?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
      )}`,
    );
  }

  const roomName = `${slugify(course.code)}-${crypto.randomUUID().slice(0, 8)}`;
  const created = await db.sql<{ id: string }>`
    INSERT INTO "LiveSession" ("id", "courseId", "title", "roomName", "createdById")
    VALUES (${newId()}, ${courseId}, ${parsed.data.title}, ${roomName}, ${user.id})
    RETURNING "id"
  `;

  revalidatePath(`/courses/${courseId}/live`);
  redirect(`/courses/${courseId}/live/${created[0]!.id}`);
}

export async function endLiveSessionAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  await requireCourseManager(courseId);

  await db.sql`
    UPDATE "LiveSession"
    SET "status" = 'ENDED', "endedAt" = NOW()
    WHERE "id" = ${sessionId} AND "courseId" = ${courseId}
  `;

  revalidatePath(`/courses/${courseId}/live`);
  redirect(`/courses/${courseId}/live`);
}
