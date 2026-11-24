import { isAdmin as isAdministrator } from "@/lib/roles";
import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { CoursesWorkspace } from "@/components/courses-workspace";
import { db } from "@/lib/db";
import type { AcademicPeriod, AcademicYear, Course, SchoolGrade, SchoolSection, User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Cursos",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; create?: string }>;
}) {
  const user = await requireUser();
  const { error, create } = await searchParams;
  const canCreate = user.role === "INSTRUCTOR" || isAdministrator(user.role);

  const isAdmin = isAdministrator(user.role);
  const [courses, instructors, periodRows, sectionRows] = await Promise.all([
    db.query<
      Course & { instructor: User; section: { year: AcademicYear } | null }
    >(
      `SELECT c.*, to_jsonb(u) AS "instructor",
         CASE WHEN ss."id" IS NULL THEN NULL ELSE jsonb_build_object('year', to_jsonb(ay)) END AS "section"
       FROM "Course" c
       JOIN "User" u ON u."id" = c."instructorId"
       LEFT JOIN "SchoolSection" ss ON ss."id" = c."sectionId"
       LEFT JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
       ${isAdmin ? "" : `WHERE c."instructorId" = $1 OR EXISTS (
         SELECT 1 FROM "Enrollment" e
         WHERE e."courseId" = c."id" AND e."userId" = $2
       )`}
       ORDER BY c."updatedAt" DESC`,
      isAdmin ? [] : [user.id, user.id],
    ),
    isAdmin
      ? db.sql<Pick<User, "id" | "name">>`
          SELECT "id", "name" FROM "User"
          WHERE "role" = 'INSTRUCTOR' AND "isActive" = true
          ORDER BY "name" ASC
        `
      : Promise.resolve([]),
    isAdmin
      ? db.query<AcademicPeriod & { yearName: string }>(
          `SELECT ap.*, ay."name" AS "yearName" FROM "AcademicPeriod" ap
           JOIN "AcademicYear" ay ON ay."id" = ap."yearId"
           WHERE ay."isClosed" = FALSE ORDER BY ay."startsOn" DESC, ap."startsOn" ASC`,
        )
      : Promise.resolve([] as (AcademicPeriod & { yearName: string })[]),
    isAdmin
      ? db.query<SchoolSection & { grade: SchoolGrade; yearName: string }>(
          `SELECT ss.*, to_jsonb(sg) AS "grade", ay."name" AS "yearName"
           FROM "SchoolSection" ss JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
           JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
           WHERE ay."isClosed" = FALSE AND sg."level" IN ('PRIMARY', 'SECONDARY') AND ss."name" IN ('A', 'B')
           ORDER BY ay."startsOn" DESC, sg."level", sg."position", ss."name"`,
        )
      : Promise.resolve([] as (SchoolSection & { grade: SchoolGrade; yearName: string })[]),
  ]);

  return (
    <>
      {error ? (
        <div className="absolute left-1/2 top-4 z-50 w-[min(90%,560px)] -translate-x-1/2">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <CoursesWorkspace
        canCreate={canCreate}
        requireInstructor={isAdmin}
        initialCreate={canCreate && create === "1"}
        instructors={instructors.map((instructor) => ({
          id: instructor.id,
          name: instructor.name,
        }))}
        periods={periodRows.map((period) => ({
          id: period.id,
          yearId: period.yearId,
          name: period.name,
          yearName: period.yearName,
        }))}
        sections={sectionRows.map((section) => ({
          id: section.id,
          yearId: section.yearId,
          yearName: section.yearName,
          gradeName: section.grade.name,
          level: section.grade.level,
          name: section.name,
        }))}
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
