import type { Metadata } from "next";
import { ArrowDownToLine, ArrowRight, Plus, ReceiptText, WalletCards } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Caja y pagos" };

type ReceiptRow = {
  id: string;
  receiptNumber: number;
  issuedOn: string;
  receivedFrom: string;
  totalAmount: string;
};

type PaymentDashboardData = {
  count: number;
  total: string;
  nextNumber: number;
  recent: ReceiptRow[] | string;
};

function limaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

export default async function PaymentsPage() {
  const actor = await requireUser();
  if (!["SECRETARY", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) notFound();
  const today = limaToday();
  const month = today.slice(0, 7);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const nextMonth = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  const monthLabel = format(new Date(`${month}-01T12:00:00`), "MMMM yyyy", { locale: es });
  const dashboardRows = await db.query<PaymentDashboardData>(
    `SELECT
       (SELECT COUNT(*)::int FROM "IncomeReceipt" WHERE "issuedOn" >= $1::date AND "issuedOn" < $2::date) AS "count",
       COALESCE((SELECT SUM("totalAmount") FROM "IncomeReceipt" WHERE "issuedOn" >= $1::date AND "issuedOn" < $2::date), 0)::text AS "total",
       COALESCE((SELECT "nextNumber" FROM "IncomeReceiptCounter" WHERE "id" = 'main' LIMIT 1), 1) AS "nextNumber",
       COALESCE((
         SELECT json_agg(recent_receipts)
         FROM (
           SELECT "id", "receiptNumber", "issuedOn"::text AS "issuedOn", "receivedFrom", "totalAmount"::text AS "totalAmount"
           FROM "IncomeReceipt" ORDER BY "createdAt" DESC LIMIT 5
         ) AS recent_receipts
       ), '[]'::json) AS "recent"`,
    [`${month}-01`, nextMonth],
  );
  const dashboard = dashboardRows[0]!;
  const recent = typeof dashboard.recent === "string" ? JSON.parse(dashboard.recent) as ReceiptRow[] : dashboard.recent;
  const totalCents = Math.round(Number(dashboard.total) * 100);

  return <div>
    <PageHeader title="Caja y pagos" description="Panel de captación de ingresos de la institución." />
    <div className="space-y-6 p-4 sm:p-8">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-600"><WalletCards className="h-4 w-4 text-blue-700" />Ingresos de {monthLabel}</p><p className="mt-2 text-3xl font-semibold">S/ {(totalCents / 100).toFixed(2)}</p></div>
        <div className="border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-600"><ReceiptText className="h-4 w-4 text-emerald-700" />Recibos emitidos en el mes</p><p className="mt-2 text-3xl font-semibold">{dashboard.count}</p></div>
        <div className="border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-600">Siguiente recibo</p><p className="mt-2 text-3xl font-semibold">N.º {String(dashboard.nextNumber).padStart(6, "0")}</p><p className="mt-1 text-xs text-slate-500">Asignación automática al guardar.</p></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/payments/new" className="group flex min-h-48 flex-col justify-between border border-blue-200 bg-white p-6 transition-colors hover:border-blue-400 hover:bg-blue-50/40">
          <span className="flex h-11 w-11 items-center justify-center bg-blue-50 text-blue-700"><Plus className="h-6 w-6" /></span>
          <span><h2 className="text-lg font-semibold">Registrar nuevo ingreso</h2><p className="mt-1 text-sm text-slate-600">Marca los conceptos, ingresa los importes e imprime el recibo.</p></span>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">Abrir registro<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>
        <Link href="/payments/history" className="group flex min-h-48 flex-col justify-between border border-slate-200 bg-white p-6 transition-colors hover:border-blue-300 hover:bg-slate-50">
          <span className="flex h-11 w-11 items-center justify-center bg-emerald-50 text-emerald-700"><ArrowDownToLine className="h-5 w-5" /></span>
          <span><h2 className="text-lg font-semibold">Historial y Excel mensual</h2><p className="mt-1 text-sm text-slate-600">Busca recibos por mes y descarga el libro de captación con sus totales.</p></span>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">Ver historial<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>
      </section>

      <section className="border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="recent-receipts-title">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 id="recent-receipts-title" className="text-lg font-semibold">Movimientos recientes</h2><p className="mt-1 text-sm text-slate-500">Últimos recibos registrados en caja.</p></div><Link href="/payments/history" className="text-sm font-medium text-blue-700 hover:underline">Ver historial completo</Link></div>
        {recent.length ? <div className="divide-y divide-slate-100">{recent.map((receipt) => <Link key={receipt.id} href={`/payments/${receipt.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-50"><span><span className="font-medium">{receipt.receivedFrom}</span><span className="ml-2 text-xs text-slate-500">N.º {String(receipt.receiptNumber).padStart(6, "0")} · {format(new Date(`${receipt.issuedOn}T12:00:00`), "dd/MM/yyyy")}</span></span><span className="font-semibold tabular-nums">S/ {Number(receipt.totalAmount).toFixed(2)}</span></Link>)}</div> : <p className="py-8 text-center text-sm text-slate-500">Aún no hay ingresos registrados. Usa “Registrar nuevo ingreso” para emitir el primer recibo.</p>}
      </section>
    </div>
  </div>;
}
