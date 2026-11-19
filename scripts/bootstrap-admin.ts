import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  isSerializationFailure,
  isUniqueViolation,
  newId,
  withTransaction,
} from "../src/lib/db";

async function main() {
  const data = z.object({
    email: z.string().trim().email().toLowerCase(),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(8).refine(value => Buffer.byteLength(value, "utf8") <= 72),
  }).safeParse({ email: process.env.BOOTSTRAP_EMAIL, name: process.env.BOOTSTRAP_NAME, password: process.env.BOOTSTRAP_PASSWORD });
  if (!data.success) throw new Error("Configura BOOTSTRAP_EMAIL, BOOTSTRAP_NAME y BOOTSTRAP_PASSWORD (8 caracteres como mínimo, 72 bytes como máximo).");
  const { password, ...profile } = data.data;
  const passwordHash = await bcrypt.hash(password, 10);
  await withTransaction(async tx => {
    const [superAdmins] = await tx.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM "User" WHERE "role" = $1 AND "isActive" = TRUE`,
      ["SUPER_ADMIN"],
    );
    if (superAdmins.count > 0) throw new Error("Ya existe un superadministrador activo. Usa el panel de administración.");
    const existing = await tx.sql<{ id: string }>`
      SELECT "id" FROM "User" WHERE "email" = ${profile.email} LIMIT 1
    `;
    if (existing.length) throw new Error("El correo ya está registrado. No se modificó la cuenta existente.");
    await tx.sql`
      INSERT INTO "User" ("id", "name", "email", "isActive", "passwordHash", "role", "createdAt", "updatedAt")
      VALUES (${newId()}, ${profile.name}, ${profile.email}, TRUE, ${passwordHash}, 'SUPER_ADMIN', NOW(), NOW())
    `;
  }, { isolationLevel: "serializable" });
  console.log("Superadministrador creado.");
}
main().catch(error => {
  console.error(isUniqueViolation(error) || isSerializationFailure(error) ? "No se pudo crear la cuenta. Verifica el esquema y vuelve a intentarlo." : error.message);
  process.exitCode = 1;
});
