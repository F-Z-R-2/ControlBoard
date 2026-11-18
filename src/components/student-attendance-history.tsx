"use client";

import type { AttendanceStatus } from "@prisma/client";
import { useState } from "react";
import { attendanceGradePoints, attendanceLabels } from "@/lib/attendance";

type AttendanceRecord = {
  id: string;
  date: string;
  status: AttendanceStatus;
  note: string;
  recordedBy: string;
};

const statuses = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;

const filterStyles = {
  PRESENT: {
    idle: "border-emerald-200 hover:bg-emerald-50",
    active: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500",
    count: "text-emerald-700",
  },
  LATE: {
    idle: "border-amber-200 hover:bg-amber-50",
    active: "border-amber-500 bg-amber-50 ring-1 ring-amber-500",
    count: "text-amber-700",
  },
  ABSENT: {
    idle: "border-rose-200 hover:bg-rose-50",
    active: "border-rose-500 bg-rose-50 ring-1 ring-rose-500",
    count: "text-rose-700",
  },
  EXCUSED: {
    idle: "border-sky-200 hover:bg-sky-50",
    active: "border-sky-500 bg-sky-50 ring-1 ring-sky-500",
    count: "text-sky-700",
  },
} satisfies Record<AttendanceStatus, { idle: string; active: string; count: string }>;

export function StudentAttendanceHistory({
  records,
  counts,
}: {
  records: AttendanceRecord[];
  counts: Record<AttendanceStatus, number>;
}) {
  const [filter, setFilter] = useState<AttendanceStatus | null>(null);
  const visibleRecords = filter
    ? records.filter((record) => record.status === filter)
    : records;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 border-b border-[#dedede] p-3 sm:grid-cols-4" aria-label="Filtrar por estado de asistencia">
        {statuses.map((status) => {
          const selected = filter === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(selected ? null : status)}
              className={`flex items-center justify-between gap-2 border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0b3ddb] ${
                selected ? filterStyles[status].active : filterStyles[status].idle
              }`}
            >
              <span className="text-slate-700">{attendanceLabels[status]}</span>
              <span className={`font-semibold ${filterStyles[status].count}`}>{counts[status]}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {filter && (
          <div className="flex items-center justify-between gap-3 border-b border-[#e5e5e5] px-4 py-2 text-xs text-slate-600">
            <span>
              {visibleRecords.length} {visibleRecords.length === 1 ? "registro" : "registros"} de {attendanceLabels[filter]}
            </span>
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="font-medium text-[#0b3ddb] hover:underline"
            >
              Mostrar todos
            </button>
          </div>
        )}

        {visibleRecords.length ? (
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
                {visibleRecords.map((record) => {
                  const grade = attendanceGradePoints[record.status];
                  return (
                    <tr key={record.id} className="border-t border-[#e5e5e5]">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {new Intl.DateTimeFormat("es-PE", {
                          timeZone: "UTC",
                          dateStyle: "short",
                        }).format(new Date(`${record.date}T00:00:00.000Z`))}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{attendanceLabels[record.status]}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Registrado por {record.recordedBy}</p>
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
          <p className="p-5 text-sm text-slate-500">
            {filter
              ? `No hay registros con estado ${attendanceLabels[filter].toLocaleLowerCase("es")}.`
              : "Todavía no hay registros de asistencia para este curso."}
          </p>
        )}
      </div>
    </>
  );
}
