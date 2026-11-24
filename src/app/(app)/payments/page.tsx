import type { Metadata } from "next";
import { ArrowDownToLine, ReceiptText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { setFirstReceiptNumberAction } from "@/app/actions/payments";
import { IncomeReceiptForm } from "@/components/income-receipt-form";
import { ManagementSubmit } from "@/components/management-submit";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Caja y pagos" };

type ReceiptRow = {
  id: string;
  receiptNumber: number;
  issuedOn: string;
  receivedFrom: string;
  totalAmount: string;
  issuedByName: string;
};

function limaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function currentMonth() {
  return limaToday().slice(0, 7);
}

function isValidMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ month?: string; error?: string; success?: string }> }) {
  const actor = await requireUser();
  if (!["SECRETARY", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) notFound();
  const params = await searchParams;
  const month = isValidMonth(params.month) ? params.month : currentMonth();
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  const nextYear = monthIndex === 12 ? year + 1 : year;
  const nextMonth = monthIndex === 12 ? 1 : monthIndex + 1;
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const monthLabel = format(new Date(`${month}-01T12:00:00`), "MMMM yyyy", { locale: es });
  const [receipts, totalRows, counterRows] = await Promise.all([
    db.query<ReceiptRow>(
      `SELECT r."id", r."receiptNumber", r."issuedOn"::text AS "issuedOn", r."receivedFrom", r."totalAmount"::text AS "totalAmount", u."name" AS "issuedByName"
       FROM "IncomeReceipt" r JOIN "User" u ON u."id" = r."issuedById"
       WHERE r."issuedOn" >= $1::date AND r."issuedOn" < $2::date
       ORDER BY r."issuedOn" DESC, r."receiptNumber" DESC`,
      [`${month}-01`, nextMonthStart],
    ),
    db.sql<{ count: number; sum: string | null }>`SELECT COUNT(*)::int AS "count", COALESCE(SUM("totalAmount"), 0)::text AS "sum" FROM "IncomeReceipt"`,
    db.sql<{ nextNumber: number }>`SELECT "nextNumber" FROM "IncomeReceiptCounter" WHERE "id" = 'main' LIMIT 1`,
  ]);
  const monthTotal = receipts.reduce((sum, row) => sum + Math.round(Number(row.totalAmount) * 100), 0) / 100;
  const dateToday = limaToday();

  return <div>
    <PageHeader title="Caja y pagos" description="Captación de ingresos institucionales, recibos y reporte mensual." actions={<a href={`/api/payments/export?month=${month}`} className="inline-flex h-10 items-center gap-2 border border-[#0b3ddb] bg-[#0b3ddb] px-4 text-sm font-medium text-white hover:bg-[#0932b5]"><ArrowDownToLine className="h-4 w-4" />Descargar Excel</a>} />
    <div className="space-y-6 p-4 sm:p-8">
      {params.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
      {params.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">Recibos en {monthLabel}</p><p className="mt-1 text-2xl font-semibold">{receipts.length}</p></div>
        <div className="border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">Ingresos del mes</p><p className="mt-1 text-2xl font-semibold">S/ {monthTotal.toFixed(2)}</p></div>
        <div className="border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">Ingresos registrados</p><p className="mt-1 text-2xl font-semibold">{totalRows[0]?.count ?? 0}</p><p className="text-xs text-slate-500">Total histórico: S/ {Number(totalRows[0]?.sum ?? 0).toFixed(2)}</p></div>
      </section>

      {receipts.length === 0 && (totalRows[0]?.count ?? 0) === 0 ? <section className="border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-semibold text-amber-950">Configura el primer número de recibo</h2>
        <p className="mt-1 text-sm text-amber-900">La numeración empieza en el número que elijas y continúa automáticamente.</p>
        <form action={setFirstReceiptNumberAction} className="mt-3 flex flex-wrap items-end gap-3"><label className="text-sm">Próximo número<Input name="nextNumber" type="number" min="1" max="9999999" defaultValue={counterRows[0]?.nextNumber ?? 1} required className="max-w-40" /></label><ManagementSubmit variant="outline">Guardar numeración</ManagementSubmit></form>
      </section> : null}

      <section className="border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="new-receipt-title">
        <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center bg-blue-50 text-blue-700"><ReceiptText className="h-5 w-5" /></span><div><h2 id="new-receipt-title" className="text-lg font-semibold">Registrar ingreso</h2><p className="text-sm text-slate-500">Completa los datos y genera el recibo imprimible.</p></div></div>
        <IncomeReceiptForm today={dateToday} />
      </section>

      <section className="border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="monthly-receipts-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 id="monthly-receipts-title" className="text-lg font-semibold">Registro mensual</h2><p className="mt-1 text-sm text-slate-500">Filtra por mes y descarga el libro con la plantilla de captación.</p></div>
          <form method="get" action="/payments" className="flex items-end gap-2"><label className="text-sm">Mes<Input type="month" name="month" defaultValue={month} required /></label><Button type="submit" variant="outline">Ver mes</Button></form>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Fecha</th><th className="p-3">RN N°</th><th className="p-3">Recibido de</th><th className="p-3">Importe</th><th className="p-3">Registró</th><th className="p-3">Recibo</th></tr></thead><tbody>
          {receipts.map((receipt) => <tr key={receipt.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-3">{format(new Date(`${receipt.issuedOn}T12:00:00`), "dd/MM/yyyy")}</td><td className="p-3 font-medium">{String(receipt.receiptNumber).padStart(6, "0")}</td><td className="p-3">{receipt.receivedFrom}</td><td className="p-3">S/ {Number(receipt.totalAmount).toFixed(2)}</td><td className="p-3">{receipt.issuedByName}</td><td className="p-3"><Link href={`/payments/${receipt.id}`} className="font-medium text-blue-700 hover:underline">Ver / imprimir</Link></td></tr>)}
        </tbody></table></div>
        {receipts.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No hay recibos registrados en {monthLabel}.</p>}
      </section>
    </div>
  </div>;
}
