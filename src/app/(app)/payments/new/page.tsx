import type { Metadata } from "next";
import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { IncomeReceiptForm } from "@/components/income-receipt-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Registrar ingreso" };

export default async function NewIncomePage() {
  const actor = await requireUser();
  if (!["SECRETARY", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) notFound();
  const today = new Date();
  const dateLabel = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" }).format(today);

  return <div>
    <PageHeader title="Nuevo ingreso" description="Registra un pago y emite su recibo de caja." actions={<><Link href="/payments" className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Panel</Link><Link href="/payments/history" className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"><History className="h-4 w-4" />Historial</Link></>} />
    <div className="p-4 sm:p-8">
      <section className="mx-auto max-w-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-200 pb-4"><div><h2 className="text-lg font-semibold">Captación de ingresos</h2><p className="mt-1 text-sm text-slate-500">UGEL Arequipa Sur · I. E. 40122 “Manuel Scorza Torres”</p></div><p className="text-right text-xs text-slate-500">Fecha automática<br /><span className="font-medium text-slate-700">{dateLabel}</span></p></div>
        <IncomeReceiptForm />
      </section>
    </div>
  </div>;
}
