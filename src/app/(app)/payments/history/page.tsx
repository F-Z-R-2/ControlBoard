import type { Metadata } from "next";
import { ArrowDownToLine, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Historial de ingresos" };

type ReceiptRow = {
  id: string;
  receiptNumber: number;
  issuedOn: string;
  receivedFrom: string;
  totalAmount: string;
  issuedByName: string;
};

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

function isValidMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export default async function IncomeHistoryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const actor = await requireUser();
  if (!["SECRETARY", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) notFound();
  const params = await searchParams;
  const month = isValidMonth(params.month) ? params.month : currentMonth();
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const nextMonthStart = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  const monthLabel = format(new Date(`${month}-01T12:00:00`), "MMMM yyyy", { locale: es });
  const receipts = await db.query<ReceiptRow>(
    `SELECT r."id", r."receiptNumber", r."issuedOn"::text AS "issuedOn", r."receivedFrom", r."totalAmount"::text AS "totalAmount", u."name" AS "issuedByName"
     FROM "IncomeReceipt" r JOIN "User" u ON u."id" = r."issuedById"
     WHERE r."issuedOn" >= $1::date AND r."issuedOn" < $2::date
     ORDER BY r."issuedOn" DESC, r."receiptNumber" DESC`,
    [`${month}-01`, nextMonthStart],
  );
  const totalCents = receipts.reduce((sum, receipt) => sum + Math.round(Number(receipt.totalAmount) * 100), 0);

  return <div>
    <PageHeader title="Historial de ingresos" description="Consulta los recibos del mes y descarga el registro Excel." actions={<><Link href="/payments" className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Panel</Link><a href={`/api/payments/export?month=${month}`} className="inline-flex h-10 items-center gap-2 bg-[#0b3ddb] px-4 text-sm font-medium text-white hover:bg-[#0932b5]"><ArrowDownToLine className="h-4 w-4" />Descargar Excel</a></>} />
    <div className="space-y-5 p-4 sm:p-8">
      <section className="flex flex-wrap items-end justify-between gap-4 border border-slate-200 bg-white p-5">
        <div><h2 className="text-lg font-semibold capitalize">{monthLabel}</h2><p className="mt-1 text-sm text-slate-500">{receipts.length} recibos · S/ {(totalCents / 100).toFixed(2)} captados</p></div>
        <form method="get" action="/payments/history" className="flex items-end gap-2"><label className="text-sm">Selecciona el mes<Input type="month" name="month" defaultValue={month} required /></label><Button type="submit" variant="outline">Consultar</Button></form>
      </section>
      <section className="border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">Fecha</th><th className="p-3">RN N°</th><th className="p-3">Recibido de</th><th className="p-3">Importe</th><th className="p-3">Registró</th><th className="p-3">Recibo</th></tr></thead><tbody>
          {receipts.map((receipt) => <tr key={receipt.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-3">{format(new Date(`${receipt.issuedOn}T12:00:00`), "dd/MM/yyyy")}</td><td className="p-3 font-medium">{String(receipt.receiptNumber).padStart(6, "0")}</td><td className="p-3">{receipt.receivedFrom}</td><td className="p-3">S/ {Number(receipt.totalAmount).toFixed(2)}</td><td className="p-3">{receipt.issuedByName}</td><td className="p-3"><Link href={`/payments/${receipt.id}`} className="font-medium text-blue-700 hover:underline">Imprimir</Link></td></tr>)}
        </tbody></table></div>
        {receipts.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No hay ingresos registrados en {monthLabel}.</p>}
      </section>
    </div>
  </div>;
}
