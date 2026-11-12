import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

export const getCourseAccess = cache(async (courseId: string) => {
  const user = await requireUser();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: true,
      enrollments: {
        where: { userId: user.id },
      },
    },
  });

  if (!course) notFound();

  const isInstructor =
    course.instructorId === user.id || user.role === "ADMIN";
  const enrollment = course.enrollments[0] ?? null;

  if (!isInstructor && !enrollment) notFound();

  return {
    user,
    course,
    isInstructor,
    enrollment,
    canManage: isInstructor,
  };
});

export async function requireCourseManager(courseId: string) {
  const access = await getCourseAccess(courseId);
  if (!access.canManage) {
    redirect(`/courses/${courseId}`);
  }
  return access;
}
