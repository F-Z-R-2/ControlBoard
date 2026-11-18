import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceSchema, canRecordAttendance, schoolDate, validAttendanceDate } from "../src/lib/attendance";

test("la fecha escolar usa Lima incluso después de la medianoche UTC", () => {
  assert.equal(schoolDate(new Date("2026-11-18T02:00:00Z")), "2026-11-17");
  assert.equal(schoolDate(new Date("2026-11-18T05:00:00Z")), "2026-11-18");
});

test("rechaza fechas inexistentes sin normalizarlas al mes siguiente", () => {
  assert.equal(validAttendanceDate("2024-02-29"), true);
  for (const date of ["2026-02-29", "2026-04-31", "2026-00-10", "2026-13-01", "2026-1-01", "invalid"]) {
    assert.equal(validAttendanceDate(date), false);
  }
});

test("solo personal autorizado y el docente asignado pueden registrar", () => {
  for (const role of ["SECRETARY", "ADMIN", "SUPER_ADMIN"]) {
    assert.equal(canRecordAttendance({ id: "staff", role }, "teacher"), true);
  }
  assert.equal(canRecordAttendance({ id: "teacher", role: "INSTRUCTOR" }, "teacher"), true);
  assert.equal(canRecordAttendance({ id: "other", role: "INSTRUCTOR" }, "teacher"), false);
  assert.equal(canRecordAttendance({ id: "teacher", role: "STUDENT" }, "teacher"), false);
});

test("no permite fechas futuras, estados desconocidos o versiones inválidas", () => {
  const valid = { courseId: "course", studentId: "student", date: "2024-02-29", status: "PRESENT", note: "", version: "0" };
  assert.equal(attendanceSchema.safeParse(valid).success, true);
  for (const patch of [{ date: "2099-01-01" }, { status: "" }, { status: "UNKNOWN" }, { version: "-1" }, { version: "1.5" }, { note: "a".repeat(501) }]) {
    assert.equal(attendanceSchema.safeParse({ ...valid, ...patch }).success, false);
  }
});
