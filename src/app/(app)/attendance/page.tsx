import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttendanceMatrix } from "@/components/attendance-matrix";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { attendanceLabels, canRecordAttendance, schoolDate, validAttendanceDate } from "@/lib/attendance";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/roles";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AttendancePage({ searchParams }: {
  searchParams: Promise<{ course?: string; date?: string; view?: string; error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const view = params.view === "overall" ? "overall" : "meeting";
  const today = schoolDate();
  const invalidDate = params.date && (!validAttendanceDate(params.date) || params.date > today);
  const day = !invalidDate && params.date ? params.date : today;
  const date = new Date(`${day}T00:00:00.000Z`);
  const courses = await prisma.course.findMany({
    where: isStaff(user.role) ? {} : {
      OR: [{ instructorId: user.id }, { enrollments: { some: { userId: user.id } } }],
    },
    select: { id: true, code: true, title: true, instructorId: true },
    orderBy: { title: "asc" },
  });
  const course = params.course ? courses.find(item => item.id === params.course) : courses[0];
  if (params.course && !course) notFound();
  if (!course) return <div>
    <PageHeader title="Asistencia" description="Registro diario por curso." />
    <p className="p-8 text-sm text-slate-500">No tienes cursos disponibles para consultar asistencia.</p>
  </div>;

  const canManage = canRecordAttendance(user, course.instructorId);
  const monthStart = new Date(`${day.slice(0, 7)}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const [records, enrollments, history, overallRecords] = await Promise.all([
    prisma.attendance.findMany({
      where: { courseId: course.id, date, ...(canManage ? {} : { studentId: user.id }) },
      include: {
        student: { select: { id: true, name: true, email: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { student: { name: "asc" } },
    }),
    canManage ? prisma.enrollment.findMany({
      where: { courseId: course.id, role: "STUDENT", user: { role: "STUDENT", isActive: true } },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }) : [],
    !canManage ? prisma.attendance.findMany({
      where: { courseId: course.id, studentId: user.id, date: { gte: monthStart, lt: monthEnd } },
      orderBy: { date: "desc" },
    }) : [],
    canManage && view === "overall" ? prisma.attendance.findMany({
      where: { courseId: course.id },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { date: "asc" },
    }) : [],
  ]);
  const students = new Map(enrollments.map(item => [item.user.id, item.user]));
  for (const record of records) students.set(record.student.id, record.student);
  for (const record of overallRecords) students.set(record.student.id, record.student);
  const roster = [...students.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const recordMap = new Map(records.map(record => [record.studentId, record]));
  const summaryRecords = canManage ? records : history;
  const overallRecordsByStudent = new Map<string, Record<keyof typeof attendanceLabels, number>>();
  for (const record of overallRecords) {
    const counts = overallRecordsByStudent.get(record.studentId) ?? { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    counts[record.status] += 1;
    overallRecordsByStudent.set(record.studentId, counts);
  }
  const matrixStudents = roster.map(student => ({
    ...student,
    record: recordMap.get(student.id),
    counts: overallRecordsByStudent.get(student.id) ?? { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
  }));
  const sessionCount = new Set(overallRecords.map(record => record.date.toISOString().slice(0, 10))).size;

  return <div>
    <PageHeader title="Asistencia" description={canManage
      ? "Registra y corrige la asistencia diaria. Cada estudiante se guarda por separado."
      : "Consulta tu asistencia y observaciones por curso."} />
    <div className="space-y-6 p-4 sm:p-8">
      {params.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
      {invalidDate && <p role="alert" className="border border-amber-200 bg-amber-50 p-3 text-sm">La fecha no es válida o es futura. Se muestra el día de hoy.</p>}
      {params.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
      <form action="/attendance" className="flex flex-wrap items-end gap-4 border bg-white p-5">
        <input type="hidden" name="view" value={view} />
        <label className="min-w-0 flex-1 text-sm">Curso
          <Select name="course" defaultValue={course.id}>
            {courses.map(item => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}
          </Select>
        </label>
        <label className="text-sm">Fecha (Lima)
          <Input name="date" type="date" min="2000-01-01" max={today} defaultValue={day} required />
        </label>
        <Button type="submit" variant="outline">Consultar</Button>
      </form>

      {!canManage && <section aria-label="Resumen del mes">
        <h2 className="mb-3 text-lg font-semibold">{`Resumen de ${day.slice(0, 7)}`}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(attendanceLabels).map(([status, label]) => <div key={status} className="border bg-white p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{summaryRecords.filter(record => record.status === status).length}</p>
          </div>)}
        </div>
        <p className="mt-3 text-xs text-slate-500">Los días sin registro no se cuentan como faltas.</p>
      </section>}

      {canManage ? (
        <AttendanceMatrix
          courseId={course.id}
          courseTitle={`${course.code} · ${course.title}`}
          day={day}
          basePath="/attendance"
          view={view}
          students={matrixStudents}
          sessionCount={sessionCount}
        />
      ) : <>
        <section className="border bg-white p-5" aria-labelledby="selected-day">
          <h2 id="selected-day" className="mb-3 text-lg font-semibold">Tu registro del {day}</h2>
          {records[0] ? <div><p className="font-medium">{attendanceLabels[records[0].status]}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{records[0].note || "Sin observaciones"}</p></div>
            : <p className="text-sm text-slate-500">Todavía no hay asistencia registrada para esta fecha.</p>}
        </section>
        <section className="border bg-white p-5" aria-labelledby="history-title">
          <h2 id="history-title" className="mb-3 text-lg font-semibold">Tu historial del mes</h2>
          {history.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Fecha</th><th className="p-2">Estado</th><th className="p-2">Observación</th></tr></thead>
            <tbody>{history.map(record => <tr key={record.id} className="border-b">
              <td className="whitespace-nowrap p-2">{record.date.toISOString().slice(0, 10)}</td>
              <td className="p-2">{attendanceLabels[record.status]}</td>
              <td className="whitespace-pre-wrap p-2">{record.note || "—"}</td>
            </tr>)}</tbody>
          </table></div> : <p className="text-sm text-slate-500">No hay registros en este mes.</p>}
        </section>
      </>}
    </div>
  </div>;
}
