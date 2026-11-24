import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { PrintReceiptButton } from "@/components/print-receipt-button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { incomeConcepts } from "@/lib/income";

type Receipt = {
  id: string;
  receiptNumber: number;
  issuedOn: string;
  receivedFrom: string;
  documentNumber: string | null;
  totalAmount: string;
  note: string;
  issuedByName: string;
};

type ReceiptLine = { conceptCode: string; conceptLabel: string; amount: string };

export default async function ReceiptPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const actor = await requireUser();
  if (!["SECRETARY", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) notFound();
  const { receiptId } = await params;
  const [rows, lines] = await Promise.all([
    db.query<Receipt>(
      `SELECT r."id", r."receiptNumber", r."issuedOn"::text AS "issuedOn", r."receivedFrom", r."documentNumber",
         r."totalAmount"::text AS "totalAmount", r."note", u."name" AS "issuedByName"
       FROM "IncomeReceipt" r JOIN "User" u ON u."id" = r."issuedById" WHERE r."id" = $1 LIMIT 1`,
      [receiptId],
    ),
    db.query<ReceiptLine>(`SELECT "conceptCode", "conceptLabel", "amount"::text AS "amount" FROM "IncomeReceiptLine" WHERE "receiptId" = $1 ORDER BY "id"`, [receiptId]),
  ]);
  const receipt = rows[0];
  if (!receipt) notFound();

  const date = format(new Date(`${receipt.issuedOn}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es });
  const amountByCode = new Map<string, number>();
  const customLabels = new Map<string, number>();
  for (const line of lines) {
    if (line.conceptCode === "OTROS") customLabels.set(line.conceptLabel, (customLabels.get(line.conceptLabel) ?? 0) + Number(line.amount));
    else amountByCode.set(line.conceptCode, (amountByCode.get(line.conceptCode) ?? 0) + Number(line.amount));
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
    <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 print:hidden"><Link href="/payments" className="inline-flex items-center gap-2 text-sm text-blue-700"><ArrowLeft className="h-4 w-4" />Volver a Caja y pagos</Link><PrintReceiptButton /></div>
    <article className="mx-auto max-w-3xl border border-slate-300 bg-white p-6 text-slate-900 shadow-sm sm:p-10 print:max-w-none print:border-0 print:p-2 print:shadow-none">
      <header className="grid grid-cols-[1fr_auto] items-start gap-4 border-b-2 border-slate-800 pb-4">
        <div><p className="font-bold uppercase tracking-wide">UGEL Arequipa Sur</p><p className="mt-1 text-2xl font-bold">40122</p><p className="font-semibold uppercase">“Manuel Scorza Torres”</p><p className="mt-1 text-sm">Telf. 430452</p></div>
        <div className="min-w-48 border border-slate-700 p-3 text-center"><p className="text-sm font-semibold uppercase tracking-wide">Captación de ingresos</p><p className="mt-2 text-xs">N.º</p><p className="text-2xl font-bold tracking-widest">{String(receipt.receiptNumber).padStart(6, "0")}</p></div>
      </header>
      <p className="mt-5 border-b border-slate-400 pb-2 text-lg">Recibí del Sr. / Sra. <strong>{receipt.receivedFrom}</strong></p>
      {receipt.documentNumber ? <p className="mt-2 text-sm">DNI: {receipt.documentNumber}</p> : null}
      <table className="mt-5 w-full border-collapse text-sm"><thead><tr><th className="border border-slate-700 p-2 text-left">CONCEPTO</th><th className="w-36 border border-slate-700 p-2 text-right">IMPORTE (S/)</th></tr></thead><tbody>
        {incomeConcepts.filter((concept) => concept.code !== "OTROS").map((concept) => {
          const amount = amountByCode.get(concept.code);
          return <tr key={concept.code}><td className="border border-slate-400 p-2">{concept.label}</td><td className="border border-slate-400 p-2 text-right">{amount ? amount.toFixed(2) : ""}</td></tr>;
        })}
        {[...customLabels.entries()].map(([label, amount]) => <tr key={label}><td className="border border-slate-400 p-2">Otros: {label}</td><td className="border border-slate-400 p-2 text-right">{amount.toFixed(2)}</td></tr>)}
      </tbody><tfoot><tr><th className="border border-slate-700 p-2 text-left">TOTAL</th><th className="border border-slate-700 p-2 text-right">S/ {Number(receipt.totalAmount).toFixed(2)}</th></tr></tfoot></table>
      {receipt.note ? <p className="mt-4 text-sm">Observación: {receipt.note}</p> : null}
      <div className="mt-10 flex items-end justify-between gap-4"><p className="text-sm">Cerro Juli, {date}</p><div className="w-56 border-t border-slate-700 pt-2 text-center text-xs">Firma y sello</div></div>
      <p className="mt-6 text-right text-[10px] text-slate-500 print:hidden">Registró: {receipt.issuedByName}</p>
    </article>
  </main>;
}
