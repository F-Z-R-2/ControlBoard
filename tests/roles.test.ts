import assert from "node:assert/strict";
import { test } from "node:test";
import { canManageUser, isAdmin, isStaff, manageableRoles } from "../src/lib/roles";

test("secretaría administra estudiantes sin privilegios académicos ni acceso a personal", () => {
  assert.equal(isStaff("SECRETARY"), true);
  assert.equal(isAdmin("SECRETARY"), false);
  const actor = { id: "secretary", role: "SECRETARY" };
  assert.equal(canManageUser(actor, { id: "student", role: "STUDENT" }), true);
  for (const role of ["INSTRUCTOR", "SECRETARY", "ADMIN", "SUPER_ADMIN"] as const) {
    assert.equal(canManageUser(actor, { id: "other", role }), false);
    assert.equal(manageableRoles(actor.role).includes(role), false);
  }
});

test("administración no puede crear ni modificar administradores o superadministradores", () => {
  const actor = { id: "admin", role: "ADMIN" };
  for (const role of ["ADMIN", "SUPER_ADMIN"] as const) {
    assert.equal(canManageUser(actor, { id: "other", role }), false);
    assert.equal(manageableRoles(actor.role).includes(role), false);
  }
  for (const role of ["STUDENT", "INSTRUCTOR", "SECRETARY"] as const) {
    assert.equal(canManageUser(actor, { id: "other", role }), true);
  }
});

test("superadministración conserva acceso académico y nunca puede modificar su propia cuenta", () => {
  assert.equal(isAdmin("SUPER_ADMIN"), true);
  const actor = { id: "super", role: "SUPER_ADMIN" };
  assert.equal(canManageUser(actor, { id: "super", role: "SUPER_ADMIN" }), false);
  assert.equal(canManageUser(actor, { id: "other", role: "ADMIN" }), true);
});

test("docentes, estudiantes y roles desconocidos no administran cuentas", () => {
  for (const role of ["INSTRUCTOR", "STUDENT", "UNKNOWN"]) {
    assert.equal(isStaff(role), false);
    assert.deepEqual(manageableRoles(role), []);
    assert.equal(canManageUser({ id: "actor", role }, { id: "student", role: "STUDENT" }), false);
  }
});
