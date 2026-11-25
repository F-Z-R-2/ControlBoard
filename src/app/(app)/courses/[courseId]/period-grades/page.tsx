import { savePeriodGradeAction } from "@/app/actions/grading";
import { ManagementSubmit } from "@/components/management-submit";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import type { GradingScale, PeriodGrade, User } from "@/lib/db-types";
import { gradeLabel, scaleLabel, scaleSchema, validGrade, type GradeScale } from "@/lib/grading";
import { getCourseAccess } from "@/lib/permissions";

type GradingScaleWithConfig = Omit<GradingScale, "config"> & { config: GradeScale };
type PeriodGradeWithSnapshot = Omit<PeriodGrade, "scaleSnapshot"> & { scaleSnapshot: GradeScale };
type HistoryRecord = PeriodGrade & {
  student: Pick<User, "name">;
  period: { name: string; year: { name: string } };
};
type EnrollmentRef = { user: Pick<User, "id" | "name"> };

export default async function PeriodGradesPage({ params, searchParams }: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const { course, canManage, user } = await getCourseAccess(courseId);
  const [scaleRows, enrollments, currentRecords, history] = await Promise.all([
    course.section ? db.sql<GradingScaleWithConfig>`
      SELECT * FROM "GradingScale"
      WHERE "yearId" = ${course.section.yearId} AND "level"::text = ${course.section.grade.level}
      LIMIT 1
    ` : Promise.resolve([] as GradingScaleWithConfig[]),
    canManage ? db.sql<EnrollmentRef>`
      SELECT jsonb_build_object('id', u."id", 'name', u."name") AS "user"
      FROM "Enrollment" e
      JOIN "User" u ON u."id" = e."userId"
      WHERE e."courseId" = ${courseId} AND e."role"::text = 'STUDENT'
        AND u."role"::text = 'STUDENT' AND u."isActive" = true
      ORDER BY u."name" ASC
    ` : Promise.resolve([] as EnrollmentRef[]),
    course.academicPeriodId ? db.sql<PeriodGradeWithSnapshot>`
      SELECT * FROM "PeriodGrade"
      WHERE "courseId" = ${courseId} AND "periodId" = ${course.academicPeriodId}
        AND (${canManage}::boolean OR "studentId" = ${user.id})
    ` : Promise.resolve([] as PeriodGradeWithSnapshot[]),
    db.sql<HistoryRecord>`
      SELECT pg.*,
        jsonb_build_object('name', s."name") AS student,
        jsonb_build_object('name', ap."name", 'year', jsonb_build_object('name', ay."name")) AS period
      FROM "PeriodGrade" pg
      JOIN "User" s ON s."id" = pg."studentId"
      JOIN "AcademicPeriod" ap ON ap."id" = pg."periodId"
      JOIN "AcademicYear" ay ON ay."id" = ap."yearId"
      WHERE pg."courseId" = ${courseId}
        AND (${canManage}::boolean OR pg."studentId" = ${user.id})
      ORDER BY pg."updatedAt" DESC
      LIMIT 100
    `,
  ]);
  const scale = scaleRows[0] ?? null;
  const config = scale ? scaleSchema.parse(scale.config) : null;
  const available = course.section && course.academicPeriod && course.section.yearId === course.academicPeriod.yearId && !course.section.year.isClosed && config && scale;
  return <div className="space-y-6">
    <div><h2 className="text-lg font-semibold">Notas del periodo</h2><p className="mt-1 text-sm text-slate-500">{course.academicPeriod?.name ?? "Periodo no asignado"}{config ? ` · Escala actual: ${scaleLabel(config)}` : ""}</p></div>
    {query.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{query.error}</p>}
    {query.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{query.success}</p>}
    {canManage && <>
      <p className="text-sm text-slate-600">Registra la calificación del periodo por estudiante. Al guardar, el estudiante podrá consultarla.</p>
      {!available && <p className="border border-amber-200 bg-amber-50 p-4 text-sm">Para registrar notas, el curso debe tener sección y periodo del mismo año abierto y una escala configurada por Secretaría o Administración.</p>}
      {available && config && scale && <div className="space-y-4">
        {!enrollments.length && <p className="text-sm text-slate-500">No hay estudiantes activos matriculados.</p>}
        {enrollments.map(({ user: student }) => {
          const record = currentRecords.find(item => item.studentId === student.id);
          const previousScale = record ? scaleSchema.parse(record.scaleSnapshot) : null;
          const changed = previousScale && JSON.stringify(previousScale) !== JSON.stringify(config);
          const defaultValue = record && !changed && validGrade(record.value, config) ? record.value : "";
          return <form action={savePeriodGradeAction} key={`${student.id}-${record?.version ?? 0}-${scale.version}`} className="space-y-3 border bg-white p-4">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="periodId" value={course.academicPeriodId ?? ""} />
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="version" value={record?.version ?? 0} />
            <input type="hidden" name="scaleVersion" value={scale.version} />
            <input type="hidden" name="scaleId" value={scale.id} />
            <h3 className="text-sm font-semibold">{student.name}</h3>
            {record && previousScale && <p className="text-xs text-slate-600">Guardado: {gradeLabel(record.value, previousScale)} · Escala: {scaleLabel(previousScale)}</p>}
            {changed && <p className="text-xs text-amber-800">La escala cambió. La nota anterior se conserva hasta que ingreses y guardes una nueva calificación con la escala actual.</p>}
            <div className="grid items-end gap-3 sm:grid-cols-[180px_1fr_auto]">
              <label className="text-sm">Calificación
                {config.kind === "NUMERIC" ? <Input name="value" type="number" min={config.min} max={config.max} step={10 ** -config.decimals} defaultValue={defaultValue} required />
                  : <Select name="value" defaultValue={defaultValue} required><option value="" disabled>Selecciona</option>{config.options.map(option => <option key={option.code} value={option.code}>{option.code} · {option.label}</option>)}</Select>}
              </label>
              <label className="text-sm">Observación<Textarea name="comment" maxLength={1000} rows={2} defaultValue={record?.comment ?? ""} /></label>
              <ManagementSubmit>Guardar nota</ManagementSubmit>
            </div>
          </form>;
        })}
      </div>}
    </>}
    <section className="border bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">{canManage ? "Últimos registros (hasta 100)" : "Mis notas del periodo"}</h2>
      {!history.length ? <p className="text-sm text-slate-500">Todavía no hay notas registradas.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b">{canManage && <th className="p-2">Estudiante</th>}<th className="p-2">Periodo</th><th className="p-2">Nota y escala usada</th><th className="p-2">Observación</th></tr></thead>
        <tbody>{history.map(record => {
          const original = scaleSchema.parse(record.scaleSnapshot);
          return <tr key={record.id} className="border-b">{canManage && <td className="p-2">{record.student.name}</td>}<td className="p-2">{record.period.year.name} · {record.period.name}</td><td className="p-2"><p>{gradeLabel(record.value, original)}</p><p className="text-xs text-slate-500">{scaleLabel(original)}</p></td><td className="whitespace-pre-wrap p-2">{record.comment || "—"}</td></tr>;
        })}</tbody>
      </table></div>}
    </section>
  </div>;
}
