import type { Metadata } from "next";
import { AttendanceMatrix } from "@/components/attendance-matrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attendanceGradePoints, attendanceLabels, attendancePercentage, canRecordAttendance, schoolDate, validAttendanceDate } from "@/lib/attendance";
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
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 border-b border-[#dedede] px-4 py-3 text-xs text-slate-600">
            {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const).map((status, index) => (
              <span key={status}>
                {index > 0 && <span className="mr-3 text-slate-300">|</span>}
                {studentCounts[status]} {attendanceLabels[status]}
              </span>
            ))}
          </div>

          {history.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-[#fafafa] text-xs text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
                    <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Calificación</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => {
                    const grade = attendanceGradePoints[record.status];
                    return (
                      <tr key={record.id} className="border-t border-[#e5e5e5]">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {new Intl.DateTimeFormat("es-PE", {
                            timeZone: "UTC",
                            dateStyle: "short",
                          }).format(record.date)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{attendanceLabels[record.status]}</p>
                          <p className="mt-0.5 text-xs text-slate-500">Registrado por {record.recordedBy.name}</p>
                          {record.note && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{record.note}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex min-w-14 justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                            grade === 100 ? "bg-emerald-500 text-white"
                              : grade === 75 ? "bg-amber-400 text-amber-950"
                                : grade === 0 ? "bg-rose-500 text-white"
                                  : "bg-slate-100 text-slate-600"
                          }`}>
                            {grade === null ? "—" : `${grade}%`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">Todavía no hay registros de asistencia para este curso.</p>
          )}
        </section>
      )}
    </div>
  );
}
