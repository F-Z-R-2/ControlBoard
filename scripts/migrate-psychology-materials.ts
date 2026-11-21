import { readFile } from "node:fs/promises";
import path from "node:path";
import { withTransaction } from "../src/lib/db";

async function main() {
  const migrationPath = path.join(
    process.cwd(),
    "db",
    "migrations",
    "psychology-materials.sql",
  );
  const migration = await readFile(migrationPath, "utf8");

  await withTransaction(async (tx) => {
    await tx.query(migration);
  });

  console.log("Migración de materiales de Psicología aplicada correctamente.");
}

main().catch((error: unknown) => {
  console.error("No se pudo aplicar la migración de materiales de Psicología:", error);
  process.exitCode = 1;
});
