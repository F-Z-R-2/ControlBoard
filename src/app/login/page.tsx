import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const demoAccounts = [
  {
    label: "Profesor",
    email: "instructor@controlboard.dev",
    password: "Profe123!",
  },
  {
    label: "Estudiante",
    email: "estudiante@controlboard.dev",
    password: "Estudiante123!",
  },
  {
    label: "Admin",
    email: "admin@controlboard.dev",
    password: "Admin123!",
  },
  {
    label: "Superadministrador",
    email: "superadmin@controlboard.dev",
    password: "SuperAdmin123!",
  },
  {
    label: "Secretaría",
    email: "secretaria@controlboard.dev",
    password: "Secretaria123!",
  },
  {
    label: "Psicología",
    email: "psicologia@controlboard.dev",
    password: "Psicologia123!",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Iniciar sesión"
      description="Entra con tu cuenta de ControlBoard."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-indigo-600 hover:underline"
          >
            Crear una cuenta
          </Link>
        </>
      }
    >
      <form action={loginAction} className="space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        <div>
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@universidad.edu"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-medium text-slate-700">Cuentas de demostración</p>
        <p className="mt-1 text-slate-500">
          Haz clic en una cuenta para entrar directamente.
        </p>
        <div className="mt-3 space-y-2">
          {demoAccounts.map((account) => (
            <form key={account.email} action={loginAction}>
              <input type="hidden" name="email" value={account.email} />
              <input type="hidden" name="password" value={account.password} />
              <button
                type="submit"
                className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-indigo-500 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <span>
                  <span className="block text-xs font-medium text-slate-700">
                    {account.label}
                  </span>
                  <span className="block font-mono text-[11px] text-slate-500">
                    {account.email}
                  </span>
                </span>
                <span className="text-xs font-medium text-indigo-600">
                  Entrar →
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
