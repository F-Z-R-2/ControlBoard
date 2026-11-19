import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { psychologyAction } from "@/app/actions/psychology";
import { ManagementSubmit } from "@/components/management-submit";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { PsychologyCase, User } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";
import { canAccessPsychology, psychologyCategories, psychologyStatuses } from "@/lib/psychology";

export const metadata: Metadata = { title: "Psicología" };

export default async function PsychologyPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; error?: string; success?: string }>;
}) {
  const user = await requireUser();
  if (!canAccessPsychology(user.role)) notFound();
  const search = await searchParams;
  const q = (search.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, Math.min(10000, Number.parseInt(search.page ?? "1", 10) || 1));
  type CaseRow = Pick<PsychologyCase, "id" | "category" | "status"> & {
    student: { name: string };
    psychologist: { name: string };
  };
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (user.role === "PSYCHOLOGIST") {
    params.push(user.id);
    conditions.push(`pc."psychologistId" = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`su."name" ILIKE $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const from = `FROM "PsychologyCase" pc
    JOIN "User" su ON su."id" = pc."studentId"
    JOIN "User" pu ON pu."id" = pc."psychologistId"`;
  const caseParams = [...params, 20, (page - 1) * 20];
  const [cases, countRows, students, professionals] = await Promise.all([
    db.query<CaseRow>(
      `SELECT pc."id", pc."category", pc."status",
         jsonb_build_object('name', su."name") AS "student",
         jsonb_build_object('name', pu."name") AS "psychologist"
       ${from}
       ${where}
       ORDER BY pc."updatedAt" DESC, pc."id" ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      caseParams,
    ),
    db.query<{ count: number }>(`SELECT COUNT(*)::int AS "count" ${from} ${where}`, params),
    db.sql<Pick<User, "id" | "name" | "email">>`
      SELECT "id", "name", "email" FROM "User"
      WHERE "role" = 'STUDENT' AND "isActive" = TRUE ORDER BY "name" ASC
    `,
    user.role === "PSYCHOLOGIST"
      ? db.sql<Pick<User, "id" | "name">>`
          SELECT "id", "name" FROM "User"
          WHERE "role" = 'PSYCHOLOGIST' AND "isActive" = TRUE AND "id" = ${user.id}
          ORDER BY "name" ASC
        `
      : db.sql<Pick<User, "id" | "name">>`
          SELECT "id", "name" FROM "User"
          WHERE "role" = 'PSYCHOLOGIST' AND "isActive" = TRUE ORDER BY "name" ASC
        `,
  ]);
  const count = countRows[0]!.count;
  return <div>
    <PageHeader title="Psicología" description={user.role === "PSYCHOLOGIST" ? "Tus fichas de atención, citas y seguimiento." : "Derivaciones y citas de orientación escolar."} />
    <div className="space-y-6 p-4 sm:p-8">
      {search.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{search.error}</p>}
      {search.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{search.success}</p>}
      <section className="space-y-4 border bg-white p-5">
        <h2 className="text-lg font-semibold">Fichas ({count})</h2>
        <form action="/psychology" className="flex gap-3"><Input name="q" defaultValue={q} placeholder="Buscar estudiante" aria-label="Buscar estudiante" maxLength={120} /><Button type="submit" variant="outline">Buscar</Button></form>
        {!cases.length ? <p className="text-sm text-slate-500">No hay fichas para mostrar.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-2">Estudiante</th><th className="p-2">Derivación</th><th className="p-2">Profesional</th><th className="p-2">Estado</th><th className="p-2">Ficha</th></tr></thead>
          <tbody>{cases.map(record => <tr key={record.id} className="border-b"><td className="p-2">{record.student.name}</td><td className="p-2">{psychologyCategories[record.category]}</td><td className="p-2">{record.psychologist.name}</td><td className="p-2">{psychologyStatuses[record.status]}</td><td className="p-2"><Link href={`/psychology/${record.id}`} className="text-blue-700 underline">Abrir</Link></td></tr>)}</tbody>
        </table></div>}
        <div className="flex gap-4 text-sm"><span>Página {page}</span>{page > 1 && <Link href={`/psychology?q=${encodeURIComponent(q)}&page=${page - 1}`}>Anterior</Link>}{page * 20 < count && <Link href={`/psychology?q=${encodeURIComponent(q)}&page=${page + 1}`}>Siguiente</Link>}</div>
      </section>
      <section className="space-y-4 border bg-white p-5">
        <h2 className="text-lg font-semibold">Nueva derivación</h2>
        <p className="text-sm text-slate-500">Se abre una ficha por estudiante. El detalle de la atención lo registra únicamente su profesional asignado.</p>
        {!professionals.length ? <p className="text-sm text-amber-800">Administración debe crear o activar una cuenta con el rol Psicología.</p> : !students.length ? <p className="text-sm text-slate-500">No hay estudiantes activos.</p> : <form action={psychologyAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="operation" value="open" />
          <label className="text-sm">Estudiante<Select name="studentId" defaultValue="" required><option value="" disabled>Selecciona</option>{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}</Select></label>
          <label className="text-sm">Profesional<Select name="psychologistId" defaultValue="" required><option value="" disabled>Selecciona</option>{professionals.map(professional => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</Select></label>
          <label className="text-sm">Tipo de orientación<Select name="category">{Object.entries(psychologyCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          <div className="self-end"><ManagementSubmit>Abrir ficha</ManagementSubmit></div>
        </form>}
      </section>
    </div>
  </div>;
}
