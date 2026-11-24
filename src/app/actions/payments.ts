"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { newId, withTransaction } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { incomeConcepts, isIncomeReportCode } from "@/lib/income";

function paymentError(message: string): never {
  redirect(`/payments?error=${encodeURIComponent(message)}`);
}

function canManageIncome(role: string) {
  return role === "SECRETARY" || role === "ADMIN" || role === "SUPER_ADMIN";
}

const incomeSchema = z.object({
  receivedFrom: z.string().trim().min(3, "Escribe el nombre de quien paga").max(120),
  documentNumber: z.string().trim().max(24).optional(),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida").refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Selecciona una fecha válida"),
  note: z.string().trim().max(250).optional(),
});

const amountPattern = /^(?:0|[1-9]\d{0,8})(?:[.,]\d{1,2})?$/;

export async function createIncomeReceiptAction(formData: FormData) {
  const actor = await requireUser();
  if (!canManageIncome(actor.role)) paymentError("No tienes acceso al registro de ingresos");

  const parsed = incomeSchema.safeParse({
    receivedFrom: formData.get("receivedFrom"),
    documentNumber: formData.get("documentNumber") ?? "",
    issuedOn: formData.get("issuedOn"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) paymentError(parsed.error.issues[0]?.message ?? "Revisa los datos del recibo");

  const conceptCodes = formData.getAll("conceptCode").map(String);
  const reportCodes = formData.getAll("reportCode").map(String);
  const amounts = formData.getAll("amount").map(String);
  const customLabels = formData.getAll("customLabel").map(String);
  if (!conceptCodes.length || conceptCodes.length > 14 || [reportCodes, amounts, customLabels].some((values) => values.length !== conceptCodes.length)) {
    paymentError("Agrega entre 1 y 14 conceptos al recibo");
  }

  const lines = [] as { conceptCode: string; conceptLabel: string; reportCode: string; amount: string; cents: number }[];
  for (let index = 0; index < conceptCodes.length; index++) {
    const concept = incomeConcepts.find((item) => item.code === conceptCodes[index]);
    if (!concept) paymentError("Selecciona conceptos válidos");
    if (reportCodes[index] && !isIncomeReportCode(reportCodes[index]!)) paymentError("Selecciona una columna válida para el Excel");
    const rawAmount = amounts[index]!.trim();
    if (!amountPattern.test(rawAmount)) paymentError("Escribe importes positivos con hasta dos decimales");
    const cents = Math.round(Number(rawAmount.replace(",", ".")) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) paymentError("Cada concepto debe tener un importe mayor que cero");
    const conceptLabel = concept.code === "OTROS" ? customLabels[index]!.trim().slice(0, 100) : concept.label;
    if (!conceptLabel) paymentError("Escribe el nombre del concepto indicado en Otros");
    lines.push({ conceptCode: concept.code, conceptLabel, reportCode: reportCodes[index]!, amount: (cents / 100).toFixed(2), cents });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.cents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents >= 1_000_000_000_000) paymentError("El total del recibo excede el importe permitido");
  const receiptId = newId();
  try {
    await withTransaction(async (tx) => {
      const allocated = await tx.query<{ receiptNumber: number }>(
        `UPDATE "IncomeReceiptCounter" SET "nextNumber" = "nextNumber" + 1
         WHERE "id" = 'main' RETURNING "nextNumber" - 1 AS "receiptNumber"`,
      );
      if (!allocated[0]) throw new Error("Falta configurar la secuencia de recibos");
      const receiptNumber = allocated[0].receiptNumber;
      await tx.query(
        `INSERT INTO "IncomeReceipt" ("id", "receiptNumber", "issuedOn", "receivedFrom", "documentNumber", "totalAmount", "note", "issuedById")
         VALUES ($1, $2, $3::date, $4, $5, $6::numeric, $7, $8)`,
        [receiptId, receiptNumber, parsed.data.issuedOn, parsed.data.receivedFrom, parsed.data.documentNumber || null, (totalCents / 100).toFixed(2), parsed.data.note ?? "", actor.id],
      );
      for (const line of lines) {
        await tx.query(
          `INSERT INTO "IncomeReceiptLine" ("id", "receiptId", "conceptCode", "conceptLabel", "reportCode", "amount")
           VALUES ($1, $2, $3, $4, $5, $6::numeric)`,
          [newId(), receiptId, line.conceptCode, line.conceptLabel, line.reportCode, line.amount],
        );
      }
    });
  } catch (error) {
    console.error("No se pudo guardar el recibo de ingresos.", error);
    paymentError("No se pudo guardar el recibo. Revisa que la migración de Caja y pagos esté aplicada.");
  }

  revalidatePath("/payments");
  redirect(`/payments/${receiptId}`);
}

export async function setFirstReceiptNumberAction(formData: FormData) {
  const actor = await requireUser();
  if (!canManageIncome(actor.role)) paymentError("No tienes acceso para configurar recibos");
  const parsedNumber = z.coerce.number().int().min(1).max(9999999).safeParse(formData.get("nextNumber"));
  if (!parsedNumber.success) paymentError("Escribe un número de recibo válido");

  try {
    await withTransaction(async (tx) => {
      await tx.query(`SELECT "id" FROM "IncomeReceiptCounter" WHERE "id" = 'main' FOR UPDATE`);
      const receipts = await tx.query<{ id: string }>(`SELECT "id" FROM "IncomeReceipt" LIMIT 1`);
      if (receipts.length) throw new Error("La numeración solo puede configurarse antes del primer recibo");
      await tx.query(`UPDATE "IncomeReceiptCounter" SET "nextNumber" = $1 WHERE "id" = 'main'`, [parsedNumber.data]);
    });
  } catch {
    paymentError("La numeración solo puede configurarse antes del primer recibo");
  }
  revalidatePath("/payments");
  redirect("/payments?success=Numeración%20configurada");
}
