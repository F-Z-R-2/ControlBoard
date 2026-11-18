"use client";

import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginSubmit({ children, className }: { children: ReactNode; className: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Ingresando…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function LoginForm() {
  const [visible, setVisible] = useState(false);

  return (
    <form action={loginAction} className="space-y-5">
      <div>
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative mt-2">
          <Mail className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-stone-400" aria-hidden="true" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="tu.correo@ejemplo.com"
            required
            className="h-12 rounded-xl border-stone-200 bg-stone-50/60 pl-11 focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700/10"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative mt-2">
          <LockKeyhole className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-stone-400" aria-hidden="true" />
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            required
            className="h-12 rounded-xl border-stone-200 bg-stone-50/60 pl-11 pr-12 focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700/10"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            aria-controls="password"
            className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <LoginSubmit className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#154c3b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0e392c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
        Ingresar al campus <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </LoginSubmit>
    </form>
  );
}
