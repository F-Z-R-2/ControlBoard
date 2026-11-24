import { ArrowRight, GraduationCap, Search, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { setStudentStatusAction } from "@/app/actions/students";
import { ClientGetForm } from "@/components/client-get-form";
import { StudentForm, type StudentSectionOption } from "@/components/student-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import type { SchoolGrade, SchoolSection, User } from "@/lib/db-types";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Estudiantes" };

type StudentRow = Pick<User, "id" | "name" | "email" | "isActive" | "createdAt">
  & { documentNumber: string | null; studentCode: string | null; sectionName: string | null; gradeName: string | null; level: "PRIMARY" | "SECONDARY" | null };

export default async function StudentsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; level?: string; grade?: string; section?: string; status?: string; page?: string; error?: string; success?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 100);
  const level = params.level === "PRIMARY" || params.level === "SECONDARY" ? params.level : "";
  const gradeId = (params.grade ?? "").slice(0, 80);
  const sectionId = (params.section ?? "").slice(0, 80);
  const status = params.status === "inactive" ? "inactive" : params.status === "active" ? "active" : "all";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const pageSize = 20;

  const [sectionRows, gradeRows] = await Promise.all([
    db.query<SchoolSection & { grade: SchoolGrade; yearName: string }>(
      `SELECT ss.*, to_jsonb(sg) AS "grade", ay."name" AS "yearName"
       FROM "SchoolSection" ss
       JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
       JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
       WHERE ay."id" = (SELECT "id" FROM "AcademicYear" WHERE "isClosed" = FALSE ORDER BY "startsOn" DESC LIMIT 1)
         AND sg."level" IN ('PRIMARY', 'SECONDARY') AND ss."name" IN ('A', 'B')
       ORDER BY sg."level", sg."position", ss."name"`,
    ),
    db.sql<SchoolGrade>`SELECT * FROM "SchoolGrade" WHERE "level" IN ('PRIMARY', 'SECONDARY') ORDER BY "level", "position", "name"`,
  ]);
  const sections: StudentSectionOption[] = sectionRows.map((section) => ({
    id: section.id,
    level: section.grade.level as StudentSectionOption["level"],
    gradeName: section.grade.name,
    sectionName: section.name,
    yearName: section.yearName,
  }));

  const where = [`u."role" = 'STUDENT'`];
  const values: unknown[] = [];
  const addFilter = (condition: (index: number) => string, value: unknown) => {
    values.push(value);
    where.push(condition(values.length));
  };
  if (query) addFilter((index) => `(u."name" ILIKE $${index} OR u."email" ILIKE $${index} OR sp."documentNumber" ILIKE $${index} OR sp."studentCode" ILIKE $${index})`, `%${query}%`);
  if (level) addFilter((index) => `sg."level" = $${index}`, level);
  if (gradeId) addFilter((index) => `sg."id" = $${index}`, gradeId);
  if (sectionId) addFilter((index) => `sp."schoolSectionId" = $${index}`, sectionId);
  if (status !== "all") addFilter((index) => `u."isActive" = $${index}`, status === "active");
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [students, countRows, totals] = await Promise.all([
    db.query<StudentRow>(
      `SELECT u."id", u."name", u."email", u."isActive", u."createdAt",
         sp."documentNumber", sp."studentCode", ss."name" AS "sectionName", sg."name" AS "gradeName", sg."level"
       FROM "User" u
       LEFT JOIN "StudentProfile" sp ON sp."userId" = u."id"
       LEFT JOIN "SchoolSection" ss ON ss."id" = sp."schoolSectionId"
       LEFT JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
       ${whereSql}
       ORDER BY u."name" ASC, u."id" ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      values,
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS "count" FROM "User" u
       LEFT JOIN "StudentProfile" sp ON sp."userId" = u."id"
       LEFT JOIN "SchoolSection" ss ON ss."id" = sp."schoolSectionId"
       LEFT JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId" ${whereSql}`,
      values,
    ),
    db.sql<{ total: number; active: number; primary: number; secondary: number }>`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE u."isActive")::int AS active,
        COUNT(*) FILTER (WHERE sg."level" = 'PRIMARY')::int AS primary,
        COUNT(*) FILTER (WHERE sg."level" = 'SECONDARY')::int AS secondary
      FROM "User" u
      LEFT JOIN "StudentProfile" sp ON sp."userId" = u."id"
      LEFT JOIN "SchoolSection" ss ON ss."id" = sp."schoolSectionId"
      LEFT JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
      WHERE u."role" = 'STUDENT'
    `,
  ]);
  const count = countRows[0]?.count ?? 0;
  const total = totals[0] ?? { total: 0, active: 0, primary: 0, secondary: 0 };
  const filterHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (level) search.set("level", level);
    if (gradeId) search.set("grade", gradeId);
    if (sectionId) search.set("section", sectionId);
    if (status !== "all") search.set("status", status);
    if (nextPage > 1) search.set("page", String(nextPage));
    return `/students${search.size ? `?${search.toString()}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Estudiantes"
        description="Registro y seguimiento de estudiantes de Primaria y Secundaria."
        actions={<Link href="#student-form" className="inline-flex h-10 items-center gap-2 border border-[#0b3ddb] bg-[#0b3ddb] px-4 text-sm font-medium text-white hover:bg-[#0932b5]"><UserPlus className="h-4 w-4" /> Nuevo estudiante</Link>}
      />
      <div className="space-y-6 p-4 sm:p-8">
        {params.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
        {params.success && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de estudiantes">
          {[
            { label: "Estudiantes", value: total.total, icon: Users },
            { label: "Activos", value: total.active, icon: GraduationCap },
            { label: "Primaria", value: total.primary, icon: GraduationCap },
            { label: "Secundaria", value: total.secondary, icon: GraduationCap },
          ].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><Icon className="h-4 w-4 text-blue-800" /></div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          </article>)}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="students-list-heading">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 id="students-list-heading" className="text-base font-semibold text-slate-950">Directorio de estudiantes</h2><p className="mt-1 text-xs text-slate-500">{count} resultados · código y DNI con búsqueda rápida</p></div>
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 sm:inline">{sections.length} secciones disponibles</span>
            </div>
            <ClientGetForm action="/students" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr_1fr_auto]">
              <label className="relative"><span className="sr-only">Buscar estudiante</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input name="q" defaultValue={query} placeholder="Nombre, DNI o código" className="pl-9" /></label>
              <Select name="level" defaultValue={level}><option value="">Todos los niveles</option><option value="PRIMARY">Primaria</option><option value="SECONDARY">Secundaria</option></Select>
              <Select name="grade" defaultValue={gradeId}><option value="">Todos los grados</option>{gradeRows.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</Select>
              <Select name="section" defaultValue={sectionId}><option value="">Todas las secciones</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.gradeName} · {section.sectionName}</option>)}</Select>
              <Select name="status" defaultValue={status}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></Select>
              <div className="flex gap-2"><Button type="submit" variant="secondary" className="flex-1">Filtrar</Button><Link href="/students" className="inline-flex h-10 items-center border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-50">Limpiar</Link></div>
            </ClientGetForm>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Estudiante</th><th className="px-4 py-3 font-semibold">DNI / Código</th><th className="px-4 py-3 font-semibold">Nivel y sección</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 text-right font-semibold">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => <tr key={student.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5"><Link href={`/students/${student.id}`} className="font-medium text-slate-950 hover:text-blue-800">{student.name}</Link><p className="mt-0.5 text-xs text-slate-500">{student.email}</p></td>
                  <td className="px-4 py-3.5"><p>{student.documentNumber ?? "—"}</p><p className="mt-0.5 font-mono text-[11px] text-slate-500">{student.studentCode ?? "Pendiente"}</p></td>
                  <td className="px-4 py-3.5">{student.level ? <><p className="font-medium">{student.level === "PRIMARY" ? "Primaria" : "Secundaria"} · {student.gradeName}</p><p className="mt-0.5 text-xs text-slate-500">Sección {student.sectionName}</p></> : <span className="text-xs text-slate-500">Sin sección asignada</span>}</td>
                  <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${student.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><span className={`mr-1.5 mt-1 h-1.5 w-1.5 rounded-full ${student.isActive ? "bg-emerald-600" : "bg-slate-400"}`} />{student.isActive ? "Activo" : "Inactivo"}</span></td>
                  <td className="px-4 py-3.5"><div className="flex items-center justify-end gap-3"><Link href={`/students/${student.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline">Ver ficha <ArrowRight className="h-3 w-3" /></Link><form action={setStudentStatusAction}><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="isActive" value={String(!student.isActive)} /><button type="submit" className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900">{student.isActive ? "Desactivar" : "Activar"}</button></form></div></td>
                </tr>)}
                {!students.length && <tr><td colSpan={5} className="px-4 py-12 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-800">No se encontraron estudiantes</p><p className="mt-1 text-xs text-slate-500">Prueba con otros filtros o registra un estudiante.</p></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>{count ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} de ${count}` : "0 resultados"}</span><div className="flex gap-2">{page > 1 && <Link href={filterHref(page - 1)} className="border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Anterior</Link>}{page * pageSize < count && <Link href={filterHref(page + 1)} className="border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Siguiente</Link>}</div></div>
        </section>

        <section id="student-form" className="scroll-mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Registrar nuevo estudiante</h2>
          {sections.length ? <StudentForm sections={sections} /> : <div><p className="text-sm text-slate-600">Para registrar estudiantes, primero configura grados y secciones A/B de Primaria o Secundaria en un año lectivo abierto.</p><Link href="/academics" className="mt-3 inline-flex text-sm font-medium text-blue-800 underline">Abrir Gestión académica</Link></div>}
        </section>
      </div>
    </div>
  );
}
