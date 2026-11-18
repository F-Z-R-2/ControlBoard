import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();
async function main() {
  const data = z.object({
    email: z.string().trim().email().toLowerCase(),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(8).refine(value => Buffer.byteLength(value, "utf8") <= 72),
  }).safeParse({ email: process.env.BOOTSTRAP_EMAIL, name: process.env.BOOTSTRAP_NAME, password: process.env.BOOTSTRAP_PASSWORD });
  if (!data.success) throw new Error("Configura BOOTSTRAP_EMAIL, BOOTSTRAP_NAME y BOOTSTRAP_PASSWORD (8 caracteres como mínimo, 72 bytes como máximo).");
  const { password, ...profile } = data.data;
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async tx => {
    if (await tx.user.count({ where: { role: "SUPER_ADMIN", isActive: true } })) throw new Error("Ya existe un superadministrador activo. Usa el panel de administración.");
    if (await tx.user.findUnique({ where: { email: profile.email } })) throw new Error("El correo ya está registrado. No se modificó la cuenta existente.");
    await tx.user.create({ data: { ...profile, passwordHash, role: "SUPER_ADMIN" } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  console.log("Superadministrador creado.");
}
main().catch(error => {
  console.error(error instanceof Prisma.PrismaClientKnownRequestError ? "No se pudo crear la cuenta. Verifica el esquema y vuelve a intentarlo." : error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
