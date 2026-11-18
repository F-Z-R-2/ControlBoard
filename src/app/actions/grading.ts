"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readScaleForm, scaleSchema, validGrade } from "@/lib/grading";
import { requireStaff, requireUser } from "@/lib/permissions";
import { isAdmin, isStaff } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

class GradingError extends Error {}
function errorMessage(error: unknown) {
  if (error instanceof GradingError) return error.message;
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return "Los datos cambiaron mientras editabas. Revisa los valores y vuelve a guardar";
  throw error;
}

export async function saveGradingScaleAction(formData: FormData) {
  const current = await requireStaff();
  const fields = z.object({ yearId: z.string().min(1), level: z.enum(["INITIAL", "PRIMARY", "SECONDARY"]), version: z.coerce.number().int().min(0) }).safeParse(Object.fromEntries(formData));
  const config = readScaleForm(Object.fromEntries(formData));
  if (!fields.success || !config.success) redirect(`/grading-settings?error=${encodeURIComponent(!config.success ? config.error.issues[0]?.message ?? "Escala inválida" : "Datos inválidos")}`);
  const { yearId, level, version } = fields.data;
  let error: string | undefined;
  try {
    await prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: current.id } });
      if (!actor?.isActive || !isStaff(actor.role)) throw new GradingError("No tienes permiso para configurar notas");
      const year = await tx.academicYear.findUnique({ where: { id: yearId } });
      if (!year || year.isClosed) throw new GradingError("Selecciona un año lectivo abierto");
      const existing = await tx.gradingScale.findUnique({ where: { yearId_level: { yearId, level } } });
      if ((existing?.version ?? 0) !== version) throw new GradingError("La configuración cambió. Revisa la escala actual antes de guardar");
      if (existing) await tx.gradingScale.update({ where: { id: existing.id }, data: { config: config.data, version: { increment: 1 } } });
      else await tx.gradingScale.create({ data: { yearId, level, config: config.data } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (caught) { error = errorMessage(caught); }
  revalidatePath("/", "layout");
  redirect(`/grading-settings?year=${encodeURIComponent(yearId)}&${error ? `error=${encodeURIComponent(error)}` : "success=Escala+guardada"}`);
}

export async function savePeriodGradeAction(formData: FormData) {
  const current = await requireUser();
  const parsed = z.object({
    courseId: z.string().min(1), periodId: z.string().min(1), studentId: z.string().min(1),
    value: z.string().trim().min(1).max(30), comment: z.string().trim().max(1000),
    version: z.coerce.number().int().min(0), scaleVersion: z.coerce.number().int().min(1), scaleId: z.string().min(1),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/courses?error=Calificación+inválida");
  const { courseId, periodId, studentId, value, comment, version, scaleVersion, scaleId } = parsed.data;
  let error: string | undefined;
  try {
    await prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: current.id } });
      const course = await tx.course.findUnique({ where: { id: courseId }, include: { section: { include: { grade: true, year: true } }, academicPeriod: true } });
      if (!actor?.isActive || !course || !(isAdmin(actor.role) || (actor.role === "INSTRUCTOR" && course.instructorId === actor.id))) throw new GradingError("Solo el docente asignado o un administrador puede registrar notas");
      if (!course.section || !course.academicPeriod || course.academicPeriodId !== periodId || course.section.yearId !== course.academicPeriod.yearId || course.section.year.isClosed) throw new GradingError("El curso debe tener sección y periodo de un año abierto");
      const scale = await tx.gradingScale.findUnique({ where: { yearId_level: { yearId: course.section.yearId, level: course.section.grade.level } } });
      if (!scale || scale.id !== scaleId || scale.version !== scaleVersion) throw new GradingError("La escala cambió. Revisa la configuración actual antes de guardar");
      const config = scaleSchema.parse(scale.config);
      if (!validGrade(value, config)) throw new GradingError("La nota no corresponde a la escala o a sus decimales permitidos");
      const enrollment = await tx.enrollment.findFirst({ where: { courseId, userId: studentId, role: "STUDENT", user: { role: "STUDENT", isActive: true } } });
      if (!enrollment) throw new GradingError("El estudiante no tiene matrícula activa");
      const existing = await tx.periodGrade.findUnique({ where: { courseId_periodId_studentId: { courseId, periodId, studentId } } });
      if ((existing?.version ?? 0) !== version) throw new GradingError("La nota cambió. Revisa el valor actualizado antes de guardar");
      const data = { value, comment, scaleSnapshot: config, recordedById: actor.id };
      if (existing) await tx.periodGrade.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } });
      else await tx.periodGrade.create({ data: { ...data, courseId, periodId, studentId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (caught) { error = errorMessage(caught); }
  revalidatePath(`/courses/${courseId}/period-grades`);
  redirect(`/courses/${encodeURIComponent(courseId)}/period-grades?${error ? `error=${encodeURIComponent(error)}` : "success=Nota+guardada"}`);
}
