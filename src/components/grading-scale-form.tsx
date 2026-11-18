"use client";

import { useState } from "react";
import { saveGradingScaleAction } from "@/app/actions/grading";
import { ManagementSubmit } from "@/components/management-submit";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GradeScale } from "@/lib/grading";

export function GradingScaleForm({ yearId, level, version, config }: {
  yearId: string; level: string; version: number; config?: GradeScale;
}) {
  const [kind, setKind] = useState(config?.kind ?? "NUMERIC");
  const letters = config?.kind === "LETTERS" ? config.options.map(option => `${option.code}|${option.label}`).join("\n") : "AD|Logro destacado\nA|Logro esperado\nB|En proceso\nC|En inicio";
  return <form action={saveGradingScaleAction} className="space-y-4">
    <input type="hidden" name="yearId" value={yearId} />
    <input type="hidden" name="level" value={level} />
    <input type="hidden" name="version" value={version} />
    <label className="block text-sm">Tipo de escala
      <Select name="kind" value={kind} onChange={event => setKind(event.target.value as "NUMERIC" | "LETTERS")}>
        <option value="NUMERIC">Numérica</option><option value="LETTERS">Letras o categorías</option>
      </Select>
    </label>
    {kind === "NUMERIC" ? <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Nota mínima<Input name="min" type="number" step="0.01" min={-1000} max={1000} defaultValue={config?.kind === "NUMERIC" ? config.min : 0} required /></label>
      <label className="text-sm">Nota máxima<Input name="max" type="number" step="0.01" min={-1000} max={1000} defaultValue={config?.kind === "NUMERIC" ? config.max : 20} required /></label>
      <label className="text-sm">Decimales<Select name="decimals" defaultValue={config?.kind === "NUMERIC" ? config.decimals : 0}><option value="0">Sin decimales</option><option value="1">1 decimal</option><option value="2">2 decimales</option></Select></label>
    </div> : <label className="block text-sm">Categorías y descripciones
      <Textarea name="options" rows={6} defaultValue={letters} required maxLength={1200} />
      <span className="mt-1 block text-xs text-slate-500">Una por línea: código|descripción. De 2 a 12 categorías; cada código debe ser único. El orden es el de presentación, sin equivalencias numéricas automáticas.</span>
    </label>}
    <ManagementSubmit>Guardar escala</ManagementSubmit>
  </form>;
}
