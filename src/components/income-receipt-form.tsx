"use client";

import { useState } from "react";
import { createIncomeReceiptAction } from "@/app/actions/payments";
import { ManagementSubmit } from "@/components/management-submit";
import { incomeConcepts } from "@/lib/income";
import { Input } from "@/components/ui/input";

export function IncomeReceiptForm() {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const selectedConcepts = incomeConcepts.filter(({ code }) => Object.hasOwn(selected, code));
  const total = selectedConcepts.reduce((sum, concept) => {
    const amount = Number((selected[concept.code] ?? "").replace(",", "."));
    return sum + (Number.isFinite(amount) ? Math.round(amount * 100) : 0);
  }, 0) / 100;

  return <form action={createIncomeReceiptAction} className="space-y-6">
    <label className="block text-sm font-medium text-slate-700">Recibí del Sr. / Sra.
      <Input name="receivedFrom" required minLength={3} maxLength={120} placeholder="Escribe el nombre completo" autoComplete="name" className="mt-2 h-12 text-base" />
    </label>

    <fieldset className="space-y-2">
      <legend className="mb-3 text-sm font-semibold text-slate-800">Marca los conceptos cobrados e ingresa su importe</legend>
      {incomeConcepts.map((concept) => {
        const checked = Object.hasOwn(selected, concept.code);
        const inputId = `concept-${concept.code}`;
        return <div key={concept.code} className={`rounded-lg border p-3 transition-colors ${checked ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center gap-3">
            <input id={inputId} type="checkbox" checked={checked} onChange={(event) => {
              setSelected((current) => {
                const next = { ...current };
                if (event.target.checked) next[concept.code] = "";
                else delete next[concept.code];
                return next;
              });
            }} className="h-5 w-5 accent-blue-700" />
            <label htmlFor={inputId} className="flex-1 cursor-pointer text-sm font-medium text-slate-800">{concept.label}</label>
            {checked ? <span className="text-xs font-medium text-blue-700">Importe (S/)</span> : null}
          </div>
          {checked ? <div className="mt-3 pl-8">
            <input type="hidden" name="conceptCode" value={concept.code} />
            <Input name="amount" type="number" inputMode="decimal" min="0.01" max="9999999.99" step="0.01" required value={selected[concept.code]} onChange={(event) => setSelected((current) => ({ ...current, [concept.code]: event.target.value }))} placeholder="0.00" aria-label={`Importe para ${concept.label}`} className="h-11 max-w-56 bg-white text-right text-base tabular-nums" />
          </div> : null}
        </div>;
      })}
    </fieldset>

    <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-slate-200 bg-white py-4">
      <div aria-live="polite"><p className="text-xs uppercase tracking-wide text-slate-500">Total del recibo</p><p className="text-2xl font-bold tabular-nums text-slate-900">S/ {total.toFixed(2)}</p></div>
      <ManagementSubmit>Guardar y emitir</ManagementSubmit>
    </div>
    <p className="text-xs leading-5 text-slate-500">La fecha se registra automáticamente. Al guardar, se asigna el siguiente número de recibo y los conceptos se clasifican solos en el libro Excel mensual.</p>
  </form>;
}
