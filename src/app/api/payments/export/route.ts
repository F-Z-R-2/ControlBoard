import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { incomeReportCodes } from "@/lib/income";

export const runtime = "nodejs";

type ExportRow = {
  id: string;
  receiptNumber: number;
  issuedOn: string;
  totalAmount: string;
  lines: { reportCode: string }[] | string;
};

function isValidMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export async function GET(request: Request) {
  const actor = await requireUser();
  if (!["SECRETARY", "ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
    return new Response("No autorizado", { status: 403 });
  }
  const month = new URL(request.url).searchParams.get("month");
  if (!isValidMonth(month)) return new Response("Selecciona un mes válido", { status: 400 });

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const nextMonth = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  const receipts = await db.query<ExportRow>(
    `SELECT r."id", r."receiptNumber", r."issuedOn"::text AS "issuedOn", r."totalAmount"::text AS "totalAmount",
       COALESCE(json_agg(json_build_object('reportCode', l."reportCode")) FILTER (WHERE l."id" IS NOT NULL), '[]'::json) AS "lines"
     FROM "IncomeReceipt" r
     LEFT JOIN "IncomeReceiptLine" l ON l."receiptId" = r."id"
     WHERE r."issuedOn" >= $1::date AND r."issuedOn" < $2::date
     GROUP BY r."id"
     ORDER BY r."issuedOn" ASC, r."receiptNumber" ASC`,
    [`${month}-01`, nextMonth],
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "I. E. Manuel Scorza";
  workbook.subject = "Captación de ingresos institucionales";
  workbook.title = `Captación de ingresos ${month}`;
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet("Caja", {
    views: [{ state: "frozen", ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const reportColumns = [...incomeReportCodes];
  const headers = ["FECHA", "RN N°", "CANTIDAD", ...reportColumns, "TOTAL"];
  sheet.columns = [
    { width: 14 }, { width: 12 }, { width: 16 },
    ...reportColumns.map(() => ({ width: 9 })), { width: 12 },
  ];
  sheet.mergeCells(2, 1, 2, headers.length);
  const monthLabel = new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`)).toLocaleUpperCase("es-PE");
  const title = sheet.getCell(2, 1);
  title.value = `MES DE ${monthLabel} ${year}`;
  title.font = { name: "Arial", size: 18, bold: true, color: { argb: "FFB6424D" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 32;

  const headerRow = sheet.getRow(3);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF263648" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  for (let column = 1; column <= headers.length; column++) {
    headerRow.getCell(column).border = {
      top: { style: "thin", color: { argb: "FF777777" } },
      bottom: { style: "thin", color: { argb: "FF777777" } },
      left: { style: "thin", color: { argb: "FF777777" } },
      right: { style: "thin", color: { argb: "FF777777" } },
    };
  }

  const categoryCounts = new Map<string, number>(reportColumns.map((code) => [code, 0]));
  let totalAmountCents = 0;
  let totalConceptCount = 0;
  for (const [index, receipt] of receipts.entries()) {
    const parsedLines = typeof receipt.lines === "string" ? JSON.parse(receipt.lines) as { reportCode: string }[] : receipt.lines;
    const countsForReceipt = new Map<string, number>();
    for (const line of parsedLines) {
      if (reportColumns.includes(line.reportCode as (typeof reportColumns)[number])) {
        countsForReceipt.set(line.reportCode, (countsForReceipt.get(line.reportCode) ?? 0) + 1);
        categoryCounts.set(line.reportCode, (categoryCounts.get(line.reportCode) ?? 0) + 1);
      }
    }
    const amountCents = Math.round(Number(receipt.totalAmount) * 100);
    const amount = amountCents / 100;
    totalAmountCents += amountCents;
    totalConceptCount += parsedLines.length;
    const rowNumber = index + 4;
    const row = sheet.getRow(rowNumber);
    row.values = [new Date(`${receipt.issuedOn}T12:00:00Z`), String(receipt.receiptNumber).padStart(6, "0"), amount,
      ...reportColumns.map((code) => "X".repeat(countsForReceipt.get(code) ?? 0)), parsedLines.length];
    row.height = 22;
    row.font = { name: "Arial", size: 10, color: { argb: "FF202020" } };
    row.alignment = { vertical: "middle", horizontal: "center" };
    row.getCell(1).numFmt = "dd/mm/yyyy";
    row.getCell(3).numFmt = '"S/ "#,##0.00';
    for (let column = 1; column <= headers.length; column++) {
      row.getCell(column).border = {
        top: { style: "thin", color: { argb: "FF888888" } },
        bottom: { style: "thin", color: { argb: "FF888888" } },
        left: { style: "thin", color: { argb: "FF888888" } },
        right: { style: "thin", color: { argb: "FF888888" } },
      };
    }
  }

  const totalRowNumber = Math.max(4, receipts.length + 4);
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.values = ["TOTAL", "", totalAmountCents / 100, ...reportColumns.map((code) => categoryCounts.get(code) ?? 0), totalConceptCount];
  totalRow.height = 24;
  totalRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF263648" } };
  totalRow.alignment = { horizontal: "center", vertical: "middle" };
  totalRow.getCell(3).numFmt = '"S/ "#,##0.00';
  for (let column = 1; column <= headers.length; column++) {
    totalRow.getCell(column).border = {
      top: { style: "medium", color: { argb: "FF4B5563" } },
      bottom: { style: "thin", color: { argb: "FF888888" } },
      left: { style: "thin", color: { argb: "FF888888" } },
      right: { style: "thin", color: { argb: "FF888888" } },
    };
  }
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };
  sheet.pageSetup.printArea = `A2:N${totalRowNumber}`;
  sheet.pageSetup.printTitlesRow = "2:3";

  const file = await workbook.xlsx.writeBuffer();
  const monthSlug = month.replace("-", "-");
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="captacion-ingresos-${monthSlug}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
