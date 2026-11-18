import assert from "node:assert/strict";
import { test } from "node:test";
import { gradeLabel, readScaleForm, scaleSchema, validGrade } from "../src/lib/grading";

test("la escala numérica respeta límites y decimales sin convertir vacíos en cero", () => {
  const scale = scaleSchema.parse({ kind: "NUMERIC", min: 0, max: 20, decimals: 1 });
  for (const value of ["0", "20", "15.5"]) assert.equal(validGrade(value, scale), true);
  for (const value of ["", " ", "21", "-1", "15.55", "NaN", "1e1", "AD"]) assert.equal(validGrade(value, scale), false);
});

test("permite rangos alternativos y rechaza límites incompatibles", () => {
  const scale = scaleSchema.parse({ kind: "NUMERIC", min: 1, max: 7, decimals: 0 });
  assert.equal(validGrade("7", scale), true);
  assert.equal(validGrade("0", scale), false);
  assert.equal(validGrade("5.5", scale), false);
  for (const patch of [{ min: 20, max: 0 }, { min: 0, max: 0 }, { min: 0.5, max: 20 }, { min: 0, max: Infinity }]) {
    assert.equal(scaleSchema.safeParse({ kind: "NUMERIC", decimals: 0, ...patch }).success, false);
  }
  assert.equal(readScaleForm({ kind: "NUMERIC", min: "", max: "20", decimals: "0" }).success, false);
});

test("las letras solo aceptan categorías configuradas y conservan descripciones", () => {
  const parsed = readScaleForm({ kind: "LETTERS", options: "AD|Destacado\nA|Esperado\nB|En proceso\nC|En inicio" });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(validGrade("AD", parsed.data), true);
  assert.equal(validGrade("20", parsed.data), false);
  assert.equal(gradeLabel("B", parsed.data), "B · En proceso");
});

test("rechaza categorías duplicadas, mal formadas o sin descripción", () => {
  for (const options of ["A|Uno\na|Dos", "A|", "AD destacado\nA esperado", "A|Única"]) {
    assert.equal(readScaleForm({ kind: "LETTERS", options }).success, false);
  }
});

test("una nota anterior se interpreta con su escala guardada", () => {
  const original = scaleSchema.parse({ kind: "LETTERS", options: [{ code: "A", label: "Logro esperado" }, { code: "B", label: "En proceso" }] });
  const snapshot = JSON.parse(JSON.stringify(original));
  const replacement = scaleSchema.parse({ kind: "NUMERIC", min: 0, max: 20, decimals: 0 });
  assert.equal(validGrade("A", replacement), false);
  assert.equal(gradeLabel("A", scaleSchema.parse(snapshot)), "A · Logro esperado");
});
