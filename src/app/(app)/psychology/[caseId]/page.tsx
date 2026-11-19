import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { psychologyAction } from "@/app/actions/psychology";
import { ManagementSubmit } from "@/components/management-submit";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { schoolDate } from "@/lib/attendance";
import { db } from "@/lib/db";
import type { PsychologyAppointment, PsychologyCase, PsychologyNote, Role } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";
import { appointmentStatuses, canAccessPsychology, canManagePsychologyCase, canWritePsychologyNotes, psychologyCategories, psychologyStatuses } from "@/lib/psychology";

export const metadata: Metadata = { title: "Ficha de Psicología" };
const formatTime = (date: Date) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" }).format(date);

function AppointmentList({ appointments, clinical, caseId }: { appointments: PsychologyAppointment[]; clinical: boolean; caseId: string }) {
  return <ul className="divide-y">{appointments.map(appointment => <li key={appointment.id} className="space-y-3 py-3">
    <p className="text-sm font-medium">{formatTime(appointment.startsAt)} · {Math.round((appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000)} minutos</p>
    <p className="text-xs text-slate-500">{appointmentStatuses[appointment.status]}</p>
    {appointment.status === "SCHEDULED" && <form action={psychologyAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="operation" value="appointment-status" />
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="appointmentId" value={appointment.id} />
      <input type="hidden" name="version" value={appointment.version} />
      <label className="text-sm">Acción<Select name="status"><option value="CANCELLED">Cancelar cita</option>{clinical && appointment.startsAt <= new Date() && <><option value="ATTENDED">Marcar atendida</option><option value="NO_SHOW">Marcar inasistencia</option></>}</Select></label>
      <ManagementSubmit>Actualizar cita</ManagementSubmit>
    </form>}
  </li>)}</ul>;
}

export default async function PsychologyCasePage({ params, searchParams }: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ success?: string; notePage?: string }>;
}) {
  const user = await requireUser();
  if (!canAccessPsychology(user.role)) notFound();
  const { caseId } = await params;
  const query = await searchParams;
  const records = await db.query<
    Pick<PsychologyCase, "id" | "psychologistId" | "category" | "status" | "version"> & {
      student: { name: string; isActive: boolean };
      psychologist: { name: string; role: Role; isActive: boolean };
    }
  >(
    `SELECT pc."id", pc."psychologistId", pc."category", pc."status", pc."version",
       jsonb_build_object('name', su."name", 'isActive', su."isActive") AS "student",
       jsonb_build_object('name', pu."name", 'role', pu."role", 'isActive', pu."isActive") AS "psychologist"
     FROM "PsychologyCase" pc
     JOIN "User" su ON su."id" = pc."studentId"
     JOIN "User" pu ON pu."id" = pc."psychologistId"
     WHERE pc."id" = $1 LIMIT 1`,
    [caseId],
  );
  const record = records[0] ?? null;
  if (!record || !canManagePsychologyCase(user, record.psychologistId)) notFound();
  const clinical = canWritePsychologyNotes(user, record.psychologistId);
  const notePage = Math.max(1, Math.min(10000, Number.parseInt(query.notePage ?? "1", 10) || 1));
  const now = new Date();
  // Clinical content is not queried at all for administrative users.
  type NoteRow = Pick<PsychologyNote, "id" | "body" | "attendedOn" | "createdAt">;
  const [notes, noteCountRows, upcoming, previous] = await Promise.all([
    clinical
      ? db.query<NoteRow>(
          `SELECT "id", "body", "attendedOn", "createdAt" FROM "PsychologyNote"
           WHERE "caseId" = $1
           ORDER BY "attendedOn" DESC, "createdAt" DESC, "id" ASC
           LIMIT $2 OFFSET $3`,
          [caseId, 20, (notePage - 1) * 20],
        )
      : Promise.resolve([] as NoteRow[]),
    clinical
      ? db.sql<{ count: number }>`SELECT COUNT(*)::int AS "count" FROM "PsychologyNote" WHERE "caseId" = ${caseId}`
      : Promise.resolve([] as { count: number }[]),
    db.sql<PsychologyAppointment>`
      SELECT * FROM "PsychologyAppointment"
      WHERE "caseId" = ${caseId} AND "status" = 'SCHEDULED' AND "startsAt" >= ${now}
      ORDER BY "startsAt" ASC LIMIT 20
    `,
    db.sql<PsychologyAppointment>`
      SELECT * FROM "PsychologyAppointment"
      WHERE "caseId" = ${caseId} AND ("startsAt" < ${now} OR "status" <> 'SCHEDULED')
      ORDER BY "startsAt" DESC LIMIT 20
    `,
  ]);
  const noteCount = noteCountRows[0]?.count ?? 0;
  return <div>
    <PageHeader title="Ficha de Psicología" description={`${record.student.name} · ${psychologyStatuses[record.status]}`} actions={<Link href="/psychology" className="text-sm text-blue-700">Volver a fichas</Link>} />
    <div className="space-y-6 p-4 sm:p-8">
      {query.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{query.success}</p>}
      <section className="space-y-3 border bg-white p-5">
        <h2 className="text-lg font-semibold">Datos de derivación</h2>
        <p className="text-sm">Profesional: {record.psychologist.name}</p>
        <p className="text-sm">Orientación: {psychologyCategories[record.category]}</p>
        {clinical && <form action={psychologyAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="operation" value="case-status" /><input type="hidden" name="caseId" value={caseId} /><input type="hidden" name="version" value={record.version} />
          <label className="text-sm">Estado de la ficha<Select name="status" defaultValue={record.status}>{Object.entries(psychologyStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          <ManagementSubmit>Guardar estado</ManagementSubmit>
          <p className="w-full text-xs text-slate-500">Al cerrar la ficha se cancelan sus citas futuras. Puedes reabrirla conservando el seguimiento.</p>
        </form>}
      </section>
      {record.status !== "CLOSED" && record.student.isActive && record.psychologist.isActive && record.psychologist.role === "PSYCHOLOGIST" && <section className="space-y-4 border bg-white p-5">
        <h2 className="text-lg font-semibold">Programar cita</h2>
        <form action={psychologyAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="operation" value="schedule" /><input type="hidden" name="caseId" value={caseId} />
          <label className="text-sm">Fecha y hora de Lima<Input type="datetime-local" name="startsAt" required /></label>
          <label className="text-sm">Duración<Select name="minutes" defaultValue="45"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option></Select></label>
          <ManagementSubmit>Programar</ManagementSubmit>
        </form>
        <p className="text-xs text-slate-500">Para reprogramar, cancela la cita anterior y registra el nuevo horario.</p>
      </section>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Próximas citas (hasta 20)</h2>{upcoming.length ? <AppointmentList appointments={upcoming} clinical={clinical} caseId={caseId} /> : <p className="text-sm text-slate-500">Sin citas programadas.</p>}</section>
        <section className="border bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Citas anteriores y canceladas (últimas 20)</h2>{previous.length ? <AppointmentList appointments={previous} clinical={clinical} caseId={caseId} /> : <p className="text-sm text-slate-500">Sin citas anteriores.</p>}</section>
      </div>
      {clinical ? <>
        <section className="space-y-4 border bg-white p-5">
          <h2 className="text-lg font-semibold">Registrar atención</h2>
          <form action={psychologyAction} className="space-y-4">
            <input type="hidden" name="operation" value="note" /><input type="hidden" name="caseId" value={caseId} />
            <label className="block text-sm">Fecha de atención<Input type="date" name="attendedOn" min="2000-01-01" max={schoolDate()} defaultValue={schoolDate()} required /></label>
            <label className="block text-sm">Nota de atención y seguimiento<Textarea name="body" rows={6} maxLength={5000} required /></label>
            <p className="text-xs text-slate-500">Visible únicamente para ti como profesional asignado. Las notas guardadas no se editan: añade una nueva entrada para documentar una corrección.</p>
            <ManagementSubmit>Guardar atención</ManagementSubmit>
          </form>
        </section>
        <section className="space-y-4 border bg-white p-5">
          <h2 className="text-lg font-semibold">Seguimiento ({noteCount})</h2>
          {!notes.length && <p className="text-sm text-slate-500">Todavía no hay notas de atención.</p>}
          {notes.map(note => <article key={note.id} className="space-y-2 border p-4"><h3 className="text-sm font-semibold">Atención del {note.attendedOn.toISOString().slice(0, 10)}</h3><p className="whitespace-pre-wrap break-words text-sm">{note.body}</p><p className="text-xs text-slate-500">Registrada el {formatTime(note.createdAt)}</p></article>)}
          <div className="flex gap-4 text-sm"><span>Página {notePage}</span>{notePage > 1 && <Link href={`/psychology/${caseId}?notePage=${notePage - 1}`}>Anterior</Link>}{notePage * 20 < noteCount && <Link href={`/psychology/${caseId}?notePage=${notePage + 1}`}>Siguiente</Link>}</div>
        </section>
      </> : <p className="text-sm text-slate-500">Las notas de atención son privadas del profesional asignado.</p>}
    </div>
  </div>;
}
