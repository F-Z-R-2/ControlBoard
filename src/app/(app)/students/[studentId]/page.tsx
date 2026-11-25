import { ArrowLeft, BookOpen, CalendarCheck, GraduationCap, Mail, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { setStudentStatusAction } from "@/app/actions/students";
import { StudentForm, type StudentFormData, type StudentSectionOption } from "@/components/student-form";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import type { AcademicYear, Attendance, Course, SchoolGrade, SchoolSection, StudentGuardian, StudentProfile, User } from "@/lib/db-types";
import { requireStaff } from "@/lib/permissions";
import { schoolLevels } from "@/lib/academics";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Ficha del estudiante" };

type StudentWithProfile = Pick<User, "id" | "name" | "email" | "isActive" | "createdAt">
  & { profile: StudentProfile | null; section: (SchoolSection & { grade: SchoolGrade; year: AcademicYear }) | null };
type CourseRow = Pick<Course, "id" | "code" | "title" | "term"> & { periodName: string | null; instructorName: string; gradeCount: number };
type GradeRow = { title: string; courseCode: string; grade: number | null; points: number; gradedAt: Date | null };

export default async function StudentDetailPage({ params, searchParams }: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireStaff();
  const [{ studentId }, messages] = await Promise.all([params, searchParams]);
  const [studentRows, guardianRows, sectionRows] = await Promise.all([
    db.sql<StudentWithProfile>`
      SELECT u."id", u."name", u."email", u."isActive", u."createdAt",
        CASE WHEN sp."id" IS NULL THEN NULL ELSE to_jsonb(sp) END AS profile,
        CASE WHEN ss."id" IS NULL THEN NULL ELSE jsonb_build_object(
          'id', ss."id", 'yearId', ss."yearId", 'gradeId', ss."gradeId", 'name', ss."name",
          'grade', to_jsonb(sg), 'year', to_jsonb(ay)
        ) END AS section
      FROM "User" u
      LEFT JOIN "StudentProfile" sp ON sp."userId" = u."id"
      LEFT JOIN "SchoolSection" ss ON ss."id" = sp."schoolSectionId"
      LEFT JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
      LEFT JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
      WHERE u."id" = ${studentId} AND u."role" = 'STUDENT' LIMIT 1
    `,
    db.sql<StudentGuardian>`SELECT * FROM "StudentGuardian" WHERE "studentId" = ${studentId} ORDER BY "position" ASC`,
    db.query<SchoolSection & { grade: SchoolGrade; yearName: string }>(
      `SELECT ss.*, to_jsonb(sg) AS "grade", ay."name" AS "yearName"
       FROM "SchoolSection" ss JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
       JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
       WHERE ay."id" = (SELECT "id" FROM "AcademicYear" WHERE "isClosed" = FALSE ORDER BY "startsOn" DESC LIMIT 1)
         AND sg."level" IN ('PRIMARY', 'SECONDARY') AND ss."name" IN ('A', 'B')
       ORDER BY sg."level", sg."position", ss."name"`,
    ),
  ]);
  const student = studentRows[0];
  if (!student) return <div className="p-8"><h1 className="text-xl font-semibold">Estudiante no encontrado</h1><Link href="/students" className="mt-4 inline-flex text-sm text-blue-800 underline">Volver al directorio</Link></div>;

  const [courses, attendanceRows, gradeRows, periodGradeRows] = await Promise.all([
    db.query<CourseRow>(
      `SELECT c."id", c."code", c."title", c."term", ap."name" AS "periodName", u."name" AS "instructorName",
         (SELECT COUNT(*)::int FROM "Enrollment" ce WHERE ce."courseId" = c."id" AND ce."role" = 'STUDENT') AS "gradeCount"
       FROM "Enrollment" e JOIN "Course" c ON c."id" = e."courseId"
       JOIN "User" u ON u."id" = c."instructorId"
       LEFT JOIN "AcademicPeriod" ap ON ap."id" = c."academicPeriodId"
       WHERE e."userId" = $1 AND e."role" = 'STUDENT' ORDER BY c."title"`,
      [studentId],
    ),
    db.sql<Pick<Attendance, "status">>`SELECT "status" FROM "Attendance" WHERE "studentId" = ${studentId}`,
    db.query<GradeRow>(
      `SELECT a."title", c."code" AS "courseCode", s."grade", a."points", s."gradedAt"
       FROM "Submission" s JOIN "Assignment" a ON a."id" = s."assignmentId"
       JOIN "Course" c ON c."id" = a."courseId"
       WHERE s."studentId" = $1 ORDER BY s."submittedAt" DESC LIMIT 30`,
      [studentId],
    ),
    db.query<{ value: string; courseCode: string; periodName: string; updatedAt: Date }>(
      `SELECT pg."value", c."code" AS "courseCode", ap."name" AS "periodName", pg."updatedAt"
       FROM "PeriodGrade" pg JOIN "Course" c ON c."id" = pg."courseId"
       JOIN "AcademicPeriod" ap ON ap."id" = pg."periodId"
       WHERE pg."studentId" = $1 ORDER BY pg."updatedAt" DESC LIMIT 30`,
      [studentId],
    ),
  ]);
  const counts = attendanceRows.reduce((result, record) => {
    result[record.status] = (result[record.status] ?? 0) + 1;
    return result;
  }, {} as Record<string, number>);
  const sectionOptions: StudentSectionOption[] = sectionRows.map((section) => ({
    id: section.id,
    level: section.grade.level as StudentSectionOption["level"],
    gradeName: section.grade.name,
    sectionName: section.name,
    yearName: section.yearName,
  }));
  const formData: StudentFormData = {
    id: student.id,
    name: student.name,
    email: student.email,
    documentNumber: student.profile?.documentNumber ?? "",
    schoolSectionId: student.profile?.schoolSectionId ?? null,
    guardians: guardianRows.map(({ fullName, relationship, documentNumber, phone, email }) => ({ fullName, relationship, documentNumber, phone, email })),
  };

  return <div>
    <PageHeader title={student.name} description="Ficha individual · historial académico y datos de contacto autorizados." actions={<Link href="/students" className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Directorio</Link>} />
    <div className="space-y-6 p-4 sm:p-8">
      {messages.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{messages.error}</p>}
      {messages.success && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{messages.success}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Estado", student.isActive ? "Activo" : "Inactivo", UserRound],
          ["Nivel", student.section ? schoolLevels[student.section.grade.level] : "Sin asignar", GraduationCap],
          ["Sección", student.section ? `${student.section.grade.name} · ${student.section.name}` : "Sin asignar", BookOpen],
          ["Asistencias", String(attendanceRows.length), CalendarCheck],
        ].map(([label, value, Icon]) => <article key={label as string} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label as string}</p><Icon className="h-4 w-4 text-blue-800" /></div>
          <p className="mt-3 text-lg font-semibold text-slate-950">{value as string}</p>
        </article>)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="courses-heading">
            <div className="mb-4 flex items-center justify-between"><div><h2 id="courses-heading" className="text-base font-semibold">Cursos asignados</h2><p className="mt-1 text-xs text-slate-500">Cursos donde aparece una matrícula activa.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{courses.length}</span></div>
            {courses.length ? <div className="divide-y divide-slate-100">{courses.map((course) => <Link key={course.id} href={`/courses/${course.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-blue-800"><div><p className="text-sm font-medium">{course.title}</p><p className="mt-0.5 text-xs text-slate-500">{course.code} · {course.periodName ?? course.term} · {course.instructorName}</p></div><span className="text-xs text-slate-500">{course.gradeCount} inscritos</span></Link>)}</div> : <p className="text-sm text-slate-500">Todavía no hay cursos asignados.</p>}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="grades-heading">
            <h2 id="grades-heading" className="mb-4 text-base font-semibold">Calificaciones recientes</h2>
            {gradeRows.length || periodGradeRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Actividad</th><th className="px-3 py-2">Curso</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">Actualizado</th></tr></thead><tbody className="divide-y divide-slate-100">{gradeRows.map((grade, index) => <tr key={`assignment-${index}`}><td className="px-3 py-3">{grade.title}</td><td className="px-3 py-3">{grade.courseCode}</td><td className="px-3 py-3">{grade.grade === null ? "Pendiente" : `${grade.grade} / ${grade.points}`}</td><td className="px-3 py-3 text-xs text-slate-500">{grade.gradedAt ? formatDate(grade.gradedAt) : "—"}</td></tr>)}{periodGradeRows.map((grade, index) => <tr key={`period-${index}`}><td className="px-3 py-3">Nota del periodo · {grade.periodName}</td><td className="px-3 py-3">{grade.courseCode}</td><td className="px-3 py-3 font-semibold">{grade.value}</td><td className="px-3 py-3 text-xs text-slate-500">{formatDate(grade.updatedAt)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No hay calificaciones registradas.</p>}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="attendance-heading">
            <div className="mb-4 flex items-center justify-between"><div><h2 id="attendance-heading" className="text-base font-semibold">Historial de asistencia</h2><p className="mt-1 text-xs text-slate-500">Resumen acumulado de todos sus cursos.</p></div><Link href="/attendance" className="text-xs font-medium text-blue-800 underline">Abrir asistencia</Link></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
              { label: "Presente", key: "PRESENT", className: "border-emerald-100 bg-emerald-50" },
              { label: "Tarde", key: "LATE", className: "border-amber-100 bg-amber-50" },
              { label: "Falta", key: "ABSENT", className: "border-rose-100 bg-rose-50" },
              { label: "Justificada", key: "EXCUSED", className: "border-blue-100 bg-blue-50" },
            ].map(({ label, key, className }) => <div key={key} className={`rounded-md border p-3 ${className}`}><p className="text-xs text-slate-600">{label}</p><p className="mt-1 text-lg font-semibold text-slate-950">{counts[key] ?? 0}</p></div>)}</div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="contact-heading">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-800"><Mail className="h-4 w-4" /></span><div><h2 id="contact-heading" className="text-base font-semibold">Datos de contacto</h2><p className="mt-1 text-xs text-slate-500">Registrado el {formatDate(student.createdAt)}</p></div></div>
            <p className="break-all text-sm text-slate-800">{student.email}</p>
            <p className="mt-2 text-xs text-slate-500">DNI: {student.profile?.documentNumber ?? "No registrado"}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">Código: {student.profile?.studentCode ?? "Pendiente de completar"}</p>
            <form action={setStudentStatusAction} className="mt-4 border-t border-slate-100 pt-4"><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="isActive" value={String(!student.isActive)} /><button type="submit" className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-950">{student.isActive ? "Desactivar acceso" : "Reactivar acceso"}</button></form>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="guardian-list-heading">
            <div className="mb-4 flex items-center justify-between"><h2 id="guardian-list-heading" className="text-base font-semibold">Apoderados</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px]">{guardianRows.length}/3</span></div>
            {guardianRows.length ? <ul className="space-y-3">{guardianRows.map((guardian) => <li key={guardian.id} className="border-l-2 border-blue-800 pl-3"><p className="text-sm font-medium">{guardian.fullName}</p><p className="text-xs text-slate-500">{guardian.relationship}{guardian.documentNumber ? ` · DNI ${guardian.documentNumber}` : ""}</p>{guardian.phone && <p className="mt-1 text-xs text-slate-600">{guardian.phone}</p>}{guardian.email && <p className="break-all text-xs text-slate-600">{guardian.email}</p>}</li>)}</ul> : <p className="text-sm text-slate-500">Sin apoderados registrados.</p>}
          </section>
        </aside>
      </section>
      <details className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"><summary className="cursor-pointer font-semibold text-slate-950">Editar ficha</summary><div className="mt-5"><StudentForm sections={sectionOptions} student={formData} /></div></details>
    </div>
  </div>;
}
