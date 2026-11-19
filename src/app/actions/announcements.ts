"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, newId } from "@/lib/db";
import { requireCourseManager } from "@/lib/permissions";

const announcementSchema = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(140),
  body: z.string().trim().min(5, "El mensaje es obligatorio").max(4000),
});

export async function createAnnouncementAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const { user } = await requireCourseManager(courseId);

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    redirect(
      `/courses/${courseId}/announcements?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
      )}`,
    );
  }

  await db.sql`
    INSERT INTO "Announcement" ("id", "courseId", "authorId", "title", "body", "updatedAt")
    VALUES (${newId()}, ${courseId}, ${user.id}, ${parsed.data.title}, ${parsed.data.body}, NOW())
  `;

  revalidatePath(`/courses/${courseId}/announcements`);
  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}/announcements`);
}

export async function deleteAnnouncementAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const id = String(formData.get("id") ?? "");
  await requireCourseManager(courseId);

  await db.sql`DELETE FROM "Announcement" WHERE "id" = ${id} AND "courseId" = ${courseId}`;

  revalidatePath(`/courses/${courseId}/announcements`);
  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}/announcements`);
}
