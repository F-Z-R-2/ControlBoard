import { isAdmin as isAdministrator } from "@/lib/roles";
import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { CoursesWorkspace } from "@/components/courses-workspace";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Cursos",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const canCreate = user.role === "INSTRUCTOR" || isAdministrator(user.role);

  const courses = await prisma.course.findMany({
    where:
      isAdministrator(user.role)
        ? {}
        : {
            OR: [
              { instructorId: user.id },
              { enrollments: { some: { userId: user.id } } },
            ],
          },
    include: { instructor: true, section: { include: { year: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      {error ? (
        <div className="absolute left-1/2 top-4 z-50 w-[min(90%,560px)] -translate-x-1/2">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <CoursesWorkspace
        canCreate={canCreate}
        courses={courses.map((course) => ({
          id: course.id,
          code: course.code,
          title: course.title,
          term: course.section?.year.name ?? course.term,
          instructorName: course.instructor.name,
        }))}
      />
    </>
  );
}
