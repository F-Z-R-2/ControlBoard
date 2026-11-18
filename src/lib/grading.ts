import { z } from "zod";

export const scaleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("NUMERIC"),
    min: z.number().finite().min(-1000).max(1000),
    max: z.number().finite().min(-1000).max(1000),
    decimals: z.number().int().min(0).max(2),
  }).refine(value => value.min < value.max, "El mínimo debe ser menor que el máximo")
    .refine(value => [value.min, value.max].every(number => Math.abs(number * 10 ** value.decimals - Math.round(number * 10 ** value.decimals)) < 1e-8), "Los límites deben respetar la cantidad de decimales"),
  z.object({
    kind: z.literal("LETTERS"),
    options: z.array(z.object({
      code: z.string().trim().min(1).max(8).regex(/^[A-Z0-9+.-]+$/, "Usa códigos como AD, A, B o C"),
      label: z.string().trim().min(1).max(80),
    })).min(2, "Agrega al menos dos categorías").max(12),
  }).refine(value => new Set(value.options.map(option => option.code)).size === value.options.length, "Los códigos no se pueden repetir"),
]);
export type GradeScale = z.infer<typeof scaleSchema>;

export function readScaleForm(values: Record<string, unknown>) {
  if (values.kind === "LETTERS") {
    const lines = typeof values.options === "string" ? values.options.split(/\r?\n/).filter(line => line.trim()) : [];
    return scaleSchema.safeParse({ kind: "LETTERS", options: lines.map(line => {
      const split = line.indexOf("|");
      return { code: split < 0 ? "" : line.slice(0, split).trim().toUpperCase(), label: split < 0 ? "" : line.slice(split + 1).trim() };
    }) });
  }
  const number = (value: unknown) => typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return scaleSchema.safeParse({ kind: values.kind, min: number(values.min), max: number(values.max), decimals: number(values.decimals) });
}

export function validGrade(value: string, scale: GradeScale) {
  if (scale.kind === "LETTERS") return scale.options.some(option => option.code === value);
  if (!/^-?\d+(\.\d+)?$/.test(value)) return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= scale.min && numeric <= scale.max
    && (value.split(".")[1]?.length ?? 0) <= scale.decimals;
}

export function scaleLabel(scale: GradeScale) {
  return scale.kind === "NUMERIC" ? `${scale.min} a ${scale.max} · ${scale.decimals} decimales` : scale.options.map(option => option.code).join(" / ");
}

export function gradeLabel(value: string, scale: GradeScale) {
  return scale.kind === "NUMERIC" ? value : `${value} · ${scale.options.find(option => option.code === value)?.label ?? ""}`;
}
