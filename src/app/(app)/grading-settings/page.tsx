import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradingScaleForm } from "@/components/grading-scale-form";
import { ClientGetForm } from "@/components/client-get-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { activeSchoolLevels } from "@/lib/academics";
import { db } from "@/lib/db";
import type { AcademicYear, GradingScale } from "@/lib/db-types";
import { scaleLabel, scaleSchema } from "@/lib/grading";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Escalas de calificación" };

export default async function GradingSettingsPage({ searchParams }: {
  searchParams: Promise<{ year?: string; error?: string; success?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const years = await db.query<AcademicYear & { gradingScales: GradingScale[] }>(
    `SELECT ay.*, COALESCE((
       SELECT jsonb_agg(to_jsonb(gs) ORDER BY gs."level")
       FROM "GradingScale" gs WHERE gs."yearId" = ay."id"
     ), '[]'::jsonb) AS "gradingScales"
     FROM "AcademicYear" ay
     ORDER BY ay."startsOn" DESC`,
  );
  const year = params.year ? years.find(item => item.id === params.year) : years[0];
  if (params.year && !year) notFound();
  return <div>
    <PageHeader title="Escalas de calificación" description="Configura las notas del periodo por año lectivo y nivel educativo." />
    <div className="space-y-6 p-4 sm:p-8">
      {params.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
      {params.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
      <p className="text-sm text-slate-600">Las notas anteriores conservan su escala original. Los cambios se aplican a nuevas notas y a las correcciones que el docente guarde después. Las tareas siguen usando su puntaje propio.</p>
      {!year ? <p className="text-sm">Primero <Link className="text-blue-700 underline" href="/academics">crea un año lectivo</Link>.</p> : <>
      <ClientGetForm action="/grading-settings" className="flex flex-wrap items-end gap-3 border bg-white p-5">
          <label className="flex-1 text-sm">Año lectivo<Select name="year" defaultValue={year.id}>{years.map(item => <option key={item.id} value={item.id}>{item.name}{item.isClosed ? " (cerrado)" : ""}</option>)}</Select></label>
          <Button type="submit" variant="outline">Consultar</Button>
      </ClientGetForm>
        {Object.entries(activeSchoolLevels).map(([level, label]) => {
          const saved = year.gradingScales.find(scale => scale.level === level);
          const config = saved ? scaleSchema.parse(saved.config) : undefined;
          return <section key={`${year.id}-${level}-${saved?.version ?? 0}`} className="space-y-4 border bg-white p-5">
            <h2 className="text-lg font-semibold">{label}</h2>
            <p className="text-sm text-slate-500">{config ? `Escala actual: ${scaleLabel(config)}` : "Sin configurar. Guarda una escala para habilitar las notas del periodo."}</p>
            {year.isClosed ? <p className="text-sm text-slate-500">El año está cerrado. Reábrelo en Gestión académica para cambiar la escala.</p>
              : <GradingScaleForm yearId={year.id} level={level} version={saved?.version ?? 0} config={config} />}
          </section>;
        })}
      </>}
    </div>
  </div>;
}
