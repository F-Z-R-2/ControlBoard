import { Client, neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

type GlobalWithSql = typeof globalThis & {
  neonSql?: NeonQueryFunction<false, false>;
};

const globalForSql = globalThis as GlobalWithSql;

export const sql: NeonQueryFunction<false, false> =
  globalForSql.neonSql ?? neon(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForSql.neonSql = sql;
}

export type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<T[]>;
  sql<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
};

function makeQueryable(
  run: <T>(text: string, params?: readonly unknown[]) => Promise<T[]>,
): Queryable {
  const queryable: Queryable = {
    query: run,
    sql<T>(strings: TemplateStringsArray, ...values: unknown[]) {
      const text = strings.reduce(
        (acc, part, index) =>
          acc + part + (index < values.length ? `$${index + 1}` : ""),
        "",
      );
      return run<T>(text, values);
    },
  };
  return queryable;
}

export async function query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
  return (await sql.query(text, params as unknown[])) as T[];
}

export async function queryOne<T>(text: string, params: readonly unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export const db: Queryable = makeQueryable(query);

type IsolationLevel = "read committed" | "repeatable read" | "serializable";

const isolationLevels: IsolationLevel[] = ["read committed", "repeatable read", "serializable"];

export async function withTransaction<T>(
  fn: (tx: Queryable) => Promise<T>,
  options?: { isolationLevel?: IsolationLevel },
): Promise<T> {
  const client = new Client({ connectionString });
  await client.connect();

  const tx = makeQueryable(<TRow>(text: string, params: readonly unknown[] = []) => {
    return client
      .query(text, params as unknown[])
      .then((result) => result.rows as TRow[]);
  });

  try {
    const isolation = options?.isolationLevel;
    if (isolation && !isolationLevels.includes(isolation)) {
      throw new Error(`Nivel de aislamiento inválido: ${isolation}`);
    }
    await client.query(
      isolation ? `BEGIN ISOLATION LEVEL ${isolation.toUpperCase()}` : "BEGIN",
    );
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

export function newId(): string {
  return `c${randomUUID().replace(/-/g, "")}`;
}

export function jsonb<T>(value: T): string {
  return JSON.stringify(value);
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "40001"
  );
}
