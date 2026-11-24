"use client";

import { Printer } from "lucide-react";

export function PrintReceiptButton() {
  return <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 bg-[#0b3ddb] px-4 text-sm font-medium text-white hover:bg-[#0932b5] print:hidden"><Printer className="h-4 w-4" />Imprimir recibo</button>;
}
