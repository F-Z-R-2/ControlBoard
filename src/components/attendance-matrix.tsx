import { Ban, Check, Clock3, X } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import Link from "next/link";
import { saveAttendanceAction } from "@/app/actions/attendance";
import { attendanceLabels, attendancePercentage } from "@/lib/attendance";

type AttendanceStudent = {
  id: string;
  name: string;
  email: string;
  record?: {
    status: AttendanceStatus;
    note: string;
    version: number;
  };
  counts: Record<AttendanceStatus, number>;
};

const statusColumns = [
  { status: "PRESENT", label: attendanceLabels.PRESENT, Icon: Check },
  { status: "LATE", label: attendanceLabels.LATE, Icon: Clock3 },
  { status: "ABSENT", label: attendanceLabels.ABSENT, Icon: X },
  { status: "EXCUSED", label: attendanceLabels.EXCUSED, Icon: Ban },
] as const;

const selectedCellClasses = {
  PRESENT: "border-emerald-200 bg-emerald-100 text-emerald-800",
  LATE: "border-amber-200 bg-amber-100 text-amber-800",
  ABSENT: "border-rose-200 bg-rose-100 text-rose-800",
  EXCUSED: "border-sky-200 bg-sky-100 text-sky-800",
} satisfies Record<AttendanceStatus, string>;

const percentageClasses = {
  good: "bg-emerald-500 text-white",
  low: "bg-rose-500 text-white",
} as const;

function viewHref(basePath: string, courseId: string, day: string, view: "overall" | "meeting") {
  const params = new URLSearchParams({ date: day, view });
  if (basePath === "/attendance") params.set("course", courseId);
  return `${basePath}?${params.toString()}`;
}

