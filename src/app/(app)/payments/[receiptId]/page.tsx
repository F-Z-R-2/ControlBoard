import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { PrintReceiptButton } from "@/components/print-receipt-button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";

type Receipt = { id: string; receiptNumber: number; issuedOn: string; receivedFrom: string; totalAmount: string };
type ReceiptLine = { conceptLabel: string; amount: string };

export default async function ReceiptPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const actor = await requireUser();
  if (!["SECRETARY", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) notFound();
  const { receiptId } = await params;
  const [rows, lines] = await Promise.all([
    db.query<Receipt>(
      `SELECT "id", "receiptNumber", "issuedOn"::text AS "issuedOn", "receivedFrom", "totalAmount"::text AS "totalAmount"
       FROM "IncomeReceipt" WHERE "id" = $1 LIMIT 1`,
      [receiptId],
    ),
    db.query<ReceiptLine>(`SELECT "conceptLabel", "amount"::text AS "amount" FROM "IncomeReceiptLine" WHERE "receiptId" = $1 ORDER BY "id"`, [receiptId]),
  ]);
  const receipt = rows[0];
  if (!receipt) notFound();
  const date = format(new Date(`${receipt.issuedOn}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es });

  return <main className="min-h-screen bg-slate-100 px-4 py-6 print:min-h-0 print:bg-white print:p-0">
    <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 print:hidden"><Link href="/payments/history" className="inline-flex items-center gap-2 text-sm text-blue-700"><ArrowLeft className="h-4 w-4" />Volver al historial</Link><PrintReceiptButton /></div>
    <article className="thermal-ticket mx-auto w-full max-w-sm border border-slate-300 bg-white p-5 font-mono text-sm text-black shadow-sm print:border-0 print:p-0 print:shadow-none">
      <header className="text-center leading-tight">
        <p className="font-bold uppercase">UGEL Arequipa Sur</p>
        <p className="mt-1 text-lg font-bold">40122</p>
        <p className="font-bold uppercase">“Manuel Scorza Torres”</p>
        <p className="mt-1 text-xs">Cerro Juli · Telf. 430452</p>
        <p className="mt-3 border-y border-dashed border-black py-2 text-xs font-bold uppercase tracking-wide">Captación de ingresos</p>
      </header>
      <div className="mt-3 flex justify-between gap-2 font-bold"><span>RECIBO N.º</span><span>{String(receipt.receiptNumber).padStart(6, "0")}</span></div>
      <p className="mt-3 border-b border-dashed border-black pb-2">Recibí del Sr. / Sra.<br /><strong className="mt-1 block break-words text-base">{receipt.receivedFrom}</strong></p>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between gap-2 border-b border-dashed border-slate-400 pb-1 text-[10px] font-bold uppercase"><span>Concepto</span><span>Importe S/</span></div>
        {lines.map((line, index) => <div key={`${line.conceptLabel}-${index}`} className="flex justify-between gap-2"><span className="min-w-0 break-words">{line.conceptLabel}</span><span className="shrink-0 tabular-nums">{Number(line.amount).toFixed(2)}</span></div>)}
      </div>
      <div className="mt-3 flex justify-between border-y border-black py-2 text-base font-bold"><span>TOTAL</span><span>S/ {Number(receipt.totalAmount).toFixed(2)}</span></div>
      <p className="mt-3 text-center text-xs">Cerro Juli, {date}</p>
      <div className="mx-auto mt-8 w-4/5 border-t border-black pt-2 text-center text-[10px]">Firma y sello</div>
      <p className="mt-4 text-center text-[9px]">Conserve este recibo</p>
    </article>
  </main>;
}
