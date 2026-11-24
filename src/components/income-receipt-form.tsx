"use client";

import { useState } from "react";
import { createIncomeReceiptAction } from "@/app/actions/payments";
import { ManagementSubmit } from "@/components/management-submit";
import { incomeConcepts, incomeReportCodes } from "@/lib/income";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ReceiptLineDraft = { id: number; concept: string; reportCode: string };

export function IncomeReceiptForm({ today }: { today: string }) {
  const [lines, setLines] = useState<ReceiptLineDraft[]>([{ id: 0, concept: "CERT_ESTUDIOS", reportCode: "CERT" }]);
  function updateLine(id: number, update: Partial<ReceiptLineDraft>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...update } : line));
  }

  return <form action={createIncomeReceiptAction} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">Recibí del Sr. / Sra.<Input name="receivedFrom" required minLength={3} maxLength={120} placeholder="Nombre completo del exalumno o usuario" /></label>
      <label className="text-sm">DNI (opcional)<Input name="documentNumber" maxLength={24} placeholder="Documento de identidad" /></label>
      <label className="text-sm">Fecha<Input name="issuedOn" type="date" required defaultValue={today} /></label>
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Conceptos e importes</h3><button type="button" disabled={lines.length >= 14} onClick={() => setLines((current) => [...current, { id: Math.max(...current.map((line) => line.id)) + 1, concept: "CERT_ESTUDIOS", reportCode: "CERT" }])} className="text-sm font-medium text-blue-700 disabled:text-slate-400">Añadir concepto</button></div>
      {lines.map((line, index) => <div key={line.id} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(100px,.7fr)_110px_auto] sm:items-end">
        <label className="text-xs text-slate-600">Concepto<Select name="conceptCode" value={line.concept} required onChange={(event) => {
          const concept = incomeConcepts.find((item) => item.code === event.target.value);
          updateLine(line.id, { concept: event.target.value, reportCode: concept?.reportCode ?? "" });
        }}>{incomeConcepts.map((concept) => <option key={concept.code} value={concept.code}>{concept.label}</option>)}</Select></label>
        <label className="text-xs text-slate-600">Columna Excel<Select name="reportCode" value={line.reportCode} onChange={(event) => updateLine(line.id, { reportCode: event.target.value })}><option value="">Sin columna</option>{incomeReportCodes.map((code) => <option key={code} value={code}>{code}</option>)}</Select></label>
        <label className="text-xs text-slate-600">Importe (S/)<Input name="amount" inputMode="decimal" required placeholder="0.00" pattern="[0-9]+([.,][0-9]{1,2})?" /></label>
        {lines.length > 1 ? <button type="button" aria-label={`Quitar concepto ${index + 1}`} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="h-10 px-2 text-sm text-red-700">Quitar</button> : <span />}
        <label className="text-xs text-slate-600 sm:col-span-4">Si seleccionaste “Otros”, escribe el detalle<Input name="customLabel" maxLength={100} placeholder="Detalle de otros (opcional)" /></label>
      </div>)}
    </div>
    <label className="block text-sm">Observación (opcional)<Input name="note" maxLength={250} placeholder="Dato adicional para el registro" /></label>
    <p className="text-xs text-slate-500">El sistema suma los conceptos, asigna el siguiente número correlativo y guarda el ingreso para el Excel mensual.</p>
    <ManagementSubmit>Guardar y generar recibo</ManagementSubmit>
  </form>;
}
