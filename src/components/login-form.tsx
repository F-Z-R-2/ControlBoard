"use client";

import { ArrowRight, Brain, BriefcaseBusiness, Eye, EyeOff, GraduationCap, Loader2, LockKeyhole, Mail, ShieldCheck, Users, BookOpen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { demoLoginAction, loginAction } from "@/app/actions/auth";
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

const demoProfiles = [
  { key: "student", label: "Estudiante", Icon: GraduationCap },
  { key: "instructor", label: "Docente", Icon: BookOpen },
  { key: "secretary", label: "Secretaría", Icon: BriefcaseBusiness },
  { key: "psychologist", label: "Psicología", Icon: Brain },
  { key: "admin", label: "Administrador", Icon: Users },
  { key: "superAdmin", label: "Superadministrador", Icon: ShieldCheck },
] as const;

export function LoginForm({ showDemoProfiles = false }: { showDemoProfiles?: boolean }) {
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

      {showDemoProfiles ? (
        <section className="rounded-xl border border-white/15 bg-slate-950/45 p-4 backdrop-blur-sm" aria-labelledby="demo-profiles-title">
          <h2 id="demo-profiles-title" className="text-sm font-semibold text-white">Explorar con una cuenta de prueba</h2>
          <p className="mt-1 text-xs text-white/65">Elige un perfil para entrar a la demostración, sin escribir correo ni contraseña.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {demoProfiles.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="submit"
                formAction={demoLoginAction.bind(null, key)}
                formNoValidate
                className="flex min-h-12 items-center gap-2 rounded-lg border border-white/20 bg-white/[0.06] px-3 text-left text-xs font-medium text-white transition-colors hover:border-[#edcf60]/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-200"
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#edcf60]" />
                <span>{label}</span>
                <ArrowRight aria-hidden="true" className="ml-auto h-3.5 w-3.5 shrink-0 text-white/50" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-white/55">Cuentas y datos ficticios de demostración. No ingreses información real.</p>
        </section>
      ) : null}
    </form>
  );
}
