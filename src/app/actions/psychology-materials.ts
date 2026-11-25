"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { db, newId } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { canManagePsychologyMaterials } from "@/lib/psychology";

const maxFileSize = 4 * 1024 * 1024;
const materialSchema = z.object({
  title: z.string().trim().min(3, "Escribe un nombre de al menos 3 caracteres").max(140, "El nombre no puede superar 140 caracteres"),
});
const materialIdSchema = z.string().min(1, "Ficha inválida");

async function getMaterialManager() {
  const current = await requireUser();
  const users = await db.sql<{ id: string; role: string; isActive: boolean }>`
    SELECT "id", "role", "isActive" FROM "User" WHERE "id" = ${current.id} LIMIT 1
  `;
  const user = users[0];
  return user?.isActive && canManagePsychologyMaterials(user.role) ? user : null;
}

export async function uploadPsychologyMaterialAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getMaterialManager();
  if (!user) {
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

export async function renamePsychologyMaterialAction(formData: FormData) {
  const user = await getMaterialManager();
  if (!user) {
    redirect("/psychology?error=No%20tienes%20permiso%20para%20editar%20fichas");
  }

  const parsedId = materialIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    redirect(`/psychology?error=${encodeURIComponent(parsedId.error.issues[0]?.message ?? "Ficha inválida")}`);
  }

  const parsed = materialSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    redirect(`/psychology?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }

  const updated = await db.sql<{ id: string }>`
    UPDATE "PsychologyMaterial"
    SET "title" = ${parsed.data.title}
    WHERE "id" = ${parsedId.data}
    RETURNING "id"
  `;
  if (!updated[0]) {
    redirect("/psychology?error=Ficha%20no%20encontrada");
  }

  revalidatePath("/psychology");
  redirect("/psychology?success=Nombre%20actualizado");
}

export async function deletePsychologyMaterialAction(formData: FormData) {
  const user = await getMaterialManager();
  if (!user) {
    redirect("/psychology?error=No%20tienes%20permiso%20para%20eliminar%20fichas");
  }

  const parsedId = materialIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    redirect(`/psychology?error=${encodeURIComponent(parsedId.error.issues[0]?.message ?? "Ficha inválida")}`);
  }

  const materials = await db.sql<{ url: string }>`
    SELECT "url" FROM "PsychologyMaterial" WHERE "id" = ${parsedId.data} LIMIT 1
  `;
  const material = materials[0];
  if (!material) {
    redirect("/psychology?error=Ficha%20no%20encontrada");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    redirect("/psychology?error=Falta%20configurar%20Blob%20para%20eliminar%20el%20archivo");
  }

  await del(material.url, { token });
  await db.sql`DELETE FROM "PsychologyMaterial" WHERE "id" = ${parsedId.data}`;

  revalidatePath("/psychology");
  redirect("/psychology?success=Ficha%20eliminada");
}
