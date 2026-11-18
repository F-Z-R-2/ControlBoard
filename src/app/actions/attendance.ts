"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { attendanceSchema, canRecordAttendance } from "@/lib/attendance";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

class AttendanceError extends Error {}

function attendanceRedirectPath(courseId: string, day: string, formData: FormData) {
  const raw = formData.get("returnTo");
  const base = typeof raw === "string" && /^\/(?!\/)/.test(raw) ? raw : "/attendance";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}course=${encodeURIComponent(courseId)}&date=${day}`;
}

export async function saveAttendanceAction(formData: FormData) {
  const current = await requireUser();
  const parsed = attendanceSchema.safeParse(Object.fromEntries(formData));
  const fallback = typeof formData.get("returnTo") === "string" && /^\/(?!\/)/.test(String(formData.get("returnTo")))
    ? String(formData.get("returnTo")) : "/attendance";
  if (!parsed.success) {
    redirect(`${fallback}${fallback.includes("?") ? "&" : "?"}error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }
  const { courseId, studentId, date: day, status, note, version } = parsed.data;
  const date = new Date(`${day}T00:00:00.000Z`);
  const path = attendanceRedirectPath(courseId, day, formData);
  let errorMessage: string | undefined;
  try {
    await prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: current.id } });
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!actor?.isActive || !course || !canRecordAttendance(actor, course.instructorId)) {
        throw new AttendanceError("No tienes permiso para registrar asistencia en este curso");
      }
      const existing = await tx.attendance.findUnique({
        where: { courseId_studentId_date: { courseId, studentId, date } },
      });
      if ((existing?.version ?? 0) !== version) {
        throw new AttendanceError("El registro cambió. Revisa los datos actualizados antes de guardar");
      }
      if (!existing) {
        const enrollment = await tx.enrollment.findFirst({
          where: { courseId, userId: studentId, role: "STUDENT", user: { role: "STUDENT", isActive: true } },
        });
        if (!enrollment) throw new AttendanceError("El estudiante no tiene matrícula activa en este curso");
        await tx.attendance.create({ data: { courseId, studentId, date, status, note, recordedById: actor.id } });
      } else {
        await tx.attendance.update({
          where: { id: existing.id },
          data: { status, note, recordedById: actor.id, version: { increment: 1 } },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof AttendanceError) errorMessage = error.message;
    else if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      errorMessage = "Otro usuario actualizó la asistencia. Revisa los datos y vuelve a guardar";
    } else throw error;
  }
  revalidatePath("/attendance");
  revalidatePath(`/courses/${courseId}/attendance`);
  redirect(`${path}&${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "success=Asistencia+guardada"}`);
}