export function AttendanceMatrix({
  courseId,
  courseTitle,
  day,
  basePath,
  view,
  students,
  sessionCount,
}: {
  courseId: string;
  courseTitle: string;
  day: string;
  basePath: string;
  view: "overall" | "meeting";
  students: AttendanceStudent[];
  sessionCount: number;
}) {
  const meetingHref = viewHref(basePath, courseId, day, "meeting");
  const overallHref = viewHref(basePath, courseId, day, "overall");
  const dateLabel = new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    dateStyle: "long",
  }).format(new Date(`${day}T00:00:00.000Z`));

  return (
    <section className="overflow-hidden border border-[#dedede] bg-white" aria-label="Matriz de asistencia">
      <div className="flex items-center justify-between border-b border-[#dedede] px-4 sm:px-6">
        <h2 className="sr-only">Asistencia de {courseTitle}</h2>
        <p className="py-4 text-sm font-medium text-slate-600">
          {view === "meeting" ? `Reunión · ${dateLabel}` : `Asistencia general · ${sessionCount} reuniones`}
        </p>
        <nav className="flex items-center gap-1" aria-label="Vista de asistencia">
          <Link
            href={overallHref}
            aria-current={view === "overall" ? "page" : undefined}
            className={`border px-3 py-2 text-sm transition-colors ${
              view === "overall"
                ? "border-[#242424] bg-[#242424] text-white"
                : "border-[#c9c9c9] bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            General
          </Link>
          <Link
            href={meetingHref}
            aria-current={view === "meeting" ? "page" : undefined}
            className={`border px-3 py-2 text-sm transition-colors ${
              view === "meeting"
                ? "border-[#242424] bg-[#242424] text-white"
                : "border-[#c9c9c9] bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Reunión
          </Link>
        </nav>
      </div>

      <div className="border-b border-[#dedede] px-4 py-4 sm:px-6">
        <h3 className="text-lg font-semibold text-slate-900">{courseTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">
          {view === "meeting"
            ? `Fecha de asistencia · ${dateLabel}. Selecciona una celda para registrar o corregir el estado.`
            : "El porcentaje considera presente como 100%, tardanza como 50%, falta como 0%; las justificadas no afectan el promedio."}
        </p>
      </div>

      {view === "overall" && (
        <div className="grid grid-cols-2 gap-px border-b border-[#dedede] bg-[#dedede] sm:grid-cols-4" aria-label="Totales generales">
          {statusColumns.map(({ status, label }) => (
            <div key={status} className="bg-white px-4 py-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {students.reduce((total, student) => total + student.counts[status], 0)}
              </p>
            </div>
          ))}
        </div>
      )}

      {!students.length ? (
        <p className="p-6 text-sm text-slate-500">
          No hay estudiantes activos matriculados ni registros para mostrar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#fafafa] text-xs text-slate-600">
                <th scope="col" className="w-[30%] border-b border-r border-[#dedede] px-4 py-3 font-medium">Estudiante</th>
                <th scope="col" className="border-b border-r border-[#dedede] px-3 py-3 text-center font-medium">
                  {view === "meeting" ? "Asistencia total" : "Promedio general"}
                </th>
                {statusColumns.map(({ status, label }) => (
                  <th key={status} scope="col" className="border-b border-r border-[#dedede] px-3 py-3 text-center font-medium last:border-r-0">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const formId = `attendance-${student.id}`;
                const recordedStatuses = Object.values(student.counts).reduce((total, count) => total + count, 0);
                const percentage = view === "meeting"
                  ? student.record?.status === "PRESENT" ? 100
                    : student.record?.status === "LATE" ? 50
                      : student.record?.status === "ABSENT" ? 0
                        : null
                  : attendancePercentage(student.counts);

                return (
                  <tr key={student.id} className="group">
                    <th scope="row" className="border-b border-r border-[#dedede] px-4 py-3 text-left font-normal">
                      {view === "meeting" && (
                        <form id={formId} action={saveAttendanceAction}>
                          <input type="hidden" name="courseId" value={courseId} />
                          <input type="hidden" name="studentId" value={student.id} />
                          <input type="hidden" name="date" value={day} />
                          <input type="hidden" name="version" value={student.record?.version ?? 0} />
                          <input type="hidden" name="returnTo" value={basePath} />
                        </form>
                      )}
                      <p className="font-medium text-slate-900">{student.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{student.email}</p>
                      {view === "meeting" && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-slate-500 hover:text-slate-800">
                            {student.record?.note ? "Editar observación" : "Agregar observación"}
                          </summary>
                          <input
                            form={formId}
                            name="note"
                            maxLength={500}
                            defaultValue={student.record?.note ?? ""}
                            placeholder="Opcional; visible para el estudiante"
                            aria-label={`Observación para ${student.name}`}
                            className="mt-2 w-full border border-[#c9c9c9] bg-white px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[#0b3ddb]"
                          />
                        </details>
                      )}
                    </th>
                    <td className="border-b border-r border-[#dedede] px-3 py-3 text-center">
                      {percentage === null ? (
                        <span className="text-xs text-slate-400">
                          {view === "meeting" && student.record?.status === "EXCUSED" ? "Justificada" : "Sin datos"}
                        </span>
                      ) : (
                        <span
                          title={`${recordedStatuses} registros`}
                          className={`inline-flex min-w-14 justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                            percentage >= 80 ? percentageClasses.good : percentageClasses.low
                          }`}
                        >
                          {percentage}%
                        </span>
                      )}
                    </td>
                    {statusColumns.map(({ status, label, Icon }) => {
                      const selected = student.record?.status === status;
                      return (
                        <td
                          key={status}
                          className={`border-b border-r border-[#dedede] p-0 text-center last:border-r-0 ${
                            view === "meeting" && selected ? selectedCellClasses[status] : ""
                          }`}
                        >
                          {view === "meeting" ? (
                            <button
                              type="submit"
                              form={formId}
                              name="status"
                              value={status}
                              aria-label={`Marcar a ${student.name} como ${label}`}
                              aria-pressed={selected}
                              title={label}
                              className={`flex min-h-[66px] w-full flex-col items-center justify-center gap-1 px-2 transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0b3ddb] ${
                                selected ? "font-medium" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                              }`}
                            >
                              <Icon aria-hidden="true" className="h-5 w-5" />
                              {selected && <span className="text-[11px]">{label}</span>}
                              {!selected && <span className="sr-only">{label}</span>}
                            </button>
                          ) : (
                            <span className="inline-flex min-h-[66px] min-w-12 items-center justify-center px-2 text-slate-700">
                              {student.counts[status]}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-[#dedede] px-4 py-3 text-xs text-slate-500">
        {view === "meeting"
          ? "Cada cambio se guarda al seleccionar el estado. Los estudiantes sin marcar no se consideran faltas."
          : `Se muestran ${sessionCount} fechas con asistencia registrada.`}
      </p>
    </section>
  );
}
