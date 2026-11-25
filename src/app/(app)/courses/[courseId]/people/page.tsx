import { GraduationCap, Mail, Users } from "lucide-react";
import { enrollStudentInCourseAction } from "@/app/actions/course-roster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import type { Enrollment, User } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";
import { formatDate, initials, roleLabel } from "@/lib/utils";

type EnrollmentWithUser = Enrollment & { user: User };

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ courseId }, messages] = await Promise.all([params, searchParams]);
  const { course, canManage } = await getCourseAccess(courseId);
  const [enrollments, availableStudents] = await Promise.all([
    db.sql<EnrollmentWithUser>`
      SELECT e.*, to_jsonb(u) AS "user"
      FROM "Enrollment" e
      JOIN "User" u ON u."id" = e."userId"
      WHERE e."courseId" = ${course.id}
      ORDER BY e."createdAt" ASC
    `,
    canManage ? db.sql<User>`
      SELECT u.* FROM "User" u
      LEFT JOIN "StudentProfile" sp ON sp."userId" = u."id"
      WHERE u."role" = 'STUDENT' AND u."isActive" = TRUE
        AND (${course.sectionId}::text IS NULL OR sp."schoolSectionId" = ${course.sectionId})
        AND NOT EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."courseId" = ${course.id} AND e."userId" = u."id")
      ORDER BY u."name" ASC
    ` : Promise.resolve([] as User[]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Personas</h2>
        <p className="text-sm text-slate-500">Docente y estudiantes matriculados en {course.code}.</p>
      </div>
      {messages.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{messages.error}</p>}
      {messages.success && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{messages.success}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-indigo-600" />Docente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">{initials(course.instructor.name)}</span>
            <div><p className="text-sm font-medium text-slate-900">{course.instructor.name}</p><p className="flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" />{course.instructor.email}</p></div>
            <Badge className="ml-auto">Profesor</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-indigo-600" />Estudiantes</CardTitle><CardDescription>{enrollments.length} personas matriculadas.</CardDescription></div>
          <Badge variant="slate">{enrollments.length}</Badge>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? <p className="text-sm text-slate-500">Todavía no hay estudiantes en el curso.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5 font-semibold">Estudiante</th><th className="px-3 py-2.5 font-semibold">Correo</th><th className="px-3 py-2.5 font-semibold">Tipo</th><th className="px-3 py-2.5 font-semibold">Matriculado</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{enrollments.map((enrollment) => <tr key={enrollment.id} className="hover:bg-slate-50"><td className="px-3 py-3"><span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{initials(enrollment.user.name)}</span><span className="font-medium text-slate-900">{enrollment.user.name}</span></td><td className="px-3 py-3 text-slate-600">{enrollment.user.email}</td><td className="px-3 py-3"><Badge variant="slate">{roleLabel(enrollment.role)}</Badge></td><td className="px-3 py-3 text-xs text-slate-500">{formatDate(enrollment.createdAt)}</td></tr>)}</tbody>
            </table></div>
          )}
        </CardContent>
      </Card>

      {canManage && <Card>
        <CardHeader><CardTitle>Matricular estudiante</CardTitle><CardDescription>{course.sectionId ? "Solo aparecen estudiantes activos de la sección asignada." : "Selecciona un estudiante activo del colegio."}</CardDescription></CardHeader>
        <CardContent>
          {availableStudents.length ? <form action={enrollStudentInCourseAction} className="flex flex-col gap-3 sm:flex-row"><input type="hidden" name="courseId" value={course.id} /><Select name="studentId" required defaultValue="" className="min-w-0 flex-1"><option value="" disabled>Selecciona un estudiante</option>{availableStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}</Select><Button type="submit">Matricular</Button></form> : <p className="text-sm text-slate-500">No hay estudiantes activos disponibles para esta sección.</p>}
        </CardContent>
      </Card>}
    </div>
  );
}
