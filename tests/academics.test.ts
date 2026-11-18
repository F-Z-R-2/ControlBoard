import assert from "node:assert/strict";
import { test } from "node:test";
import { academicSchema, periodFitsYear, periodsOverlap } from "../src/lib/academics";

const range = (start: string, end: string) => ({ startsOn: new Date(start), endsOn: new Date(end) });

test("un periodo debe estar completamente dentro del año lectivo", () => {
  const year = range("2027-03-01", "2027-12-20");
  assert.equal(periodFitsYear(range("2027-03-01", "2027-05-01"), year), true);
  assert.equal(periodFitsYear(range("2027-02-28", "2027-05-01"), year), false);
  assert.equal(periodFitsYear(range("2027-11-01", "2027-12-21"), year), false);
});

test("las fechas de cierre e inicio cuentan como días ocupados", () => {
  const period = range("2027-03-01", "2027-04-30");
  assert.equal(periodsOverlap(period, range("2027-04-30", "2027-05-31")), true);
  assert.equal(periodsOverlap(period, range("2027-05-01", "2027-06-30")), false);
  assert.equal(periodsOverlap(period, range("2027-03-02", "2027-03-03")), true);
});

test("rechaza fechas imposibles y rangos invertidos", () => {
  const base = { kind: "year", name: "2027", startsOn: "2027-03-01", endsOn: "2027-12-20", isClosed: "false" };
  assert.equal(academicSchema.safeParse(base).success, true);
  assert.equal(academicSchema.safeParse({ ...base, startsOn: "2027-02-29" }).success, false);
  assert.equal(academicSchema.safeParse({ ...base, endsOn: "2027-01-01" }).success, false);
});

test("la vinculación exige curso, sección y periodo; los niveles son cerrados", () => {
  assert.equal(academicSchema.safeParse({ kind: "assignment", courseId: "course", sectionId: "section", academicPeriodId: "period" }).success, true);
  assert.equal(academicSchema.safeParse({ kind: "assignment", courseId: "course", sectionId: "section" }).success, false);
  assert.equal(academicSchema.safeParse({ kind: "grade", level: "UNKNOWN", name: "1", position: 1 }).success, false);
  assert.equal(academicSchema.safeParse({ kind: "grade", level: "PRIMARY", name: " ", position: 1 }).success, false);
});
