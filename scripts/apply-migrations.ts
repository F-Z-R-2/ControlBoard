import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { withTransaction } from "../src/lib/db";

async function main() {
  const migrationsDirectory = path.join(process.cwd(), "db", "migrations");
  const migrations = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  await withTransaction(async (tx) => {
    await tx.query(`
      CREATE TABLE IF NOT EXISTS "SchemaMigration" (
        "name" TEXT NOT NULL PRIMARY KEY,
        "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  for (const name of migrations) {
    const applied = await withTransaction(async (tx) => {
      const existing = await tx.query<{ name: string }>(
        `SELECT "name" FROM "SchemaMigration" WHERE "name" = $1 LIMIT 1`,
        [name],
      );
      if (existing.length) return false;

      const migration = await readFile(path.join(migrationsDirectory, name), "utf8");
      await tx.query(migration);
      await tx.query(`INSERT INTO "SchemaMigration" ("name") VALUES ($1)`, [name]);
      return true;
    });

    console.log(`${applied ? "Aplicada" : "Ya aplicada"}: ${name}`);
  }
}

main().catch((error: unknown) => {
  console.error("No se pudieron aplicar las migraciones.", error);
  process.exitCode = 1;
});
