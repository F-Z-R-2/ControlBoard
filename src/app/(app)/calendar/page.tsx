import { CalendarClock, Radio, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { Assignment, Course, LiveSession } from "@/lib/db-types";
import { getAccessibleCourses } from "@/lib/courses";
import { requireUser } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarPage() {
  const user = await requireUser();
  const courses = await getAccessibleCourses(user);
  const courseIds = courses.map((course) => course.id);

  const placeholders = courseIds.map((_, index) => `$${index + 1}`).join(", ");
  const [assignments, sessions] = await Promise.all([
    courseIds.length
      ? db.query<Assignment & { course: Course }>(
          `SELECT a.*, to_jsonb(c) AS "course"
           FROM "Assignment" a
           JOIN "Course" c ON c."id" = a."courseId"
           WHERE a."courseId" IN (${placeholders}) AND a."dueAt" IS NOT NULL
           ORDER BY a."dueAt" ASC
           LIMIT 30`,
          courseIds,
        )
      : Promise.resolve([] as (Assignment & { course: Course })[]),
    courseIds.length
      ? db.query<LiveSession & { course: Course }>(
          `SELECT ls.*, to_jsonb(c) AS "course"
           FROM "LiveSession" ls
           JOIN "Course" c ON c."id" = ls."courseId"
           WHERE ls."courseId" IN (${placeholders})
           ORDER BY ls."createdAt" DESC
           LIMIT 20`,
          courseIds,
        )
      : Promise.resolve([] as (LiveSession & { course: Course })[]),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Calendario"
        description="Entregas y clases en vivo de todos tus cursos."
      />
      <div className="grid gap-6 px-4 py-6 sm:px-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#0b3ddb]" />
              Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="py-4 text-sm text-[#666]">
                No hay entregas programadas.
              </p>
            ) : (
              <ul className="divide-y divide-[#e5e5e5]">
                {assignments.map((assignment) => (
                  <li key={assignment.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/courses/${assignment.courseId}/assignments/${assignment.id}`}
                      className="group flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#242424] group-hover:text-[#0b3ddb]">
                          {assignment.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#666]">
                          {assignment.course.code} · {assignment.course.title}
                        </p>
                        <p className="mt-1 text-[11px] text-[#888]">
                          {formatDateTime(assignment.dueAt)}
                        </p>
                      </div>
                      <Badge variant="slate">{assignment.points} pts</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-4 w-4 text-[#0b3ddb]" />
              Clases en vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="py-4 text-sm text-[#666]">
                No hay aulas virtuales creadas.
              </p>
            ) : (
              <ul className="divide-y divide-[#e5e5e5]">
                {sessions.map((session) => (
                  <li key={session.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/courses/${session.courseId}/live/${session.id}`}
                      className="group flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#242424] group-hover:text-[#0b3ddb]">
                          {session.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#666]">
                          {session.course.code} · {session.course.title}
                        </p>
                        <p className="mt-1 text-[11px] text-[#888]">
                          {formatDateTime(session.createdAt)}
                        </p>
                      </div>
                      {session.status === "LIVE" ? (
                        <Badge variant="red">
                          <Radio className="mr-1 h-3 w-3" />
                          En vivo
                        </Badge>
                      ) : session.status === "ENDED" ? (
                        <Badge variant="slate">Finalizada</Badge>
                      ) : (
                        <Badge variant="amber">Programada</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
