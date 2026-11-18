import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Crear cuenta"
      description="Crea tu cuenta de estudiante. Las cuentas del personal las gestiona administración."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:underline"
          >
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form action={registerAction} className="space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        <div>
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Ana Torres"
            required
          />
        </div>
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
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />
        </div>
        <div>
          <Label htmlFor="role">Quiero entrar como</Label>
          <Select id="role" name="role" defaultValue="STUDENT">
            <option value="STUDENT">Estudiante</option>
          </Select>
        </div>
        <Button type="submit" className="w-full">
          Crear cuenta
        </Button>
        <p className="text-xs text-slate-500">
          Al registrarte aceptas que esto es una demostración educativa y no
          una plataforma oficial de tu institución.
        </p>
      </form>
    </AuthShell>
  );
}
