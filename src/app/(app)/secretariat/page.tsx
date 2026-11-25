import type { Metadata } from "next";
import { ArrowRight, GraduationCap, ReceiptText, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Panel de Secretaría" };

export default async function SecretariatPage() {
  const actor = await requireUser();
  if (actor.role !== "SECRETARY") notFound();
  const [students, courses] = await Promise.all([
    db.sql<{ count: number }>`SELECT COUNT(*)::int AS "count" FROM "User" WHERE "role" = 'STUDENT' AND "isActive" = TRUE`,
    db.sql<{ count: number }>`SELECT COUNT(*)::int AS "count" FROM "Course"`,
  ]);

  return <div>
    <PageHeader title="Panel de Secretaría" description="Registro de estudiantes, matrículas y captación de ingresos." />
    <div className="space-y-6 p-4 sm:p-8">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-600"><Users className="h-4 w-4 text-blue-700" />Estudiantes activos</p><p className="mt-2 text-3xl font-semibold">{students[0]?.count ?? 0}</p></div>
        <div className="border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-600"><GraduationCap className="h-4 w-4 text-blue-700" />Cursos registrados</p><p className="mt-2 text-3xl font-semibold">{courses[0]?.count ?? 0}</p></div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Link href="/payments" className="group border border-slate-200 bg-white p-6 transition-colors hover:border-blue-300 hover:bg-blue-50/30">
          <span className="flex h-11 w-11 items-center justify-center bg-blue-50 text-blue-700"><ReceiptText className="h-5 w-5" /></span>
          <h2 className="mt-4 text-lg font-semibold">Caja y pagos</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Registra pagos por certificados y otros conceptos, imprime el recibo y descarga el Excel del mes.</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700">Registrar o revisar ingresos<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>
        <Link href="/administration" className="group border border-slate-200 bg-white p-6 transition-colors hover:border-blue-300 hover:bg-blue-50/30">
          <span className="flex h-11 w-11 items-center justify-center bg-emerald-50 text-emerald-700"><GraduationCap className="h-5 w-5" /></span>
          <h2 className="mt-4 text-lg font-semibold">Estudiantes y matrículas</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Registra estudiantes, revisa las cuentas y administra su matrícula en los cursos.</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700">Abrir gestión estudiantil<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>
      </section>
    </div>
  </div>;
}
