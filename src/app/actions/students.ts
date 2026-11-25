"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, isUniqueViolation, newId, withTransaction } from "@/lib/db";
import type { User } from "@/lib/db-types";
import { requireStaff } from "@/lib/permissions";
import { isStaff } from "@/lib/roles";

const guardianSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(2).max(40),
  documentNumber: z.string().trim().regex(/^$|^\d{8,12}$/, "El documento del apoderado debe tener entre 8 y 12 dígitos").optional().transform((value) => value || null),
  phone: z.string().trim().regex(/^$|^[+\d()\-\s]{7,20}$/, "Teléfono de apoderado inválido").optional().transform((value) => value || null),
  email: z.string().trim().email("Correo de apoderado inválido").or(z.literal("")).optional().transform((value) => value || null),
});

const studentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escribe el nombre completo").max(120),
  email: z.string().trim().email("Correo inválido").toLowerCase(),
  documentNumber: z.string().trim().regex(/^\d{8}$/, "El DNI debe tener 8 dígitos"),
  sectionId: z.string().trim().min(1, "Selecciona una sección"),
  password: z.string().refine((value) => !value || (value.length >= 8 && Buffer.byteLength(value, "utf8") <= 72), "La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes"),
  guardians: z.array(guardianSchema).max(3),
});

function finish(path: string, message: string, error = false): never {
  redirect(`${path}?${error ? "error" : "success"}=${encodeURIComponent(message)}`);
}

function studentCode() {
  return `ALU-${newId().slice(-8).toUpperCase()}`;
}

export async function saveStudentAction(formData: FormData) {
  const current = await requireStaff();
  const guardians = [1, 2, 3]
    .map((position) => ({
      fullName: String(formData.get(`guardianName${position}`) ?? "").trim(),
      relationship: String(formData.get(`guardianRelationship${position}`) ?? "").trim(),
      documentNumber: String(formData.get(`guardianDocument${position}`) ?? "").trim(),
      phone: String(formData.get(`guardianPhone${position}`) ?? "").trim(),
      email: String(formData.get(`guardianEmail${position}`) ?? "").trim(),
    }))
    .filter((guardian) => guardian.fullName || guardian.relationship || guardian.documentNumber || guardian.phone || guardian.email);
  const parsed = studentSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    documentNumber: formData.get("documentNumber"),
    sectionId: formData.get("sectionId"),
    password: formData.get("password") ?? "",
    guardians,
  });
  if (!parsed.success) finish("/students", parsed.error.issues[0]?.message ?? "Datos inválidos", true);
  if (!parsed.data.id && !parsed.data.password) finish("/students", "La contraseña inicial es obligatoria", true);

  const { id, password, guardians: validatedGuardians, ...data } = parsed.data;
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  const targetPath = id ? `/students/${id}` : "/students";

  try {
    await withTransaction(async (tx) => {
      const actors = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
      const actor = actors[0];
      if (!actor?.isActive || !isStaff(actor.role)) throw new Error("No tienes permiso para gestionar estudiantes");

      const sections = await tx.sql<{ id: string }>`
        SELECT ss."id" FROM "SchoolSection" ss
        JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
        JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
        WHERE ss."id" = ${data.sectionId} AND sg."level" IN ('PRIMARY', 'SECONDARY')
          AND ss."name" IN ('A', 'B') AND ay."isClosed" = FALSE
        LIMIT 1
      `;
      if (!sections.length) throw new Error("La sección debe ser A o B de Primaria o Secundaria en un año abierto");

      let studentId = id;
      if (id) {
        const targets = await tx.sql<User>`SELECT * FROM "User" WHERE "id" = ${id} LIMIT 1`;
        const target = targets[0];
        if (!target || target.role !== "STUDENT") throw new Error("No se encontró el estudiante");
        await tx.sql`
          UPDATE "User" SET "name" = ${data.name}, "email" = ${data.email},
            "passwordHash" = COALESCE(${passwordHash ?? null}, "passwordHash"), "updatedAt" = NOW()
          WHERE "id" = ${id}
        `;
        const profiles = await tx.sql<{ id: string }>`SELECT "id" FROM "StudentProfile" WHERE "userId" = ${id} LIMIT 1`;
        if (profiles.length) {
          await tx.sql`
            UPDATE "StudentProfile" SET "documentNumber" = ${data.documentNumber},
              "schoolSectionId" = ${data.sectionId}, "updatedAt" = NOW()
            WHERE "userId" = ${id}
          `;
        } else {
          await tx.sql`
            INSERT INTO "StudentProfile" ("id", "userId", "documentNumber", "studentCode", "schoolSectionId", "updatedAt")
            VALUES (${newId()}, ${id}, ${data.documentNumber}, ${studentCode()}, ${data.sectionId}, NOW())
          `;
        }
      } else {
        studentId = newId();
        await tx.sql`
          INSERT INTO "User" ("id", "name", "email", "role", "isActive", "passwordHash", "updatedAt")
          VALUES (${studentId}, ${data.name}, ${data.email}, 'STUDENT', TRUE, ${passwordHash ?? null}, NOW())
        `;
        await tx.sql`
          INSERT INTO "StudentProfile" ("id", "userId", "documentNumber", "studentCode", "schoolSectionId", "updatedAt")
          VALUES (${newId()}, ${studentId}, ${data.documentNumber}, ${studentCode()}, ${data.sectionId}, NOW())
        `;
      }

      await tx.sql`DELETE FROM "StudentGuardian" WHERE "studentId" = ${studentId}`;
      for (const [index, guardian] of validatedGuardians.entries()) {
        await tx.sql`
          INSERT INTO "StudentGuardian" ("id", "studentId", "fullName", "relationship", "documentNumber", "phone", "email", "position")
          VALUES (${newId()}, ${studentId}, ${guardian.fullName}, ${guardian.relationship}, ${guardian.documentNumber}, ${guardian.phone}, ${guardian.email}, ${index + 1})
        `;
      }
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (isUniqueViolation(error)) {
      finish(targetPath, "El correo o DNI ya está registrado", true);
    }
    if (error instanceof Error && [
      "No tienes permiso para gestionar estudiantes",
      "La sección debe ser A o B de Primaria o Secundaria en un año abierto",
      "No se encontró el estudiante",
    ].includes(error.message)) {
      finish(targetPath, error.message, true);
    }
    throw error;
  }

  revalidatePath("/students");
  revalidatePath("/courses");
  revalidatePath("/attendance");
  revalidatePath("/grades");
  revalidatePath("/dashboard");
  finish(targetPath, id ? "Ficha del estudiante actualizada" : "Estudiante registrado");
}

export async function setStudentStatusAction(formData: FormData) {
  const current = await requireStaff();
  const parsed = z.object({
    studentId: z.string().min(1),
    isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) finish("/students", "Selecciona un estudiante", true);

  const actors = await db.sql<User>`SELECT * FROM "User" WHERE "id" = ${current.id} LIMIT 1`;
  const actor = actors[0];
  if (!actor?.isActive || !isStaff(actor.role)) finish("/students", "No tienes permiso para cambiar el estado", true);
  const result = await db.sql<{ id: string }>`
    UPDATE "User" SET "isActive" = ${parsed.data.isActive}, "updatedAt" = NOW()
    WHERE "id" = ${parsed.data.studentId} AND "role" = 'STUDENT' RETURNING "id"
  `;
  if (!result.length) finish("/students", "No se encontró el estudiante", true);
  revalidatePath("/students");
  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/courses");
  finish("/students", parsed.data.isActive ? "Estudiante activado" : "Estudiante desactivado");
}
