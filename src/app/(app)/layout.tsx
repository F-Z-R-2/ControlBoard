import { isAdmin as isAdministrator } from "@/lib/roles";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { PendingTasks } from "@/components/pending-tasks";
import { db } from "@/lib/db";
import type { Assignment, Course } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";

type AssignmentTask = Assignment & {
  course: Pick<Course, "id" | "code" | "title">;
  hasOwnSubmission: boolean;
  ungradedCount: number;
};

async function loadPendingTasks(user: { id: string; role: string }) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const horizon = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  const lookback = subDays(todayStart, 7);

  const assignments = await db.query<AssignmentTask>(
    `SELECT a.*,
       jsonb_build_object('id', c."id", 'code', c."code", 'title', c."title") AS "course",
       EXISTS (
         SELECT 1 FROM "Submission" own
         WHERE own."assignmentId" = a."id" AND own."studentId" = $2
       ) AS "hasOwnSubmission",
       (SELECT COUNT(*)::int FROM "Submission" pending
         WHERE pending."assignmentId" = a."id" AND pending."grade" IS NULL
       ) AS "ungradedCount"
     FROM "Assignment" a
     JOIN "Course" c ON c."id" = a."courseId"
     WHERE ($1::boolean OR c."instructorId" = $2 OR EXISTS (
       SELECT 1 FROM "Enrollment" e WHERE e."courseId" = c."id" AND e."userId" = $2
     ))
       AND a."dueAt" >= $3 AND a."dueAt" <= $4
     ORDER BY a."dueAt" ASC`,
    [isAdministrator(user.role), user.id, lookback, horizon],
  );

  const pending = assignments.filter(
    (assignment) =>
      assignment.dueAt &&
      (user.role !== "STUDENT" || !assignment.hasOwnSubmission),
  );

  function toItem(assignment: (typeof pending)[number]) {
    const dueAt = assignment.dueAt as Date;
    const ungraded = assignment.ungradedCount;
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

  return [
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
}

async function PendingTasksContent({ groups }: { groups: ReturnType<typeof loadPendingTasks> }) {
  return <PendingTasks groups={await groups} />;
}

function PendingTasksLoading() {
  return <div className="flex-1 animate-pulse space-y-4 p-5" aria-label="Cargando tareas pendientes"><div className="h-5 w-40 rounded bg-slate-200" /><div className="h-20 rounded border bg-slate-50" /><div className="h-20 rounded border bg-slate-50" /></div>;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const taskGroups = loadPendingTasks({ id: user.id, role: user.role });
  const taskPanel = <Suspense fallback={<PendingTasksLoading />}><PendingTasksContent groups={taskGroups} /></Suspense>;

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
      taskPanel={taskPanel}
    >
      {children}
    </AppShell>
  );
}
