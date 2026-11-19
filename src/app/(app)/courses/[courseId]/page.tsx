import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Megaphone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import type { Announcement, Assignment, ContentItem, User } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";
import { formatDateTime, formatRelative } from "@/lib/utils";

type AnnouncementWithAuthor = Announcement & { author: User };

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course, canManage } = await getCourseAccess(courseId);

  const [announcements, assignments, content, enrollmentCount] = await Promise.all([
    db.sql<AnnouncementWithAuthor>`
      SELECT a.*, to_jsonb(u) AS author
      FROM "Announcement" a
      JOIN "User" u ON u."id" = a."authorId"
      WHERE a."courseId" = ${course.id}
      ORDER BY a."createdAt" DESC
      LIMIT 3
    `,
    db.sql<Assignment>`
      SELECT * FROM "Assignment"
      WHERE "courseId" = ${course.id}
      ORDER BY "dueAt" ASC
      LIMIT 4
    `,
    db.sql<ContentItem>`
      SELECT * FROM "ContentItem"
      WHERE "courseId" = ${course.id}
      ORDER BY "position" ASC
      LIMIT 4
    `,
    db.sql<{ count: number }>`
      SELECT COUNT(*)::int AS count FROM "Enrollment" WHERE "courseId" = ${course.id}
    `,
  ]);
  const studentCount = enrollmentCount[0]?.count ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sobre el curso</CardTitle>
            <CardDescription>
              Información general y accesos rápidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">
              {course.description || "Este curso aún no tiene descripción."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="border border-[#e5e5e5] bg-[#fafafa] p-3">
                <p className="text-xs text-slate-500">Periodo</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {course.term}
                </p>
              </div>
              <div className="border border-[#e5e5e5] bg-[#fafafa] p-3">
                <p className="text-xs text-slate-500">Estudiantes</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {studentCount}
                </p>
              </div>
              <div className="border border-[#e5e5e5] bg-[#fafafa] p-3">
                <p className="text-xs text-slate-500">Código para unirse</p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-900">
                  {course.code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-indigo-600" />
                Próximas tareas
              </CardTitle>
              <CardDescription>Fechas de entrega del curso.</CardDescription>
            </div>
            <Link
              href={`/courses/${course.id}/assignments`}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay tareas publicadas.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {assignments.map((assignment) => (
                  <li key={assignment.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/courses/${course.id}/assignments/${assignment.id}`}
                      className="flex items-center justify-between gap-3 group"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">
                          {assignment.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatRelative(assignment.dueAt)} ·{" "}
                          {assignment.points} pts
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Contenido reciente
              </CardTitle>
              <CardDescription>Material publicado por el docente.</CardDescription>
            </div>
            <Link
              href={`/courses/${course.id}/content`}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Ver todo
            </Link>
          </CardHeader>
          <CardContent>
            {content.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todavía no hay contenido publicado.
              </p>
            ) : (
              <ul className="space-y-2">
                {content.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 border border-[#e5e5e5] bg-[#fafafa] px-3 py-2"
                  >
                    <span className="truncate text-sm text-slate-700">
                      {item.title}
                    </span>
                    <Badge variant="slate">{item.type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Acciones del docente</CardTitle>
              <CardDescription>
                Publica material y acompaña al grupo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/courses/${course.id}/announcements`}
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full justify-start",
                })}
              >
                <Megaphone className="h-4 w-4 text-indigo-600" />
                Publicar anuncio
              </Link>
              <Link
                href={`/courses/${course.id}/assignments`}
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full justify-start",
                })}
              >
                <ClipboardList className="h-4 w-4 text-indigo-600" />
                Crear tarea
              </Link>
              <Link
                href={`/courses/${course.id}/content`}
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full justify-start",
                })}
              >
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Agregar contenido
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-indigo-600" />
              Anuncios
            </CardTitle>
            <Link
              href={`/courses/${course.id}/announcements`}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay anuncios publicados.
              </p>
            ) : (
              <ul className="space-y-3">
                {announcements.map((announcement) => (
                  <li
                    key={announcement.id}
                    className="border border-[#e5e5e5] p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {announcement.title}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                      {announcement.body}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {announcement.author.name} ·{" "}
                      {formatDateTime(announcement.createdAt)}
                    </p>
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
