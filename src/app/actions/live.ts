"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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

  const session = await prisma.liveSession.create({
    data: {
      courseId,
      title: parsed.data.title,
      roomName: `${slugify(course.code)}-${crypto.randomUUID().slice(0, 8)}`,
      createdById: user.id,
    },
  });

  revalidatePath(`/courses/${courseId}/live`);
  redirect(`/courses/${courseId}/live/${session.id}`);
}

export async function endLiveSessionAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  await requireCourseManager(courseId);

  await prisma.liveSession.updateMany({
    where: { id: sessionId, courseId },
    data: { status: "ENDED", endedAt: new Date() },
  });

  revalidatePath(`/courses/${courseId}/live`);
  redirect(`/courses/${courseId}/live`);
}
