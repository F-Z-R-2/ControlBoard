"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, newId } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { incomeConcepts } from "@/lib/income";

function paymentError(message: string): never {
  redirect(`/payments?error=${encodeURIComponent(message)}`);
}

function canManageIncome(role: string) {
  return role === "SECRETARY" || role === "ADMIN" || role === "SUPER_ADMIN";
}

const incomeSchema = z.object({
  receivedFrom: z.string().trim().min(3, "Escribe el nombre de quien paga").max(120),
});

const amountPattern = /^(?:0|[1-9]\d{0,8})(?:[.,]\d{1,2})?$/;

export async function createIncomeReceiptAction(formData: FormData) {
  const actor = await requireUser();
  if (!canManageIncome(actor.role)) paymentError("No tienes acceso al registro de ingresos");

  const parsed = incomeSchema.safeParse({
    receivedFrom: formData.get("receivedFrom"),
  });
  if (!parsed.success) paymentError(parsed.error.issues[0]?.message ?? "Revisa los datos del recibo");

  const conceptCodes = formData.getAll("conceptCode").map(String);
  const amounts = formData.getAll("amount").map(String);
  if (!conceptCodes.length || conceptCodes.length > incomeConcepts.length || amounts.length !== conceptCodes.length || new Set(conceptCodes).size !== conceptCodes.length) {
    paymentError("Marca al menos un concepto e ingresa su importe");
  }

  const lines = [] as { conceptCode: string; conceptLabel: string; reportCode: string; amount: string; cents: number }[];
  for (let index = 0; index < conceptCodes.length; index++) {
    const concept = incomeConcepts.find((item) => item.code === conceptCodes[index]);
    if (!concept) paymentError("Selecciona conceptos válidos");
    const rawAmount = amounts[index]!.trim();
    if (!amountPattern.test(rawAmount)) paymentError("Escribe importes positivos con hasta dos decimales");
    const cents = Math.round(Number(rawAmount.replace(",", ".")) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) paymentError("Cada concepto debe tener un importe mayor que cero");
    lines.push({ conceptCode: concept.code, conceptLabel: concept.label, reportCode: concept.reportCode, amount: (cents / 100).toFixed(2), cents });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.cents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents >= 1_000_000_000_000) paymentError("El total del recibo excede el importe permitido");
  const receiptId = newId();
  const limaParts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const issuedOn = `${limaParts.find((part) => part.type === "year")?.value}-${limaParts.find((part) => part.type === "month")?.value}-${limaParts.find((part) => part.type === "day")?.value}`;
  try {
    const saved = await db.query<{ id: string; receiptNumber: number }>(
      `WITH allocated AS (
         UPDATE "IncomeReceiptCounter" SET "nextNumber" = "nextNumber" + 1
         WHERE "id" = 'main'
         RETURNING "nextNumber" - 1 AS "receiptNumber"
       ), receipt AS (
         INSERT INTO "IncomeReceipt" ("id", "receiptNumber", "issuedOn", "receivedFrom", "documentNumber", "totalAmount", "note", "issuedById")
         SELECT $1, allocated."receiptNumber", $2::date, $3, NULL, $4::numeric, '', $5
         FROM allocated
         RETURNING "id", "receiptNumber"
       ), lines AS (
         INSERT INTO "IncomeReceiptLine" ("id", "receiptId", "conceptCode", "conceptLabel", "reportCode", "amount")
         SELECT line."id", receipt."id", line."conceptCode", line."conceptLabel", line."reportCode", line."amount"::numeric
         FROM receipt
         CROSS JOIN LATERAL jsonb_to_recordset($6::jsonb) AS line(
           "id" text, "conceptCode" text, "conceptLabel" text, "reportCode" text, "amount" text
         )
         RETURNING "id"
       )
       SELECT receipt."id", receipt."receiptNumber" FROM receipt
       WHERE (SELECT COUNT(*) FROM lines) = $7::int`,
      [
        receiptId,
        issuedOn,
        parsed.data.receivedFrom,
        (totalCents / 100).toFixed(2),
        actor.id,
        JSON.stringify(lines.map((line) => ({ ...line, id: newId(), cents: undefined }))),
        lines.length,
      ],
    );
    if (!saved[0]) throw new Error("No se creó el recibo");
  } catch (error) {
    console.error("No se pudo guardar el recibo de ingresos.", error);
    paymentError("No se pudo guardar el recibo. Revisa que la migración de Caja y pagos esté aplicada.");
  }

  revalidatePath("/payments");
  revalidatePath("/payments/history");
  redirect(`/payments/${receiptId}`);
}
