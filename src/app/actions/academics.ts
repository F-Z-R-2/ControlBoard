"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { academicSchema, periodFitsYear, periodsOverlap } from "@/lib/academics";
import { requireStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/roles";

class AcademicError extends Error {}

export async function saveAcademicAction(formData: FormData) {
  const current = await requireStaff();
  const values = Object.fromEntries(formData);
  const parsed = academicSchema.safeParse({ ...values, id: values.id || undefined });
  if (!parsed.success) redirect(`/academics?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  const data = parsed.data;
  let errorMessage: string | undefined;
  let selectedYear = "yearId" in data ? data.yearId : data.kind === "year" ? data.id : undefined;
  try {
    await prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: current.id } });
      if (!actor?.isActive || !isStaff(actor.role)) throw new AcademicError("No tienes permiso para gestionar la estructura académica");
      if (data.kind === "year") {
        const dates = { startsOn: new Date(`${data.startsOn}T00:00:00Z`), endsOn: new Date(`${data.endsOn}T00:00:00Z`) };
        if (data.id) {
          const existing = await tx.academicYear.findUnique({ where: { id: data.id }, include: { periods: true } });
          if (!existing) throw new AcademicError("El año lectivo ya no existe");
          if (existing.periods.some(period => !periodFitsYear(period, dates))) throw new AcademicError("Las fechas dejarían periodos fuera del año lectivo");
          await tx.academicYear.update({ where: { id: data.id }, data: { name: data.name, ...dates, isClosed: data.isClosed } });
        } else {
          const created = await tx.academicYear.create({ data: { name: data.name, ...dates, isClosed: data.isClosed } });
          selectedYear = created.id;
        }
      } else if (data.kind === "grade") {
        const fields = { name: data.name, level: data.level, position: data.position };
        if (data.id) {
          if (await tx.schoolSection.count({ where: { gradeId: data.id, year: { isClosed: true } } })) throw new AcademicError("Este grado tiene secciones en años cerrados y no puede modificarse");
          await tx.schoolGrade.update({ where: { id: data.id }, data: fields });
        } else await tx.schoolGrade.create({ data: fields });
      } else if (data.kind === "period" || data.kind === "section") {
        const year = await tx.academicYear.findUnique({ where: { id: data.yearId } });
        if (!year || year.isClosed) throw new AcademicError("Selecciona un año lectivo abierto");
        if (data.kind === "period") {
          const dates = { startsOn: new Date(`${data.startsOn}T00:00:00Z`), endsOn: new Date(`${data.endsOn}T00:00:00Z`) };
          if (!periodFitsYear(dates, year)) throw new AcademicError("El periodo debe estar dentro de las fechas del año lectivo");
          const periods = await tx.academicPeriod.findMany({ where: { yearId: year.id } });
          if (data.id && !periods.some(period => period.id === data.id)) throw new AcademicError("No se puede trasladar un periodo a otro año");
          if (periods.some(period => period.id !== data.id && periodsOverlap(period, dates))) throw new AcademicError("El periodo se superpone con otro del mismo año");
          const fields = { yearId: year.id, name: data.name, ...dates };
          if (data.id) await tx.academicPeriod.update({ where: { id: data.id }, data: fields });
          else await tx.academicPeriod.create({ data: fields });
        } else {
          if (!await tx.schoolGrade.findUnique({ where: { id: data.gradeId } })) throw new AcademicError("El grado no existe");
          if (data.id) {
            const section = await tx.schoolSection.findUnique({ where: { id: data.id } });
            if (!section || section.yearId !== year.id || section.gradeId !== data.gradeId) throw new AcademicError("No se puede trasladar una sección a otro año o grado");
            await tx.schoolSection.update({ where: { id: data.id }, data: { name: data.name } });
          } else await tx.schoolSection.create({ data: { name: data.name, yearId: year.id, gradeId: data.gradeId } });
        }
      } else {
        const course = await tx.course.findUnique({ where: { id: data.courseId }, include: { section: { include: { year: true } }, academicPeriod: { include: { year: true } } } });
        if (!course) throw new AcademicError("El curso no existe");
        if (course.section?.year.isClosed || course.academicPeriod?.year.isClosed) throw new AcademicError("Reabre el año lectivo para modificar la vinculación del curso");
        if (data.kind === "unlink") {
          selectedYear = course.section?.yearId;
          await tx.course.update({ where: { id: course.id }, data: { sectionId: null, academicPeriodId: null } });
        } else {
          const section = await tx.schoolSection.findUnique({ where: { id: data.sectionId }, include: { year: true } });
          const period = await tx.academicPeriod.findUnique({ where: { id: data.academicPeriodId } });
          if (!section || !period || section.yearId !== period.yearId || section.year.isClosed) throw new AcademicError("La sección y el periodo deben pertenecer al mismo año abierto");
          await tx.course.update({ where: { id: course.id }, data: { sectionId: section.id, academicPeriodId: period.id } });
          selectedYear = section.yearId;
        }
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof AcademicError) errorMessage = error.message;
    else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") errorMessage = "Ya existe un registro con ese nombre en la misma estructura";
      else if (error.code === "P2025" || error.code === "P2003") errorMessage = "Alguno de los registros seleccionados ya no existe";
      else if (error.code === "P2034") errorMessage = "Otra persona modificó los datos. Revisa y vuelve a intentarlo";
      else throw error;
    } else throw error;
  }
  if (errorMessage) selectedYear = undefined;
  revalidatePath("/", "layout");

  redirect(`/academics?${selectedYear ? `year=${encodeURIComponent(selectedYear)}&` : ""}${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "success=Cambios+guardados"}`);
}
