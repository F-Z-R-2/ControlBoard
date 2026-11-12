"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { requireCourseManager } from "@/lib/permissions";

const contentSchema = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(140),
  type: z.enum(["PAGE", "LINK", "FILE"]),
  body: z.string().trim().max(8000).optional(),
  url: z.string().trim().url("El enlace no es válido").optional().or(z.literal("")),
});

export async function createContentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const { user } = await requireCourseManager(courseId);

  const parsed = contentSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    body: formData.get("body") || undefined,
    url: formData.get("url") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  let url = parsed.data.url || null;
  let body = parsed.data.body || null;

  if (parsed.data.type === "FILE") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Selecciona un archivo para subir" };
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        error:
          "Falta BLOB_READ_WRITE_TOKEN. Configúralo en Vercel o usa un enlace en su lugar.",
      };
    }

    const blob = await put(
      `courses/${courseId}/${Date.now()}-${file.name}`,
      file,
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      },
    );
    url = blob.url;
    body = null;
  }

  if (parsed.data.type === "LINK" && !url) {
    return { error: "Escribe la URL del enlace" };
  }

  if (parsed.data.type === "PAGE" && !body) {
    return { error: "Escribe el contenido de la página" };
  }

  await prisma.contentItem.create({
    data: {
      courseId,
      authorId: user.id,
      title: parsed.data.title,
      type: parsed.data.type,
      body,
      url,
    },
  });

  revalidatePath(`/courses/${courseId}/content`);
  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}/content`);
}

export async function deleteContentAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const id = String(formData.get("id") ?? "");
  await requireCourseManager(courseId);

  await prisma.contentItem.deleteMany({ where: { id, courseId } });

  revalidatePath(`/courses/${courseId}/content`);
  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}/content`);
}
