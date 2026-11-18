"use server";

import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canManageUser, isStaff, manageableRoles } from "@/lib/roles";

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escribe el nombre completo").max(120),
  email: z.string().trim().email("Correo inválido").toLowerCase(),
  role: z.nativeEnum(Role),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  password: z.string().refine((value) => !value || (value.length >= 8 && Buffer.byteLength(value, "utf8") <= 72), "La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes"),
});

function finish(message: string, error = false): never {
  redirect(`/administration?${error ? "error" : "success"}=${encodeURIComponent(message)}`);
}

function mutationError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") finish("Ese correo ya está registrado", true);
    if (error.code === "P2034") finish("Otro usuario modificó los datos. Vuelve a intentarlo", true);
  }
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
    await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: current.id } });
      if (!actor?.isActive || !manageableRoles(actor.role).includes(data.role)) {
        throw new ManagementError("No tienes permiso para asignar este rol");
      }
      if (id) {
        const target = await tx.user.findUnique({ where: { id } });
        if (!target || !canManageUser(actor, target)) {
          throw new ManagementError("No puedes modificar esta cuenta ni tu propia cuenta desde este panel");
        }
        if (target.role === "SUPER_ADMIN" && target.isActive && (data.role !== "SUPER_ADMIN" || !data.isActive)) {
          const remaining = await tx.user.count({ where: { role: "SUPER_ADMIN", isActive: true, id: { not: id } } });
          if (!remaining) throw new ManagementError("Debe quedar al menos un superadministrador activo");
        }
        if (data.role !== target.role && !["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"].includes(data.role)) {
          const courses = await tx.course.count({ where: { instructorId: id } });
          if (courses) throw new ManagementError("La cuenta tiene cursos a cargo; reasígnalos antes de cambiar su rol");
        }
        await tx.user.update({ where: { id }, data: { ...data, ...(passwordHash ? { passwordHash } : {}) } });
      } else {
        await tx.user.create({ data: { ...data, passwordHash } });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
    await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: current.id } });
      if (!actor?.isActive || !isStaff(actor.role)) throw new ManagementError("No tienes permiso para gestionar matrículas");
      const student = await tx.user.findUnique({ where: { id: userId } });
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!student || student.role !== "STUDENT" || !course) throw new ManagementError("Estudiante o curso inválido");
      if (operation === "enroll") {
        if (!student.isActive) throw new ManagementError("Activa al estudiante antes de matricularlo");
        await tx.enrollment.upsert({ where: { courseId_userId: { courseId, userId } }, create: { courseId, userId }, update: {} });
      } else {
        await tx.enrollment.deleteMany({ where: { courseId, userId } });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { mutationError(error); }
  revalidatePath("/", "layout");
  finish(operation === "enroll" ? "Estudiante matriculado" : "Matrícula retirada; las entregas se conservan");
}
