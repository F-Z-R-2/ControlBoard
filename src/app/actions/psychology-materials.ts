"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { db, newId } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { canManagePsychologyMaterials } from "@/lib/psychology";

const maxFileSize = 4 * 1024 * 1024;
const materialSchema = z.object({
  title: z.string().trim().min(3, "Escribe un nombre de al menos 3 caracteres").max(140, "El nombre no puede superar 140 caracteres"),
});

export async function uploadPsychologyMaterialAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireUser();
  const users = await db.sql<{ id: string; role: string; isActive: boolean }>`
    SELECT "id", "role", "isActive" FROM "User" WHERE "id" = ${current.id} LIMIT 1
  `;
  const user = users[0];
  if (!user?.isActive || !canManagePsychologyMaterials(user.role)) {
    return { error: "No tienes permiso para subir fichas" };
  }

  const parsed = materialSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo PDF" };
  }
  if (file.size > maxFileSize) {
    return { error: "El archivo no puede superar 4 MB" };
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Solo se permiten archivos PDF" };
  }
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(signature) !== "%PDF-") {
    return { error: "El archivo seleccionado no es un PDF válido" };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "Falta configurar BLOB_READ_WRITE_TOKEN para subir archivos" };
  }

  const id = newId();
  const blob = await put(`psychology-materials/${id}.pdf`, file, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
    contentType: "application/pdf",
  });

  await db.sql`
    INSERT INTO "PsychologyMaterial" ("id", "title", "url", "createdById")
    VALUES (${id}, ${parsed.data.title}, ${blob.url}, ${user.id})
  `;

  revalidatePath("/psychology");
  return { success: "Ficha subida correctamente" };
}
