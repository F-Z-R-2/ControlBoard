import { isAdmin as isAdministrator } from "@/lib/roles";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Megaphone,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { formatRelative } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Actividad",
};

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "PSYCHOLOGIST") redirect("/psychology");
  const isAdmin = isAdministrator(user.role);
  const isStudent = user.role === "STUDENT";

  const courseWhere = isAdmin
    ? {}
    : {
        OR: [
          { instructorId: user.id },
          { enrollments: { some: { userId: user.id } } },
        ],
      };

  const courses = await prisma.course.findMany({
    where: courseWhere,
    include: {
      instructor: true,
      _count: { select: { enrollments: true, assignments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const courseIds = courses.map((course) => course.id);

  const [upcoming, announcements, graded, toGrade] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        dueAt: { gte: new Date() },
      },
      include: {
        course: true,
        submissions: {
          where: { studentId: user.id },
          select: { id: true, grade: true },
        },
      },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: { courseId: { in: courseIds } },
      include: { course: true, author: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    isStudent
      ? prisma.submission.aggregate({
          where: { studentId: user.id, grade: { not: null } },
          _avg: { grade: true },
        })
      : Promise.resolve(null),
    prisma.submission.count({
      where: {
        grade: null,
        assignment: {
          course: isAdmin ? {} : { instructorId: user.id },
        },
      },
    }),
  ]);

  const pending = isStudent
    ? upcoming.filter((assignment) => assignment.submissions.length === 0).length
    : toGrade;

  const totalStudents = courses.reduce(
    (sum, course) => sum + course._count.enrollments,
    0,
  );

  const stats = [
    {
      label: "Cursos activos",
      value: courses.length,
      icon: BookOpen,
      tone: "border-[#c4d3ff] bg-[#eef3ff] text-[#0b3ddb]",
    },
    {
      label: isStudent ? "Entregas pendientes" : "Por calificar",
      value: pending,
      icon: ClipboardCheck,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: isStudent ? "Promedio" : "Estudiantes",
      value: isStudent
        ? graded?._avg.grade
          ? `${Math.round(graded._avg.grade)}%`
          : "—"
        : totalStudents,
      icon: isStudent ? GraduationCap : Users,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={`Hola, ${user.name?.split(" ")[0] ?? "bienvenido"}`}
        description={
          isStudent
            ? "Tu semana académica en ControlBoard."
            : isAdmin
              ? "Vista general de la institución."
              : "Tu espacio docente y tus cursos."
        }
        actions={
          <>
            <Link
              href="/courses"
              className={buttonVariants({ variant: "outline" })}
            >
              Ver cursos
            </Link>
            {!isStudent ? (
              <Link href="/courses" className={buttonVariants()}>
                Crear curso
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </>
        }
      />

      <div className="px-4 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#555]">
                  {stat.label}
                </span>
                <span
                  className={`flex h-9 w-9 items-center justify-center border ${stat.tone}`}
                >
                  <stat.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#242424]">
                {stat.value}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#242424]">Mis cursos</h2>
              <Link
                href="/courses"
                className="text-sm font-medium text-[#0b3ddb] hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {courses.length === 0 ? (
              <Card className="mt-3 p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-[#c9c9c9]" />
                <p className="mt-3 font-medium text-[#242424]">
                  Todavía no tienes cursos
                </p>
                <p className="mt-1 text-sm text-[#666]">
                  {isStudent
                    ? "Únete con el código que te compartió tu profesor."
                    : "Crea tu primer curso para empezar."}
                </p>
                <Link
                  href="/courses"
                  className={buttonVariants({
                    className: "mt-4",
                    size: "sm",
                  })}
                >
                  Ir a cursos
                </Link>
              </Card>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {courses.slice(0, 4).map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <Card id="calendario">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-[#0b3ddb]" />
                  Próximas entregas
                </CardTitle>
                <Link
                  href="/calendar"
                  className="text-xs font-medium text-[#0b3ddb] hover:underline"
                >
                  Calendario
                </Link>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="py-4 text-sm text-[#666]">
                    No hay entregas próximas.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#e5e5e5]">
                    {upcoming.map((assignment) => (
                      <li key={assignment.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          href={`/courses/${assignment.courseId}/assignments/${assignment.id}`}
                          className="group block"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-[#242424] group-hover:text-[#0b3ddb]">
                                {assignment.title}
                              </p>
                              <p className="mt-0.5 text-xs text-[#666]">
                                {assignment.course.code} ·{" "}
                                {formatRelative(assignment.dueAt)}
                              </p>
                            </div>
                            {assignment.submissions.length > 0 ? (
                              <Badge variant="green">Enviada</Badge>
                            ) : (
                              <Badge variant="amber">Pendiente</Badge>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card id="anuncios">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#0b3ddb]" />
                  Anuncios recientes
                </CardTitle>
                <Link
                  href="/announcements"
                  className="text-xs font-medium text-[#0b3ddb] hover:underline"
                >
                  Ver todos
                </Link>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <p className="py-4 text-sm text-[#666]">
                    Sin anuncios por ahora.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {announcements.map((announcement) => (
                      <li
                        key={announcement.id}
                        className="border border-[#e5e5e5] bg-[#fafafa] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#242424]">
                            {announcement.title}
                          </p>
                          <Badge variant="slate">{announcement.course.code}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#666]">
                          {announcement.body}
                        </p>
                        <p className="mt-1.5 text-[11px] text-[#888]">
                          {announcement.author.name} ·{" "}
                          {formatRelative(announcement.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
