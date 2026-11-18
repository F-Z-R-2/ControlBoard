"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre completo"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["STUDENT"]).default("STUDENT"),
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
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    fail("/register", "Ese correo ya está registrado");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
    },
  });

  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
