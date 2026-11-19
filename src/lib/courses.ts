import { db } from "@/lib/db";
import type { Course, User } from "@/lib/db-types";
import { isAdmin as isAdministrator } from "@/lib/roles";

type AccessibleCourse = Course & {
  instructor: User;
  enrollmentCount: number;
  assignmentCount: number;
};

export async function getAccessibleCourses(user: { id: string; role: string }) {
  const isAdminRole = isAdministrator(user.role);
  const where = isAdminRole
    ? ""
    : `WHERE c."instructorId" = $1 OR EXISTS (
         SELECT 1 FROM "Enrollment" e
         WHERE e."courseId" = c."id" AND e."userId" = $2
       )`;

  const courses = await db.query<AccessibleCourse>(
    `SELECT c.*,
       to_jsonb(u) AS instructor,
       (SELECT COUNT(*)::int FROM "Enrollment" e WHERE e."courseId" = c."id") AS "enrollmentCount",
       (SELECT COUNT(*)::int FROM "Assignment" a WHERE a."courseId" = c."id") AS "assignmentCount"
     FROM "Course" c
     JOIN "User" u ON u."id" = c."instructorId"
     ${where}
     ORDER BY c."term" DESC, c."title" ASC`,
    isAdminRole ? [] : [user.id, user.id],
  );

  return courses.map(({ enrollmentCount, assignmentCount, ...course }) => ({
    ...course,
    _count: { enrollments: enrollmentCount, assignments: assignmentCount },
  }));
}
