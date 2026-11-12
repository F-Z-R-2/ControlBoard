import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { es } from "date-fns/locale";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import type { PendingTaskGroup } from "@/components/pending-tasks";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const courses = await prisma.course.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { instructorId: user.id },
              { enrollments: { some: { userId: user.id } } },
            ],
          },
    select: { id: true },
  });

  const courseIds = courses.map((course) => course.id);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const horizon = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  const lookback = subDays(todayStart, 7);

  const assignments = courseIds.length
    ? await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          dueAt: { gte: lookback, lte: horizon },
        },
        include: {
          course: { select: { id: true, code: true, title: true } },
          submissions: {
            where:
              user.role === "STUDENT"
                ? { studentId: user.id }
                : { grade: null },
            select: { id: true, studentId: true, grade: true },
          },
        },
        orderBy: { dueAt: "asc" },
      })
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
