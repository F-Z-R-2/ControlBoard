"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  isSerializationFailure,
  isUniqueViolation,
  newId,
  withTransaction,
} from "@/lib/db";
import type { Course, User } from "@/lib/db-types";
import { requireStaff } from "@/lib/permissions";
import { canManageUser, isStaff, manageableRoles } from "@/lib/roles";

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escribe el nombre completo").max(120),
  email: z.string().trim().email("Correo inválido").toLowerCase(),
  role: z.enum(["PSYCHOLOGIST", "SUPER_ADMIN", "SECRETARY", "ADMIN", "INSTRUCTOR", "STUDENT"]),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  password: z.string().refine((value) => !value || (value.length >= 8 && Buffer.byteLength(value, "utf8") <= 72), "La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes"),
});

function finish(message: string, error = false): never {
  redirect(`/administration?${error ? "error" : "success"}=${encodeURIComponent(message)}`);
}

function mutationError(error: unknown): never {
  if (isUniqueViolation(error)) finish("Ese correo ya está registrado", true);
  if (isSerializationFailure(error)) finish("Otro usuario modificó los datos. Vuelve a intentarlo", true);
  if (error instanceof ManagementError) finish(error.message, true);
  throw error;
}

class ManagementError extends Error {}

export async function saveUserAction(formData: FormData) {
  const current = await requireStaff();
  const parsed = userSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"), email: formData.get("email"),
    role: formData.get("role"), isActive: formData.get("isActive"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) finish(parsed.error.issues[0]?.message ?? "Datos inválidos", true);
  const { id, password, ...data } = parsed.data;
  if (!id && !password) finish("La contraseña es obligatoria para cuentas nuevas", true);
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  try {
    await withTransaction(async (tx) => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      if (!actor?.isActive || !manageableRoles(actor.role).includes(data.role)) {
        throw new ManagementError("No tienes permiso para asignar este rol");
      }
      if (id) {
        const targets = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${id} LIMIT 1`;
        const target = targets[0];
        if (!target || !canManageUser(actor, target)) {
          throw new ManagementError("No puedes modificar esta cuenta ni tu propia cuenta desde este panel");
        }
        if (target.role === "SUPER_ADMIN" && target.isActive && (data.role !== "SUPER_ADMIN" || !data.isActive)) {
          const remaining = await tx.sql<{ count: number }>`
            SELECT COUNT(*)::int AS "count" FROM "User"
            WHERE "role" = 'SUPER_ADMIN' AND "isActive" = TRUE AND "id" <> ${id}
          `;
          if (!remaining[0]!.count) throw new ManagementError("Debe quedar al menos un superadministrador activo");
        }
        if (data.role !== target.role && !["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"].includes(data.role)) {
          const courses = await tx.sql<{ count: number }>`
            SELECT COUNT(*)::int AS "count" FROM "Course" WHERE "instructorId" = ${id}
          `;
          if (courses[0]!.count) throw new ManagementError("La cuenta tiene cursos a cargo; reasígnalos antes de cambiar su rol");
        }
        await tx.sql`
          UPDATE "User"
          SET "name" = ${data.name}, "email" = ${data.email}, "role" = ${data.role}, "isActive" = ${data.isActive},
              "passwordHash" = COALESCE(${passwordHash ?? null}, "passwordHash"), "updatedAt" = NOW()
          WHERE "id" = ${id}
        `;
      } else {
        await tx.sql`
          INSERT INTO "User" ("id", "name", "email", "role", "isActive", "passwordHash", "updatedAt")
          VALUES (${newId()}, ${data.name}, ${data.email}, ${data.role}, ${data.isActive}, ${passwordHash ?? null}, NOW())
        `;
      }
    }, { isolationLevel: "serializable" });
  } catch (error) { mutationError(error); }
  revalidatePath("/", "layout");
  finish(id ? "Cuenta actualizada" : "Cuenta creada");
}

export async function manageEnrollmentAction(formData: FormData) {
  const current = await requireStaff();
  const parsed = z.object({
    userId: z.string().min(1), courseId: z.string().min(1), operation: z.enum(["enroll", "withdraw"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) finish("Selecciona estudiante, curso y operación", true);
  const { userId, courseId, operation } = parsed.data;
  try {
    await withTransaction(async (tx) => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      if (!actor?.isActive || !isStaff(actor.role)) throw new ManagementError("No tienes permiso para gestionar matrículas");
      const students = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${userId} LIMIT 1`;
      const student = students[0];
      const courses = await tx.sql<Course>`SELECT * FROM "Course" WHERE "id" = ${courseId} LIMIT 1`;
      const course = courses[0];
      if (!student || student.role !== "STUDENT" || !course) throw new ManagementError("Estudiante o curso inválido");
      if (operation === "enroll") {
        if (!student.isActive) throw new ManagementError("Activa al estudiante antes de matricularlo");
        await tx.sql`
          INSERT INTO "Enrollment" ("id", "courseId", "userId")
          VALUES (${newId()}, ${courseId}, ${userId})
          ON CONFLICT ("courseId", "userId") DO NOTHING
        `;
      } else {
        await tx.sql`DELETE FROM "Enrollment" WHERE "courseId" = ${courseId} AND "userId" = ${userId}`;
      }
    }, { isolationLevel: "serializable" });
  } catch (error) { mutationError(error); }
  revalidatePath("/", "layout");
  finish(operation === "enroll" ? "Estudiante matriculado" : "Matrícula retirada; las entregas se conservan");
}
