import { isAdmin as isAdministrator } from "@/lib/roles";
import {
  Activity,
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
import { db } from "@/lib/db";
import type { Announcement, Assignment, Course, Submission, User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";
import { formatRelative } from "@/lib/utils";
import { schoolLevels } from "@/lib/academics";

export const metadata: Metadata = {
  title: "Actividad",
};

type DashboardCourse = Course & {
  instructor: User;
  _count: { enrollments: number; assignments: number };
};

type UpcomingAssignment = Assignment & {
  course: Course;
  submissions: Pick<Submission, "id" | "grade">[];
};

type DashboardAnnouncement = Announcement & {
  course: Course;
  author: User;
};

type AdminMetricRow = { courses: number; students: number; toGrade: number; attendance: number };
type AdminCourseRow = Course & { instructorName: string; gradeName: string | null; sectionName: string | null; level: "INITIAL" | "PRIMARY" | "SECONDARY" | null; yearName: string | null; studentCount: number };
type AdminActivityRow = { kind: string; title: string; createdAt: Date; authorName: string; context: string; courseId: string | null };

async function AdminDashboard({ name }: { name: string }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const [metricsRows, courses, levels, activity] = await Promise.all([
    db.sql<AdminMetricRow>`
      SELECT
        (SELECT COUNT(*)::int FROM "Course") AS courses,
        (SELECT COUNT(*)::int FROM "User" WHERE "role" = 'STUDENT' AND "isActive" = TRUE) AS students,
        (SELECT COUNT(*)::int FROM "Submission" WHERE "grade" IS NULL) AS "toGrade",
        (SELECT COUNT(*)::int FROM "Attendance" WHERE "date" = ${new Date(`${today}T00:00:00.000Z`)}) AS attendance
    `,
    db.query<AdminCourseRow>(
      `SELECT c.*, u."name" AS "instructorName", sg."name" AS "gradeName", ss."name" AS "sectionName",
         sg."level", ay."name" AS "yearName",
         (SELECT COUNT(*)::int FROM "Enrollment" e WHERE e."courseId" = c."id" AND e."role" = 'STUDENT') AS "studentCount"
       FROM "Course" c JOIN "User" u ON u."id" = c."instructorId"
       LEFT JOIN "SchoolSection" ss ON ss."id" = c."sectionId"
       LEFT JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
       LEFT JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
       ORDER BY c."updatedAt" DESC LIMIT 4`,
    ),
    db.sql<{ level: "PRIMARY" | "SECONDARY"; count: number }>`
      SELECT sg."level", COUNT(*)::int AS count
      FROM "StudentProfile" sp JOIN "User" u ON u."id" = sp."userId" AND u."isActive" = TRUE
      JOIN "SchoolSection" ss ON ss."id" = sp."schoolSectionId"
      JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
      WHERE sg."level" IN ('PRIMARY', 'SECONDARY') GROUP BY sg."level" ORDER BY sg."level"
    `,
    db.query<AdminActivityRow>(
      `SELECT * FROM (
         SELECT 'Anuncio' AS kind, a."title", a."createdAt", u."name" AS "authorName", c."title" AS context, c."id" AS "courseId"
           FROM "Announcement" a JOIN "User" u ON u."id" = a."authorId" JOIN "Course" c ON c."id" = a."courseId"
         UNION ALL
         SELECT 'Tarea' AS kind, a."title", a."createdAt", c."title" AS "authorName", c."code" AS context, c."id" AS "courseId"
           FROM "Assignment" a JOIN "Course" c ON c."id" = a."courseId"
         UNION ALL
         SELECT 'Matrícula' AS kind, u."name" AS title, e."createdAt", u."name" AS "authorName", c."code" AS context, c."id" AS "courseId"
           FROM "Enrollment" e JOIN "User" u ON u."id" = e."userId" JOIN "Course" c ON c."id" = e."courseId"
       ) recent ORDER BY "createdAt" DESC LIMIT 6`,
    ),
  ]);
  const metric = metricsRows[0] ?? { courses: 0, students: 0, toGrade: 0, attendance: 0 };
  const levelMap = new Map(levels.map((item) => [item.level, item.count]));
  const maximum = Math.max(1, ...levels.map((item) => item.count));
  const dateLabel = new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone: "America/Lima" }).format(new Date());

  return <div className="min-h-full bg-[#f4f6f9]">
    <header className="border-b border-slate-200 bg-white px-5 py-7 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0b3ddb]">ControlBoard · Gestión institucional</p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Hola, {name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-slate-600">Panel de Administración <span className="mx-1 text-slate-300">/</span> {dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/courses" className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><BookOpen className="h-4 w-4" /> Ver cursos</Link>
          <Link href="/courses?create=1" className="inline-flex h-10 items-center gap-2 bg-[#0b3ddb] px-4 text-sm font-medium text-white hover:bg-[#0932b5]"><ArrowRight className="h-4 w-4" /> Crear curso</Link>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Indicadores institucionales">
        {[
          { label: "Cursos registrados", value: metric.courses, helper: "Oferta académica", icon: BookOpen, color: "blue" },
          { label: "Por calificar", value: metric.toGrade, helper: "Entregas pendientes", icon: ClipboardCheck, color: "amber" },
          { label: "Estudiantes activos", value: metric.students, helper: "Cuentas habilitadas", icon: Users, color: "emerald" },
          { label: "Registros de hoy", value: metric.attendance, helper: "Asistencias tomadas", icon: CalendarClock, color: "violet" },
        ].map(({ label, value, helper, icon: Icon, color }) => <article key={label} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-[11px] text-slate-500">{helper}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-md ${color === "blue" ? "bg-blue-50 text-blue-800" : color === "amber" ? "bg-amber-50 text-amber-800" : color === "emerald" ? "bg-emerald-50 text-emerald-800" : "bg-violet-50 text-violet-800"}`}><Icon className="h-4 w-4" /></span></div>
        </article>)}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="admin-courses-title">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 id="admin-courses-title" className="text-base font-semibold text-slate-950">Cursos recientes</h2><p className="mt-1 text-xs text-slate-500">Vista rápida de grupos y responsables.</p></div><Link href="/courses" className="text-xs font-semibold text-blue-800 hover:underline">Ver directorio</Link></div>
            {courses.length ? <div className="divide-y divide-slate-100">{courses.map((course) => <Link key={course.id} href={`/courses/${course.id}`} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50"><div className="flex min-w-0 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-800"><BookOpen className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{course.title}</p><p className="mt-1 truncate text-xs text-slate-500">{course.code} · {course.instructorName}</p><p className="mt-1 text-[11px] text-slate-500">{course.level ? `${schoolLevels[course.level]} · ${course.gradeName} ${course.sectionName}` : "Sin sección"}{course.yearName ? ` · ${course.yearName}` : ""}</p></div></div><div className="flex items-center gap-4 text-right"><div><p className="text-sm font-semibold text-slate-900">{course.studentCount}</p><p className="text-[10px] text-slate-500">estudiantes</p></div><ArrowRight className="h-4 w-4 text-slate-400" /></div></Link>)}</div> : <p className="p-8 text-center text-sm text-slate-500">Todavía no hay cursos registrados.</p>}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="enrollment-level-title">
            <div className="mb-5 flex items-end justify-between gap-3"><div><h2 id="enrollment-level-title" className="text-base font-semibold text-slate-950">Estudiantes por nivel</h2><p className="mt-1 text-xs text-slate-500">Cuentas activas con sección asignada.</p></div><Link href="/students" className="text-xs font-semibold text-blue-800 hover:underline">Abrir estudiantes</Link></div>
            <div className="space-y-4">{(["PRIMARY", "SECONDARY"] as const).map((level) => { const count = levelMap.get(level) ?? 0; return <div key={level}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-slate-700">{schoolLevels[level]}</span><span className="tabular-nums text-slate-600">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0b3ddb] transition-[width]" style={{ width: `${Math.max(count ? 7 : 0, count / maximum * 100)}%` }} /></div></div>; })}</div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="quick-admin-title">
            <h2 id="quick-admin-title" className="text-base font-semibold text-slate-950">Accesos administrativos</h2><p className="mt-1 text-xs text-slate-500">Tareas frecuentes del colegio.</p>
            <div className="mt-4 grid gap-2">{[
              ["Registrar estudiante", "/students#student-form", GraduationCap],
              ["Administrar cuentas", "/administration", Users],
              ["Asistencia diaria", "/attendance", CalendarClock],
              ["Periodo y secciones", "/academics", BookOpen],
            ].map(([label, href, Icon]) => <Link key={label as string} href={href as string} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50/40 hover:text-blue-900"><span className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-blue-800" />{label as string}</span><ArrowRight className="h-3.5 w-3.5 text-slate-400" /></Link>)}</div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="recent-activity-title">
            <div className="mb-4 flex items-center justify-between"><div><h2 id="recent-activity-title" className="text-base font-semibold text-slate-950">Actividad reciente</h2><p className="mt-1 text-xs text-slate-500">Novedades de cursos y matrículas.</p></div><Activity className="h-4 w-4 text-blue-800" /></div>
            {activity.length ? <ol className="space-y-4">{activity.map((item, index) => <li key={`${item.kind}-${item.createdAt.toISOString()}-${index}`} className="relative flex gap-3"><span className="relative mt-1.5 flex h-2 w-2 shrink-0"><span className="absolute h-2 w-2 rounded-full bg-blue-700" />{index < activity.length - 1 && <span className="absolute left-[3px] top-2 h-9 w-px bg-slate-200" />}</span><div className="min-w-0"><p className="text-xs font-medium text-slate-800">{item.kind} · {item.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.authorName}{item.context ? ` · ${item.context}` : ""}</p><p className="mt-1 text-[10px] text-slate-400">{formatRelative(item.createdAt)}</p></div></li>)}</ol> : <p className="text-sm text-slate-500">La actividad reciente aparecerá cuando se publiquen anuncios o tareas.</p>}
          </section>
        </aside>
      </section>
    </div>
  </div>;
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "PSYCHOLOGIST") redirect("/psychology");
  const isAdmin = isAdministrator(user.role);
  if (isAdmin) return <AdminDashboard name={user.name ?? "Administración"} />;
  const isStudent = user.role === "STUDENT";

  const courseParams = isAdmin ? [] : [user.id, user.id];
  const courseWhere = isAdmin
    ? ""
    : `WHERE c."instructorId" = $1 OR EXISTS (
         SELECT 1 FROM "Enrollment" e
         WHERE e."courseId" = c."id" AND e."userId" = $2
       )`;
  const courseRows = await db.query<
    Course & { instructor: User; enrollmentCount: number; assignmentCount: number }
  >(
    `SELECT c.*, to_jsonb(u) AS "instructor",
       (SELECT COUNT(*)::int FROM "Enrollment" e WHERE e."courseId" = c."id") AS "enrollmentCount",
       (SELECT COUNT(*)::int FROM "Assignment" a WHERE a."courseId" = c."id") AS "assignmentCount"
     FROM "Course" c
     JOIN "User" u ON u."id" = c."instructorId"
     ${courseWhere}
     ORDER BY c."updatedAt" DESC`,
    courseParams,
  );
  const courses: DashboardCourse[] = courseRows.map(
    ({ enrollmentCount, assignmentCount, ...course }) => ({
      ...course,
      _count: { enrollments: enrollmentCount, assignments: assignmentCount },
    }),
  );

  const courseIds = courses.map((course) => course.id);
  const placeholders = courseIds.map((_, index) => `$${index + 1}`).join(", ");
  const upcomingParams: unknown[] = [...courseIds];
  upcomingParams.push(user.id);
  const studentParam = `$${upcomingParams.length}`;
  upcomingParams.push(new Date());
  const dueParam = `$${upcomingParams.length}`;

  const [upcoming, announcements, gradedRows, toGradeRows] = await Promise.all([
    courseIds.length
      ? db.query<UpcomingAssignment>(
          `SELECT a.*, to_jsonb(c) AS "course",
             COALESCE((
               SELECT jsonb_agg(jsonb_build_object('id', s."id", 'grade', s."grade"))
               FROM "Submission" s
               WHERE s."assignmentId" = a."id" AND s."studentId" = ${studentParam}
             ), '[]'::jsonb) AS "submissions"
           FROM "Assignment" a
           JOIN "Course" c ON c."id" = a."courseId"
           WHERE a."courseId" IN (${placeholders}) AND a."dueAt" >= ${dueParam}
           ORDER BY a."dueAt" ASC
           LIMIT 5`,
          upcomingParams,
        )
      : Promise.resolve([] as UpcomingAssignment[]),
    courseIds.length
      ? db.query<DashboardAnnouncement>(
          `SELECT a.*, to_jsonb(c) AS "course", to_jsonb(u) AS "author"
           FROM "Announcement" a
           JOIN "Course" c ON c."id" = a."courseId"
           JOIN "User" u ON u."id" = a."authorId"
           WHERE a."courseId" IN (${placeholders})
           ORDER BY a."createdAt" DESC
           LIMIT 4`,
          courseIds,
        )
      : Promise.resolve([] as DashboardAnnouncement[]),
    isStudent
      ? db.sql<{ avg: number | null }>`
          SELECT AVG("grade")::float8 AS "avg" FROM "Submission"
          WHERE "studentId" = ${user.id} AND "grade" IS NOT NULL
        `
      : Promise.resolve([] as { avg: number | null }[]),
    isAdmin
      ? db.sql<{ count: number }>`
          SELECT COUNT(*)::int AS "count" FROM "Submission" s
          JOIN "Assignment" a ON a."id" = s."assignmentId"
          JOIN "Course" c ON c."id" = a."courseId"
          WHERE s."grade" IS NULL
        `
      : db.sql<{ count: number }>`
          SELECT COUNT(*)::int AS "count" FROM "Submission" s
          JOIN "Assignment" a ON a."id" = s."assignmentId"
          JOIN "Course" c ON c."id" = a."courseId"
          WHERE s."grade" IS NULL AND c."instructorId" = ${user.id}
        `,
  ]);

  const graded = isStudent
    ? { _avg: { grade: gradedRows[0]?.avg ?? null } }
    : null;
  const toGrade = toGradeRows[0]!.count;

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
