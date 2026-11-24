import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceMatrix } from "@/components/attendance-matrix";
import { ClientGetForm } from "@/components/client-get-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { attendanceLabels, canRecordAttendance, schoolDate, validAttendanceDate } from "@/lib/attendance";
import { db } from "@/lib/db";
import type { Attendance, Course, User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";
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
  const courses = isStaff(user.role)
    ? await db.sql<Pick<Course, "id" | "code" | "title" | "instructorId">>`
        SELECT "id", "code", "title", "instructorId" FROM "Course" ORDER BY "title" ASC
      `
    : await db.sql<Pick<Course, "id" | "code" | "title" | "instructorId">>`
        SELECT c."id", c."code", c."title", c."instructorId" FROM "Course" c
        WHERE c."instructorId" = ${user.id} OR EXISTS (
          SELECT 1 FROM "Enrollment" e
          WHERE e."courseId" = c."id" AND e."userId" = ${user.id}
        )
        ORDER BY c."title" ASC
      `;
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
  type StudentInfo = Pick<User, "id" | "name" | "email">;
  type AttendanceRecord = Attendance & {
    student: StudentInfo;
    recordedBy: Pick<User, "name">;
  };
  const [records, enrollments, history, overallRecords, calendarRecords] = await Promise.all([
    db.query<AttendanceRecord>(
      `SELECT a.*,
         jsonb_build_object('id', u."id", 'name', u."name", 'email', u."email") AS "student",
         jsonb_build_object('name', r."name") AS "recordedBy"
       FROM "Attendance" a
       JOIN "User" u ON u."id" = a."studentId"
       JOIN "User" r ON r."id" = a."recordedById"
       WHERE a."courseId" = $1 AND a."date" = $2 ${canManage ? "" : `AND a."studentId" = $3`}
       ORDER BY u."name" ASC`,
      canManage ? [course.id, date] : [course.id, date, user.id],
    ),
    canManage
      ? db.query<{ user: StudentInfo }>(
          `SELECT jsonb_build_object('id', u."id", 'name', u."name", 'email', u."email") AS "user"
           FROM "Enrollment" e
           JOIN "User" u ON u."id" = e."userId"
           WHERE e."courseId" = $1 AND e."role" = 'STUDENT'
             AND u."role" = 'STUDENT' AND u."isActive" = TRUE
           ORDER BY u."name" ASC`,
          [course.id],
        )
      : Promise.resolve([] as { user: StudentInfo }[]),
    !canManage
      ? db.sql<Attendance>`
          SELECT * FROM "Attendance"
          WHERE "courseId" = ${course.id} AND "studentId" = ${user.id}
            AND "date" >= ${monthStart} AND "date" < ${monthEnd}
          ORDER BY "date" DESC
        `
      : Promise.resolve([] as Attendance[]),
    canManage && view === "overall"
      ? db.query<Attendance & { student: StudentInfo }>(
          `SELECT a.*,
             jsonb_build_object('id', u."id", 'name', u."name", 'email', u."email") AS "student"
           FROM "Attendance" a
           JOIN "User" u ON u."id" = a."studentId"
           WHERE a."courseId" = $1
           ORDER BY a."date" ASC`,
          [course.id],
        )
      : Promise.resolve([] as (Attendance & { student: StudentInfo })[]),
    db.query<Pick<Attendance, "date" | "status">>(
      `SELECT "date", "status" FROM "Attendance"
       WHERE "courseId" = $1 AND "date" >= $2 AND "date" < $3 ${canManage ? "" : `AND "studentId" = $4`}`,
      canManage ? [course.id, monthStart, monthEnd] : [course.id, monthStart, monthEnd, user.id],
    ),
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
  const monthOffset = (monthStart.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const calendarCellCount = Math.ceil((monthOffset + daysInMonth) / 7) * 7;
  const attendanceByDay = new Map<string, number>();
  for (const record of calendarRecords) {
    const dateKey = record.date.toISOString().slice(0, 10);
    attendanceByDay.set(dateKey, (attendanceByDay.get(dateKey) ?? 0) + 1);
  }
  const previousMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
  const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const attendanceHref = (value: string) => `/attendance?${new URLSearchParams({ course: course.id, date: value, view })}`;
  const monthLabel = monthStart.toLocaleDateString("es-PE", { month: "long", year: "numeric", timeZone: "UTC" });

  return <div>
    <PageHeader title="Asistencia" description={canManage
      ? "Registra y corrige la asistencia diaria. Cada estudiante se guarda por separado."
      : "Consulta tu asistencia y observaciones por curso."} />
    <div className="space-y-6 p-4 sm:p-8">
      {params.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
      {invalidDate && <p role="alert" className="border border-amber-200 bg-amber-50 p-3 text-sm">La fecha no es válida o es futura. Se muestra el día de hoy.</p>}
      {params.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
      <ClientGetForm action="/attendance" className="flex flex-wrap items-end gap-4 border bg-white p-5">
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
      </ClientGetForm>

      <section className="max-w-xl rounded-lg border border-slate-200 bg-white p-4 sm:p-5" aria-label="Calendario para elegir fecha de asistencia">
        <div className="mb-4 flex items-center justify-between">
          <Link href={attendanceHref(previousMonth)} aria-label="Mes anterior" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">‹</Link>
          <h2 className="text-sm font-semibold capitalize text-slate-900">{monthLabel}</h2>
          {nextMonth <= today.slice(0, 7) + "-01" ? <Link href={attendanceHref(nextMonth)} aria-label="Mes siguiente" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">›</Link> : <span className="h-8 w-8" />}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["L", "M", "X", "J", "V", "S", "D"].map((label, index) => <span key={`${label}-${index}`} className="py-1 text-[10px] font-semibold uppercase text-slate-400">{label}</span>)}
          {Array.from({ length: calendarCellCount }, (_, index) => {
            const dateNumber = index - monthOffset + 1;
            if (dateNumber < 1 || dateNumber > daysInMonth) return <span key={index} />;
            const dateKey = `${day.slice(0, 7)}-${String(dateNumber).padStart(2, "0")}`;
            const selected = dateKey === day;
            const future = dateKey > today;
            const recordCount = attendanceByDay.get(dateKey) ?? 0;
            return future
              ? <span key={dateKey} className="relative flex h-10 flex-col items-center justify-center rounded-md text-xs text-slate-300">{dateNumber}</span>
              : <Link key={dateKey} href={attendanceHref(dateKey)} aria-current={selected ? "date" : undefined} className={`relative flex h-10 flex-col items-center justify-center rounded-md text-xs transition-colors ${selected ? "bg-blue-800 font-semibold text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"}`}><span>{dateNumber}</span>{recordCount > 0 && <span className={`mt-0.5 text-[9px] ${selected ? "text-blue-100" : "text-blue-700"}`}>{recordCount} reg.</span>}</Link>;
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Selecciona un día para consultar o registrar la asistencia.</p>
      </section>

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
