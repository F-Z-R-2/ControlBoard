"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { appointmentTime, canAccessPsychology, canManagePsychologyCase, canWritePsychologyNotes, psychologyActionSchema } from "@/lib/psychology";

class PsychologyError extends Error {}

export async function psychologyAction(formData: FormData) {
  const current = await requireUser();
  if (!canAccessPsychology(current.role)) redirect("/dashboard");
  const parsed = psychologyActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/psychology?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  const data = parsed.data;
  let caseId = "caseId" in data ? data.caseId : "";
  let errorMessage: string | undefined;
  try {
    await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: current.id } });
      if (!user?.isActive || !canAccessPsychology(user.role)) throw new PsychologyError("No tienes acceso al módulo");
      if (data.operation === "open") {
        if (user.role === "PSYCHOLOGIST" && data.psychologistId !== user.id) throw new PsychologyError("Solo puedes abrir fichas asignadas a ti");
        const student = await tx.user.findUnique({ where: { id: data.studentId } });
        const professional = await tx.user.findUnique({ where: { id: data.psychologistId } });
        if (!student?.isActive || student.role !== "STUDENT" || !professional?.isActive || professional.role !== "PSYCHOLOGIST") throw new PsychologyError("Selecciona un estudiante y un profesional activos");
        const existing = await tx.psychologyCase.findUnique({ where: { studentId: student.id }, select: { id: true } });
        if (existing) throw new PsychologyError("El estudiante ya tiene una ficha. Solicita al profesional responsable que la revise o reabra");
        const created = await tx.psychologyCase.create({ data: { studentId: student.id, psychologistId: professional.id, openedById: user.id, category: data.category } });
        caseId = created.id;
        return;
      }
      const record = await tx.psychologyCase.findUnique({ where: { id: data.caseId }, include: { psychologist: { select: { role: true, isActive: true } }, student: { select: { isActive: true } } } });
      if (!record || !canManagePsychologyCase(user, record.psychologistId)) throw new PsychologyError("Ficha no disponible");
      const clinical = canWritePsychologyNotes(user, record.psychologistId);
      if (data.operation === "note") {
        if (!clinical) throw new PsychologyError("Solo el profesional asignado puede registrar notas de atención");
        await tx.psychologyNote.create({ data: { caseId: record.id, authorId: user.id, attendedOn: new Date(`${data.attendedOn}T00:00:00Z`), body: data.body } });
      } else if (data.operation === "case-status") {
        if (!clinical) throw new PsychologyError("Solo el profesional asignado puede cerrar o reabrir una ficha");
        if (record.version !== data.version) throw new PsychologyError("La ficha cambió. Revisa su estado actual");
        await tx.psychologyCase.update({ where: { id: record.id }, data: { status: data.status, version: { increment: 1 } } });
        if (data.status === "CLOSED") await tx.psychologyAppointment.updateMany({ where: { caseId: record.id, status: "SCHEDULED", startsAt: { gt: new Date() } }, data: { status: "CANCELLED", version: { increment: 1 } } });
      } else if (data.operation === "schedule") {
        if (record.status === "CLOSED") throw new PsychologyError("Reabre la ficha antes de programar una cita");
        if (!record.student.isActive || !record.psychologist.isActive || record.psychologist.role !== "PSYCHOLOGIST") throw new PsychologyError("El estudiante y el profesional deben estar activos");
        const startsAt = appointmentTime(data.startsAt)!;
        const endsAt = new Date(startsAt.getTime() + Number(data.minutes) * 60000);
        if (startsAt <= new Date()) throw new PsychologyError("La cita debe estar en el futuro");
        const conflict = await tx.psychologyAppointment.findFirst({ where: {
          status: "SCHEDULED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
          case: { OR: [{ psychologistId: record.psychologistId }, { studentId: record.studentId }] },
        }, select: { id: true } });
        if (conflict) throw new PsychologyError("El profesional o estudiante ya tiene una cita en ese horario");
        await tx.psychologyAppointment.create({ data: { caseId: record.id, startsAt, endsAt } });
      } else {
        if (data.status !== "CANCELLED" && !clinical) throw new PsychologyError("Solo el profesional asignado puede confirmar la atención o inasistencia");
        const appointment = await tx.psychologyAppointment.findFirst({ where: { id: data.appointmentId, caseId: record.id } });
        if (!appointment || appointment.version !== data.version || appointment.status !== "SCHEDULED") throw new PsychologyError("La cita ya cambió de estado. Actualiza la página");
        if (data.status !== "CANCELLED" && appointment.startsAt > new Date()) throw new PsychologyError("Espera hasta la hora de la cita para registrar su resultado");
        await tx.psychologyAppointment.update({ where: { id: appointment.id }, data: { status: data.status, version: { increment: 1 } } });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof PsychologyError) errorMessage = error.message;
    else if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) errorMessage = "Otra persona modificó estos datos. Actualiza y vuelve a intentarlo";
    else throw error;
  }
  revalidatePath("/psychology", "layout");
  if (caseId) revalidatePath(`/psychology/${caseId}`);
  // Do not place private note text in redirects or diagnostic messages.
  const path = errorMessage ? "/psychology" : caseId ? `/psychology/${encodeURIComponent(caseId)}` : "/psychology";
  redirect(`${path}?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "success=Datos+guardados"}`);
}
