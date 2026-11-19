import { readFile } from "node:fs/promises";
import path from "node:path";
import { withTransaction } from "../src/lib/db";

const schemaPath = path.join(process.cwd(), "db", "schema.sql");
const schema = await readFile(schemaPath, "utf8");

await withTransaction(async (tx) => {
  await tx.query(schema);
});

console.log("Esquema aplicado correctamente.");
