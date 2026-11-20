import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

import { loginAction } from "@/app/actions/auth";
import { LoginForm, LoginSubmit } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · I. E. 40122 Manuel Scorza",
  description:
    "Accede al campus virtual de la I. E. 40122 Manuel Scorza, Cerro Juli.",
};

const demoAccounts = [
  {
    label: "Estudiante",
    email: "estudiante@controlboard.dev",
    password: "Estudiante123!",
    icon: GraduationCap,
  },
  {
    label: "Docente",
    email: "instructor@controlboard.dev",
    password: "Profe123!",
    icon: BookOpen,
  },
  {
    label: "Secretaría",
    email: "secretaria@controlboard.dev",
    password: "Secretaria123!",
    icon: BriefcaseBusiness,
  },
  {
    label: "Psicología",
    email: "psicologia@controlboard.dev",
    password: "Psicologia123!",
    icon: Brain,
  },
  {
    label: "Administrador",
    email: "admin@controlboard.dev",
    password: "Admin123!",
    icon: Users,
  },
  {
    label: "Superadministrador",
    email: "superadmin@controlboard.dev",
    password: "SuperAdmin123!",
    icon: ShieldCheck,
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-[#101e26] text-white">
      <Image
        src="/images/login-montanas.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,22,24,0.96)_0%,rgba(8,24,28,0.83)_48%,rgba(8,20,28,0.25)_100%)]"
      />

      <div className="mx-auto flex min-h-svh max-w-[1440px] flex-col px-6 py-6 sm:px-12 sm:py-8 lg:px-20">
        <header className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
          <Link
            href="/login"
            aria-label="Manuel Scorza, inicio"
            className="group flex items-center gap-4 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-200"
          >
            <span className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] p-1.5 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors group-hover:bg-white/10 sm:h-[84px] sm:w-[84px]">
              <Image
                src="/images/escudo-manuel-scorza.png"
                alt="Escudo del colegio Manuel Scorza"
                width={72}
                height={72}
                priority
                className="h-full w-full object-contain drop-shadow-md"
              />
            </span>

            <span className="border-l border-[#edcf60]/60 pl-4">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-white/65">
                Institución educativa · 40122
              </span>
              <span className="mt-1 block text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Manuel Scorza
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-[#edcf60]/85">
                Cerro Juli · Arequipa
              </span>
            </span>
          </Link>

          <span className="hidden items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 sm:inline-flex">
            <ShieldCheck
              aria-hidden="true"
              className="h-3.5 w-3.5 text-[#edcf60]"
            />
            Campus virtual
          </span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-2 lg:gap-16 lg:py-12">
          <section aria-labelledby="login-title" className="w-full max-w-[430px]">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.23em] text-[#edcf60]">
              Tu comunidad, siempre cerca
            </p>

            <h1
              id="login-title"
              className="text-4xl font-light tracking-tight sm:text-5xl"
            >
              ¡Bienvenido!
            </h1>

            <p className="mb-8 mt-3 text-sm leading-6 text-white/70">
              Un nuevo día para aprender y crecer.
              <br />
              Ingresa a tu espacio en el colegio.
            </p>

            {error ? (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-300/40 bg-red-950/70 px-4 py-3 text-sm text-red-100"
              >
                {error}
              </div>
            ) : null}

            <LoginForm />

            <p className="mt-6 text-sm text-white/65">
              ¿Aún no tienes cuenta?{" "}
              <Link
                href="/register"
                className="font-medium text-[#edcf60] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-yellow-200"
              >
                Regístrate aquí
              </Link>
            </p>

            <details className="group mt-8 border-t border-white/20 pt-4">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded text-xs text-white/80 focus-visible:outline-2 focus-visible:outline-yellow-200 [&::-webkit-details-marker]:hidden">
                <span>Explorar con una cuenta de prueba</span>
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                />
              </summary>

              <p className="mt-2 text-xs leading-5 text-white/60">
                Selecciona un perfil para entrar a la demostración.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {demoAccounts.map(
                  ({ label, email, password, icon: Icon }) => (
                    <form key={email} action={loginAction}>
                      <input type="hidden" name="email" value={email} />
                      <input type="hidden" name="password" value={password} />

                      <LoginSubmit className="group/item flex min-h-11 w-full items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-xs text-white/90 transition-colors hover:border-yellow-200/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-yellow-200">
                        <Icon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-[#edcf60]"
                        />
                        <span className="flex-1">{label}</span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 text-white/50"
                        />
                      </LoginSubmit>
                    </form>
                  ),
                )}
              </div>
            </details>
          </section>

          <aside
            className="hidden self-end pb-12 pl-12 lg:block"
            aria-label="Comunidad educativa"
          >
            <span className="mb-6 block h-0.5 w-12 bg-[#edcf60]" />
            <p className="max-w-sm font-serif text-4xl leading-tight text-white/95 xl:text-5xl">
              Grandes sueños.
              <br />
              Un mismo horizonte.
            </p>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/70">
              Aprendizaje, acompañamiento y bienestar para nuestra comunidad
              educativa.
            </p>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[11px] text-white/55">
          <span>I. E. 40122 Manuel Scorza</span>
          <span className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-3 w-3" />
            Cerro Juli · Arequipa, Perú
          </span>
        </footer>
      </div>
    </main>
  );
}
