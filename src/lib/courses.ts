import { prisma } from "@/lib/prisma";

export async function getAccessibleCourses(user: { id: string; role: string }) {
  return prisma.course.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { instructorId: user.id },
              { enrollments: { some: { userId: user.id } } },
            ],
          },
    include: {
      instructor: true,
      _count: { select: { enrollments: true, assignments: true } },
    },
    orderBy: [{ term: "desc" }, { title: "asc" }],
  });
}
