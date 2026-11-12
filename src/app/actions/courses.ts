"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

const courseSchema = z.object({
  code: z.string().trim().min(2, "El código es obligatorio").max(20),
  title: z.string().trim().min(3, "El título es obligatorio").max(120),
  term: z.string().trim().min(2, "El periodo es obligatorio").max(40),
  description: z.string().trim().max(1000).optional(),
});

function fail(message: string): never {
  redirect(`/courses?error=${encodeURIComponent(message)}`);
}

export async function createCourseAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") {
    fail("Solo profesores y administradores pueden crear cursos");
  }

  const parsed = courseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    term: formData.get("term"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const code = parsed.data.code.toUpperCase();
  const existing = await prisma.course.findUnique({ where: { code } });
  if (existing) {
    fail("Ya existe un curso con ese código");
  }

  const course = await prisma.course.create({
    data: {
      code,
      title: parsed.data.title,
      term: parsed.data.term,
      description: parsed.data.description ?? "",
      instructorId: user.id,
    },
  });

  revalidatePath("/courses");
  redirect(`/courses/${course.id}`);
}

export async function enrollAction(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (!code) {
    fail("Escribe el código del curso");
  }

  const course = await prisma.course.findUnique({ where: { code } });
  if (!course) {
    fail("No existe un curso con ese código");
  }

  if (course.instructorId === user.id) {
    redirect(`/courses/${course.id}`);
  }

  await prisma.enrollment.upsert({
    where: {
      courseId_userId: { courseId: course.id, userId: user.id },
    },
    update: {},
    create: {
      courseId: course.id,
      userId: user.id,
    },
  });

  revalidatePath("/courses");
  redirect(`/courses/${course.id}`);
}
