import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { saveAcademicAction } from "@/app/actions/academics";
import { ManagementSubmit } from "@/components/management-submit";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { schoolLevels } from "@/lib/academics";
import { db } from "@/lib/db";
import type { AcademicPeriod, AcademicYear, Course, SchoolGrade, SchoolSection } from "@/lib/db-types";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Gestión académica" };
const dateValue = (date: Date) => date.toISOString().slice(0, 10);

function AcademicForm({ kind, hidden = {}, children, label = "Guardar" }: {
  kind: string; hidden?: Record<string, string>; children: ReactNode; label?: string;
}) {
  return <form action={saveAcademicAction} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="kind" value={kind} />
    {Object.entries(hidden).map(([name, value]) => <input type="hidden" key={name} name={name} value={value} />)}
    {children}
    <div className="self-end"><ManagementSubmit>{label}</ManagementSubmit></div>
  </form>;
}

function NameField({ value = "", label = "Nombre" }: { value?: string; label?: string }) {
  return <label className="text-sm">{label}<Input name="name" defaultValue={value} maxLength={60} required /></label>;
}

function Dates({ start, end }: { start?: string; end?: string }) {
  return <>
    <label className="text-sm">Inicio<Input type="date" name="startsOn" defaultValue={start} min="2000-01-01" max="2099-12-31" required /></label>
    <label className="text-sm">Fin<Input type="date" name="endsOn" defaultValue={end} min="2000-01-01" max="2099-12-31" required /></label>
  </>;
}

