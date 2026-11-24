"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, isUniqueViolation } from "@/lib/db";
import type { User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";

function finish(message: string, error = false): never {
  redirect(`/tools?${error ? "error" : "success"}=${encodeURIComponent(message)}`);
}

export async function updateOwnProfileAction(formData: FormData) {
  const current = await requireUser();
  const parsed = z.object({
    name: z.string().trim().min(2, "Escribe tu nombre completo").max(120),
    email: z.string().trim().email("Correo inválido").toLowerCase(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) finish(parsed.error.issues[0]?.message ?? "Datos inválidos", true);

  const actors = await db.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
  const actor = actors[0];
  if (!actor?.isActive) finish("La cuenta está inactiva", true);
  try {
    await db.sql`UPDATE "User" SET "name" = ${parsed.data.name}, "email" = ${parsed.data.email}, "updatedAt" = NOW() WHERE "id" = ${actor.id}`;
  } catch (error) {
    if (isUniqueViolation(error)) finish("Ese correo ya está registrado", true);
    throw error;
  }
  revalidatePath("/", "layout");
  finish("Perfil actualizado");
}

export async function changeOwnPasswordAction(formData: FormData) {
  const current = await requireUser();
  const parsed = z.object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres").refine((value) => Buffer.byteLength(value, "utf8") <= 72, "La contraseña no puede superar 72 bytes"),
    confirmPassword: z.string().min(1),
  }).refine((data) => data.newPassword === data.confirmPassword, { message: "Las contraseñas nuevas no coinciden", path: ["confirmPassword"] }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) finish(parsed.error.issues[0]?.message ?? "Datos inválidos", true);

  const actors = await db.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
  const actor = actors[0];
  if (!actor?.isActive || !actor.passwordHash || !(await bcrypt.compare(parsed.data.currentPassword, actor.passwordHash))) {
    finish("La contraseña actual no es correcta", true);
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.sql`UPDATE "User" SET "passwordHash" = ${passwordHash}, "updatedAt" = NOW() WHERE "id" = ${actor.id}`;
  revalidatePath("/tools");
  finish("Contraseña actualizada");
}
