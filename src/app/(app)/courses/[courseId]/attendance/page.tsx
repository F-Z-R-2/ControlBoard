import type { Metadata } from "next";
import { AttendanceMatrix } from "@/components/attendance-matrix";
import { StudentAttendanceHistory } from "@/components/student-attendance-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attendanceLabels, attendancePercentage, canRecordAttendance, schoolDate, validAttendanceDate } from "@/lib/attendance";
import { getCourseAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Asistencia" };

export default async function CourseAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ date?: string; view?: string; error?: string; success?: string }>;
}) {
  const { courseId } = await params;
  const { course, user } = await getCourseAccess(courseId);
  const query = await searchParams;
  const view = query.view === "overall" ? "overall" : "meeting";
  const today = schoolDate();
  const invalidDate = query.date && (!validAttendanceDate(query.date) || query.date > today);
  const day = !invalidDate && query.date ? query.date : today;
  const date = new Date(`${day}T00:00:00.000Z`);
  const canManage = canRecordAttendance(user, course.instructorId);
  const basePath = `/courses/${course.id}/attendance`;

  const [records, enrollments, history, overallRecords] = await Promise.all([
    canManage ? prisma.attendance.findMany({
      where: { courseId: course.id, date, ...(canManage ? {} : { studentId: user.id }) },
      include: {
        student: { select: { id: true, name: true, email: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { student: { name: "asc" } },
    }) : [],
    canManage
      ? prisma.enrollment.findMany({
          where: { courseId: course.id, role: "STUDENT", user: { role: "STUDENT", isActive: true } },
          select: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { user: { name: "asc" } },
        })
      : [],
    !canManage
      ? prisma.attendance.findMany({
          where: { courseId: course.id, studentId: user.id },
          include: { recordedBy: { select: { name: true } } },
          orderBy: { date: "desc" },
        })
      : [],
    canManage && view === "overall"
      ? prisma.attendance.findMany({
          where: { courseId: course.id },
          include: { student: { select: { id: true, name: true, email: true } } },
          orderBy: { date: "asc" },
        })
      : [],
  ]);

  const students = new Map(enrollments.map((item) => [item.user.id, item.user]));
  for (const record of records) students.set(record.student.id, record.student);
  for (const record of overallRecords) students.set(record.student.id, record.student);
  const roster = [...students.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const recordMap = new Map(records.map((record) => [record.studentId, record]));
  const overallRecordsByStudent = new Map<string, Record<keyof typeof attendanceLabels, number>>();
  for (const record of overallRecords) {
    const counts = overallRecordsByStudent.get(record.studentId) ?? { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    counts[record.status] += 1;
    overallRecordsByStudent.set(record.studentId, counts);
  }
  const matrixStudents = roster.map((student) => ({
    ...student,
    record: recordMap.get(student.id),
    counts: overallRecordsByStudent.get(student.id) ?? { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
  }));
  const sessionCount = new Set(overallRecords.map((record) => record.date.toISOString().slice(0, 10))).size;
  const studentCounts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  if (!canManage) {
    for (const record of history) studentCounts[record.status] += 1;
  }
  const studentScore = attendancePercentage(studentCounts);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Asistencia</h2>
        <p className="text-sm text-slate-500">
          {canManage
            ? "Registra la asistencia diaria de los estudiantes del curso."
            : "Consulta tu asistencia y observaciones en este curso."}
        </p>
      </div>

      {query.error && (
        <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {query.error}
        </p>
      )}
      {canManage && invalidDate && (
        <p role="alert" className="border border-amber-200 bg-amber-50 p-3 text-sm">
          La fecha no es válida o es futura. Se muestra el día de hoy.
        </p>
      )}
      {canManage && query.success && (
        <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {query.success}
        </p>
      )}

      {canManage && (
        <form action={basePath} className="flex flex-wrap items-end gap-4 border bg-white p-5">
          <input type="hidden" name="view" value={view} />
          <label className="text-sm">
            Fecha (Lima)
            <Input name="date" type="date" min="2000-01-01" max={today} defaultValue={day} required />
          </label>
          <Button type="submit" variant="outline">Consultar</Button>
        </form>
      )}

      {canManage ? (
        <AttendanceMatrix
          courseId={course.id}
          courseTitle={`${course.code} · ${course.title}`}
          day={day}
          basePath={basePath}
          view={view}
          students={matrixStudents}
          sessionCount={sessionCount}
        />
      ) : (
        <section className="overflow-hidden border border-[#dedede] bg-white" aria-labelledby="student-attendance">
          <header className="border-b border-[#dedede] px-5 py-4">
            <p className="text-xs text-slate-500">{course.title}</p>
            <h3 id="student-attendance" className="font-serif text-2xl text-slate-900">{user.name}</h3>
          </header>

          <div className="bg-[#fafafa] px-5 py-5 text-center">
            <p className="text-sm font-semibold text-slate-700">Puntaje general</p>
            <p className="mt-3 inline-flex min-w-20 justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white">
              {studentScore === null ? "—" : `${studentScore} / 100`}
            </p>
          </div>
          <StudentAttendanceHistory
            records={history.map((record) => ({
              id: record.id,
              date: record.date.toISOString().slice(0, 10),
              status: record.status,
              note: record.note,
              recordedBy: record.recordedBy.name,
            }))}
            counts={studentCounts}
          />
        </section>
      )}
    </div>
  );
}
