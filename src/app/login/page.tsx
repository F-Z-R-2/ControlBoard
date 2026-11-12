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
        <ul className="mt-2 space-y-1">
          <li>
            Profesor: <span className="font-mono">instructor@controlboard.dev</span> /{" "}
            <span className="font-mono">Profe123!</span>
          </li>
          <li>
            Estudiante: <span className="font-mono">estudiante@controlboard.dev</span> /{" "}
            <span className="font-mono">Estudiante123!</span>
          </li>
          <li>
            Admin: <span className="font-mono">admin@controlboard.dev</span> /{" "}
            <span className="font-mono">Admin123!</span>
          </li>
        </ul>
      </div>
    </AuthShell>
  );
}
