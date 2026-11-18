import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { isAdmin, isStaff } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, isActive: true },
  });
  return user?.isActive ? user : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.role)) notFound();
  return user;
}

export const getCourseAccess = cache(async (courseId: string) => {
  const user = await requireUser();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: true,
      section: { include: { grade: true, year: true } },
      academicPeriod: true,
      enrollments: {
        where: { userId: user.id },
      },
    },
  });

  if (!course) notFound();

  const isInstructor =
    course.instructorId === user.id || isAdmin(user.role);
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
