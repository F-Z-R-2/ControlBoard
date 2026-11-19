import { isAdmin as isAdministrator } from "@/lib/roles";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { es } from "date-fns/locale";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import type { PendingTaskGroup } from "@/components/pending-tasks";
import { db } from "@/lib/db";
import type { Assignment, Course, Submission } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";

type AssignmentTask = Assignment & {
  course: Pick<Course, "id" | "code" | "title">;
  submissions: Pick<Submission, "id" | "studentId" | "grade">[];
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const courses = isAdministrator(user.role)
    ? await db.sql<{ id: string }>`SELECT "id" FROM "Course"`
    : await db.sql<{ id: string }>`
        SELECT c."id" FROM "Course" c
        WHERE c."instructorId" = ${user.id} OR EXISTS (
          SELECT 1 FROM "Enrollment" e
          WHERE e."courseId" = c."id" AND e."userId" = ${user.id}
        )
      `;

  const courseIds = courses.map((course) => course.id);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const horizon = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  const lookback = subDays(todayStart, 7);

  const placeholders = courseIds.map((_, index) => `$${index + 1}`).join(", ");
  const params: unknown[] = [...courseIds];
  let submissionFilter = `s."grade" IS NULL`;
  if (user.role === "STUDENT") {
    params.push(user.id);
    submissionFilter = `s."studentId" = $${params.length}`;
  }
  params.push(lookback);
  const lookbackParam = `$${params.length}`;
  params.push(horizon);
  const horizonParam = `$${params.length}`;

  const assignments: AssignmentTask[] = courseIds.length
    ? await db.query<AssignmentTask>(
        `SELECT a.*,
           jsonb_build_object('id', c."id", 'code', c."code", 'title', c."title") AS "course",
           COALESCE((
             SELECT jsonb_agg(jsonb_build_object('id', s."id", 'studentId', s."studentId", 'grade', s."grade"))
             FROM "Submission" s
             WHERE s."assignmentId" = a."id" AND ${submissionFilter}
           ), '[]'::jsonb) AS "submissions"
         FROM "Assignment" a
         JOIN "Course" c ON c."id" = a."courseId"
         WHERE a."courseId" IN (${placeholders})
           AND a."dueAt" >= ${lookbackParam} AND a."dueAt" <= ${horizonParam}
         ORDER BY a."dueAt" ASC`,
        params,
      )
    : [];

  const pending = assignments.filter(
    (assignment) =>
      assignment.dueAt &&
      (user.role !== "STUDENT" || assignment.submissions.length === 0),
  );

  function toItem(assignment: (typeof pending)[number]) {
    const dueAt = assignment.dueAt as Date;
    const ungraded = assignment.submissions.length;
    return {
      id: assignment.id,
      title: assignment.title,
      type:
        user.role === "STUDENT"
          ? "Tarea"
          : ungraded > 0
            ? `Tarea · ${ungraded} por calificar`
            : "Tarea",
      course: `${assignment.course.code} · ${assignment.course.title}`,
      date:
        dueAt < now
          ? "Vencida"
          : dueAt <= todayEnd
            ? "Hoy"
            : format(dueAt, "d MMM", { locale: es }),
      time: format(dueAt, "HH:mm", { locale: es }),
      href: `/courses/${assignment.course.id}/assignments/${assignment.id}`,
    };
  }

  const overdue = pending
    .filter((assignment) => assignment.dueAt && assignment.dueAt < now)
    .map(toItem);
  const dueToday = pending
    .filter(
      (assignment) =>
        assignment.dueAt && assignment.dueAt >= now && assignment.dueAt <= todayEnd,
    )
    .map(toItem);
  const dueSoon = pending
    .filter((assignment) => assignment.dueAt && assignment.dueAt > todayEnd)
    .map(toItem);

  const taskGroups: PendingTaskGroup[] = [
    {
      name: "Vencida",
      emptyMessage: "No hay elementos vencidos en los últimos 7 días",
      items: overdue,
    },
    {
      name: "Vence hoy",
      emptyMessage: "No tienes entregas para hoy",
      items: dueToday,
    },
    {
      name: "Vence pronto",
      emptyMessage: "No hay entregas en los próximos 14 días",
      items: dueSoon,
    },
  ];

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
      tasks={taskGroups}
    >
      {children}
    </AppShell>
  );
}
