CREATE TABLE IF NOT EXISTS "IncomeReceiptCounter" (
    "id" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "IncomeReceiptCounter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IncomeReceiptCounter_id_check" CHECK ("id" = 'main'),
    CONSTRAINT "IncomeReceiptCounter_nextNumber_check" CHECK ("nextNumber" > 0)
);

INSERT INTO "IncomeReceiptCounter" ("id", "nextNumber") VALUES ('main', 1) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "IncomeReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" INTEGER NOT NULL,
    "issuedOn" DATE NOT NULL,
    "receivedFrom" TEXT NOT NULL,
    "documentNumber" TEXT,
    "totalAmount" NUMERIC(12,2) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "issuedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncomeReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IncomeReceipt_receiptNumber_check" CHECK ("receiptNumber" > 0),
    CONSTRAINT "IncomeReceipt_totalAmount_check" CHECK ("totalAmount" > 0),
    CONSTRAINT "IncomeReceipt_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "IncomeReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "conceptCode" TEXT NOT NULL,
    "conceptLabel" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL DEFAULT '',
    "amount" NUMERIC(12,2) NOT NULL,
    CONSTRAINT "IncomeReceiptLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IncomeReceiptLine_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "IncomeReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "IncomeReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IncomeReceipt_receiptNumber_key" ON "IncomeReceipt"("receiptNumber");
CREATE INDEX IF NOT EXISTS "IncomeReceipt_issuedOn_receiptNumber_idx" ON "IncomeReceipt"("issuedOn", "receiptNumber");
CREATE INDEX IF NOT EXISTS "IncomeReceiptLine_receiptId_idx" ON "IncomeReceiptLine"("receiptId");
