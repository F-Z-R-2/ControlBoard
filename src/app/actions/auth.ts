"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db, isUniqueViolation, newId } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre completo"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["STUDENT", "INSTRUCTOR", "SECRETARY", "PSYCHOLOGIST"]).default("STUDENT"),
});

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    fail("/login", "Escribe un correo y una contraseña válidos");
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        fail("/login", "Correo o contraseña incorrectos");
      }
      fail("/login", "No se pudo iniciar sesión");
    }
    throw error;
  }
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "STUDENT",
  });

  if (!parsed.success) {
    fail("/register", parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.sql<{ id: string }>`
    SELECT "id" FROM "User" WHERE "email" = ${email} LIMIT 1
  `;
  if (existing.length) {
    fail("/register", "Ese correo ya está registrado");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    await db.sql`
      INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "updatedAt")
      VALUES (${newId()}, ${parsed.data.name}, ${email}, ${passwordHash}, ${parsed.data.role}, NOW())
    `;
  } catch (error) {
    if (isUniqueViolation(error)) fail("/register", "Ese correo ya está registrado");
    throw error;
  }

  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