export default async function AcademicsPage({ searchParams }: {
  searchParams: Promise<{ year?: string; error?: string; success?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const [yearRows, grades] = await Promise.all([
    db.query<AcademicYear & { periodCount: number; sectionCount: number }>(
      `SELECT ay.*,
         (SELECT COUNT(*)::int FROM "AcademicPeriod" ap WHERE ap."yearId" = ay."id") AS "periodCount",
         (SELECT COUNT(*)::int FROM "SchoolSection" ss WHERE ss."yearId" = ay."id") AS "sectionCount"
       FROM "AcademicYear" ay
       ORDER BY ay."startsOn" DESC`,
    ),
    db.sql<SchoolGrade>`SELECT * FROM "SchoolGrade" ORDER BY "level" ASC, "position" ASC, "name" ASC`,
  ]);
  const years = yearRows.map(({ periodCount, sectionCount, ...item }) => ({
    ...item,
    _count: { periods: periodCount, sections: sectionCount },
  }));
  const year = params.year ? years.find(item => item.id === params.year) : years[0];
  if (params.year && !year) notFound();
  const [periods, sectionRows, courseRows] = await Promise.all([
    year
      ? db.sql<AcademicPeriod>`SELECT * FROM "AcademicPeriod" WHERE "yearId" = ${year.id} ORDER BY "startsOn" ASC`
      : Promise.resolve([] as AcademicPeriod[]),
    year
      ? db.query<SchoolSection & { grade: SchoolGrade; courseCount: number }>(
          `SELECT ss.*, to_jsonb(sg) AS "grade",
             (SELECT COUNT(*)::int FROM "Course" c WHERE c."sectionId" = ss."id") AS "courseCount"
           FROM "SchoolSection" ss
           JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
           WHERE ss."yearId" = $1
           ORDER BY sg."position" ASC, ss."name" ASC`,
          [year.id],
        )
      : Promise.resolve([] as (SchoolSection & { grade: SchoolGrade; courseCount: number })[]),
    db.query<
      Course & {
        section: (SchoolSection & { grade: SchoolGrade; year: AcademicYear }) | null;
        academicPeriod: AcademicPeriod | null;
      }
    >(
      `SELECT c.*,
         CASE WHEN ss."id" IS NULL THEN NULL ELSE jsonb_build_object(
           'id', ss."id", 'yearId', ss."yearId", 'gradeId', ss."gradeId", 'name', ss."name",
           'grade', to_jsonb(sg), 'year', to_jsonb(ay)
         ) END AS "section",
         CASE WHEN ap."id" IS NULL THEN NULL ELSE to_jsonb(ap) END AS "academicPeriod"
       FROM "Course" c
       LEFT JOIN "SchoolSection" ss ON ss."id" = c."sectionId"
       LEFT JOIN "SchoolGrade" sg ON sg."id" = ss."gradeId"
       LEFT JOIN "AcademicYear" ay ON ay."id" = ss."yearId"
       LEFT JOIN "AcademicPeriod" ap ON ap."id" = c."academicPeriodId"
       ORDER BY c."title" ASC`,
    ),
  ]);
  const sections = sectionRows.map(({ courseCount, ...section }) => ({
    ...section,
    _count: { courses: courseCount },
  }));
  const courses = courseRows;
  return <div>
    <PageHeader title="Gestión académica" description="Organiza años lectivos, periodos, grados y secciones del colegio." />
    <div className="space-y-6 p-4 sm:p-8">
      {params.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
      {params.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
      <section className="space-y-4 border bg-white p-5" aria-labelledby="years-title">
        <h2 id="years-title" className="text-lg font-semibold">1. Años lectivos</h2>
        <p className="text-xs text-slate-500">Cerrar un año bloquea la edición de periodos, secciones y vinculaciones de cursos. Las clases, notas y asistencias siguen disponibles.</p>
        {!years.length && <p className="text-sm text-slate-500">Crea el primer año lectivo para empezar.</p>}
        {years.map(item => <details key={item.id} className="border p-3">
          <summary className="cursor-pointer text-sm font-medium">{item.name} · {item.isClosed ? "Cerrado" : "Abierto"} · {item._count.periods} periodos · {item._count.sections} secciones</summary>
          <div className="mt-4"><AcademicForm kind="year" hidden={{ id: item.id }}>
            <NameField value={item.name} /><Dates start={dateValue(item.startsOn)} end={dateValue(item.endsOn)} />
            <label className="text-sm">Estado<Select name="isClosed" defaultValue={String(item.isClosed)}><option value="false">Abierto</option><option value="true">Cerrado</option></Select></label>
          </AcademicForm></div>
        </details>)}
        <details className="border p-3" open={!years.length}><summary className="cursor-pointer text-sm font-medium">Crear año lectivo</summary>
          <div className="mt-4"><AcademicForm kind="year" hidden={{ isClosed: "false" }} label="Crear año"><NameField label="Nombre del año (por ejemplo, 2027)" /><Dates /></AcademicForm></div>
        </details>
      </section>

      <section className="space-y-4 border bg-white p-5" aria-labelledby="grades-title">
        <h2 id="grades-title" className="text-lg font-semibold">2. Grados</h2>
        <p className="text-xs text-slate-500">Catálogo compartido entre años. Los grados usados en años cerrados no se pueden modificar.</p>
        {grades.map(grade => <details key={grade.id} className="border p-3">
          <summary className="cursor-pointer text-sm font-medium">{schoolLevels[grade.level]} · {grade.name}</summary>
          <div className="mt-4"><AcademicForm kind="grade" hidden={{ id: grade.id }}>
            <NameField value={grade.name} />
            <label className="text-sm">Nivel<Select name="level" defaultValue={grade.level}>{Object.entries(schoolLevels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
            <label className="text-sm">Orden<Input type="number" name="position" defaultValue={grade.position} min={1} max={20} required /></label>
          </AcademicForm></div>
        </details>)}
        <details className="border p-3" open={!grades.length}><summary className="cursor-pointer text-sm font-medium">Crear grado</summary>
          <div className="mt-4"><AcademicForm kind="grade" label="Crear grado">
            <NameField label="Nombre (por ejemplo, 1.º)" />
            <label className="text-sm">Nivel<Select name="level">{Object.entries(schoolLevels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
            <label className="text-sm">Orden<Input type="number" name="position" defaultValue={1} min={1} max={20} required /></label>
          </AcademicForm></div>
        </details>
      </section>

      {year && <>
        <form action="/academics" className="flex flex-wrap items-end gap-3 border bg-blue-50 p-4">
          <label className="flex-1 text-sm">Año para periodos, secciones y cursos<Select name="year" defaultValue={year.id}>{years.map(item => <option key={item.id} value={item.id}>{item.name}{item.isClosed ? " (cerrado)" : ""}</option>)}</Select></label>
          <Button type="submit" variant="outline">Consultar</Button>
        </form>
        <section className="space-y-4 border bg-white p-5" aria-labelledby="periods-title">
          <h2 id="periods-title" className="text-lg font-semibold">3. Periodos de {year.name}</h2>
          <p className="text-xs text-slate-500">Entre {dateValue(year.startsOn)} y {dateValue(year.endsOn)}. Los periodos no pueden superponerse.</p>
          {!periods.length && <p className="text-sm text-slate-500">No hay periodos registrados.</p>}
          {periods.map(period => <details key={period.id} className="border p-3">
            <summary className="cursor-pointer text-sm font-medium">{period.name} · {dateValue(period.startsOn)} — {dateValue(period.endsOn)}</summary>
            {!year.isClosed && <div className="mt-4"><AcademicForm kind="period" hidden={{ id: period.id, yearId: year.id }}><NameField value={period.name} /><Dates start={dateValue(period.startsOn)} end={dateValue(period.endsOn)} /></AcademicForm></div>}
          </details>)}
          {!year.isClosed && <details className="border p-3"><summary className="cursor-pointer text-sm font-medium">Crear periodo</summary>
            <div className="mt-4"><AcademicForm kind="period" hidden={{ yearId: year.id }} label="Crear periodo"><NameField label="Nombre (por ejemplo, Primer bimestre)" /><Dates /></AcademicForm></div>
          </details>}
        </section>
        <section className="space-y-4 border bg-white p-5" aria-labelledby="sections-title">
          <h2 id="sections-title" className="text-lg font-semibold">4. Secciones de {year.name}</h2>
          {!sections.length && <p className="text-sm text-slate-500">No hay secciones registradas.</p>}
          {sections.map(section => <details key={section.id} className="border p-3">
            <summary className="cursor-pointer text-sm font-medium">{schoolLevels[section.grade.level]} · {section.grade.name} · {section.name} · {section._count.courses} cursos</summary>
            {!year.isClosed && <div className="mt-4"><AcademicForm kind="section" hidden={{ id: section.id, yearId: year.id, gradeId: section.gradeId }}><NameField value={section.name} label="Sección" /></AcademicForm></div>}
          </details>)}
          {!year.isClosed && grades.length > 0 && <details className="border p-3"><summary className="cursor-pointer text-sm font-medium">Crear sección</summary>
            <div className="mt-4"><AcademicForm kind="section" hidden={{ yearId: year.id }} label="Crear sección">
              <NameField label="Sección (por ejemplo, A)" />
              <label className="text-sm">Grado<Select name="gradeId">{grades.map(grade => <option key={grade.id} value={grade.id}>{schoolLevels[grade.level]} · {grade.name}</option>)}</Select></label>
            </AcademicForm></div>
          </details>}
        </section>
        <section className="space-y-4 border bg-white p-5" aria-labelledby="courses-title">
          <h2 id="courses-title" className="text-lg font-semibold">5. Vincular cursos</h2>
          <p className="text-xs text-slate-500">Cada curso puede vincularse a una sección y un periodo del mismo año. Esto conserva sus estudiantes, contenido y notas.</p>
          {!year.isClosed && periods.length > 0 && sections.length > 0 ? <AcademicForm kind="assignment" label="Vincular curso">
            <label className="text-sm">Curso<Select name="courseId" required defaultValue=""><option value="" disabled>Selecciona un curso</option>{courses.filter(course => !course.section?.year.isClosed).map(course => <option key={course.id} value={course.id}>{course.code} · {course.title}{course.section ? ` (vinculado a ${course.section.year.name})` : ""}</option>)}</Select></label>
            <label className="text-sm">Sección<Select name="sectionId">{sections.map(section => <option key={section.id} value={section.id}>{schoolLevels[section.grade.level]} · {section.grade.name} · {section.name}</option>)}</Select></label>
            <label className="text-sm">Periodo<Select name="academicPeriodId">{periods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}</Select></label>
          </AcademicForm> : <p className="text-sm text-slate-500">Para vincular cursos necesitas un año abierto con periodos y secciones.</p>}
          <div className="divide-y">{courses.filter(course => course.section?.yearId === year.id).map(course => <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="text-sm"><p className="font-medium">{course.code} · {course.title}</p><p className="text-xs text-slate-500">{course.section?.grade.name} · {course.section?.name} · {course.academicPeriod?.name}</p></div>
            {!year.isClosed && <AcademicForm kind="unlink" hidden={{ courseId: course.id }} label="Desvincular">{null}</AcademicForm>}
          </div>)}</div>
        </section>
      </>}
    </div>
  </div>;
}
