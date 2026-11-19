import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type {
  AcademicPeriod,
  AcademicYear,
  Course,
  Enrollment,
  SchoolGrade,
  SchoolSection,
  User,
} from "@/lib/db-types";
import { isAdmin, isStaff } from "@/lib/roles";

type CurrentUser = Pick<User, "id" | "name" | "email" | "image" | "role" | "isActive">;

type CourseWithRelations = Course & {
  instructor: User;
  section: (SchoolSection & { grade: SchoolGrade; year: AcademicYear }) | null;
  academicPeriod: AcademicPeriod | null;
  enrollments: Enrollment[];
};

async function loadSection(
  sectionId: string | null,
): Promise<CourseWithRelations["section"]> {
  if (!sectionId) return null;
  const sections = await db.sql<SchoolSection>`
    SELECT * FROM "SchoolSection" WHERE "id" = ${sectionId} LIMIT 1
  `;
  const section = sections[0];
  if (!section) return null;
  const [grades, years] = await Promise.all([
    db.sql<SchoolGrade>`SELECT * FROM "SchoolGrade" WHERE "id" = ${section.gradeId} LIMIT 1`,
    db.sql<AcademicYear>`SELECT * FROM "AcademicYear" WHERE "id" = ${section.yearId} LIMIT 1`,
  ]);
  return { ...section, grade: grades[0]!, year: years[0]! };
}

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const users = await db.sql<CurrentUser>`
    SELECT "id", "name", "email", "image", "role", "isActive"
    FROM "User" WHERE "id" = ${session.user.id} LIMIT 1
  `;
  const user = users[0];
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

  const courses = await db.sql<Course>`
    SELECT * FROM "Course" WHERE "id" = ${courseId} LIMIT 1
  `;
  const course = courses[0];
  if (!course) notFound();

  const enrollments = await db.sql<Enrollment>`
    SELECT * FROM "Enrollment" WHERE "courseId" = ${courseId} AND "userId" = ${user.id}
  `;
  const enrollment = enrollments[0] ?? null;

  const isInstructor = course.instructorId === user.id || isAdmin(user.role);
  if (!isInstructor && !enrollment) notFound();

  const instructors = await db.sql<User>`
    SELECT * FROM "User" WHERE "id" = ${course.instructorId} LIMIT 1
  `;
  const [section, academicPeriods] = await Promise.all([
    loadSection(course.sectionId),
    course.academicPeriodId
      ? db.sql<AcademicPeriod>`
          SELECT * FROM "AcademicPeriod" WHERE "id" = ${course.academicPeriodId} LIMIT 1
        `
      : Promise.resolve([] as AcademicPeriod[]),
  ]);

  const courseWithRelations: CourseWithRelations = {
    ...course,
    instructor: instructors[0]!,
    section,
    academicPeriod: academicPeriods[0] ?? null,
    enrollments,
  };

  return {
    user,
    course: courseWithRelations,
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
