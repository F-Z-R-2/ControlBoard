import assert from "node:assert/strict";
import { test } from "node:test";
import { appointmentTime, canAccessPsychology, canManagePsychologyCase, canManagePsychologyMaterials, canViewPsychologyMaterials, canWritePsychologyNotes, psychologyActionSchema, slotsOverlap } from "../src/lib/psychology";
import { manageableRoles } from "../src/lib/roles";

test("solo el profesional asignado tiene acceso a notas de atención", () => {
  assert.equal(canWritePsychologyNotes({ id: "assigned", role: "PSYCHOLOGIST" }, "assigned"), true);
  assert.equal(canWritePsychologyNotes({ id: "other", role: "PSYCHOLOGIST" }, "assigned"), false);
  for (const role of ["SECRETARY", "ADMIN", "SUPER_ADMIN", "INSTRUCTOR", "STUDENT"]) {
    assert.equal(canWritePsychologyNotes({ id: "assigned", role }, "assigned"), false);
  }
});

test("secretaría coordina fichas; otro psicólogo, docentes y estudiantes no acceden", () => {
  assert.equal(canManagePsychologyCase({ id: "staff", role: "SECRETARY" }, "assigned"), true);
  assert.equal(canManagePsychologyCase({ id: "other", role: "PSYCHOLOGIST" }, "assigned"), false);
  for (const role of ["INSTRUCTOR", "STUDENT", "UNKNOWN"]) {
    assert.equal(canAccessPsychology(role), false);
    assert.equal(canManagePsychologyCase({ id: "x", role }, "assigned"), false);
  }
  assert.equal(manageableRoles("ADMIN").includes("PSYCHOLOGIST"), true);
  assert.equal(manageableRoles("SECRETARY").includes("PSYCHOLOGIST"), false);
});

test("estudiantes solo pueden ver materiales, no gestionar ni consultar fichas clínicas", () => {
  assert.equal(canViewPsychologyMaterials("STUDENT"), true);
  assert.equal(canManagePsychologyMaterials("STUDENT"), false);
  assert.equal(canAccessPsychology("STUDENT"), false);
  assert.equal(canManagePsychologyMaterials("PSYCHOLOGIST"), true);
  assert.equal(canManagePsychologyMaterials("SECRETARY"), true);
});

test("la agenda interpreta la hora de Lima y rechaza fechas inexistentes", () => {
  assert.equal(appointmentTime("2027-03-01T08:30")?.toISOString(), "2027-03-01T13:30:00.000Z");
  for (const invalid of ["2027-02-29T08:00", "2027-03-01T24:00", "2027-03-01T08:60", "invalid"]) assert.equal(appointmentTime(invalid), null);
});

test("las citas contiguas no se superponen, las que se cruzan sí", () => {
  const slot = (start: string, end: string) => ({ startsAt: new Date(start), endsAt: new Date(end) });
  const first = slot("2027-03-01T13:00:00Z", "2027-03-01T14:00:00Z");
  assert.equal(slotsOverlap(first, slot("2027-03-01T14:00:00Z", "2027-03-01T15:00:00Z")), false);
  assert.equal(slotsOverlap(first, slot("2027-03-01T13:30:00Z", "2027-03-01T14:30:00Z")), true);
});

test("las notas requieren contenido y fecha de atención real, no futura", () => {
  const note = { operation: "note", caseId: "case", attendedOn: "2024-02-29", body: "Seguimiento registrado por el profesional." };
  assert.equal(psychologyActionSchema.safeParse(note).success, true);
  for (const patch of [{ attendedOn: "2099-01-01" }, { attendedOn: "2025-02-29" }, { body: " " }, { body: "x".repeat(5001) }]) assert.equal(psychologyActionSchema.safeParse({ ...note, ...patch }).success, false);
});
