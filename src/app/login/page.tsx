import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
<<<<<<< HEAD
import { ArrowUpRight, BookOpen, Brain, BriefcaseBusiness, GraduationCap, MapPin, ShieldCheck, Users } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { LoginForm, LoginSubmit } from "@/components/login-form";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Iniciar sesión · I. E. 40122 Manuel Scorza",
=======
import { ArrowUpRight, BookOpen, Brain, BriefcaseBusiness, ChevronDown, GraduationCap, MapPin, ShieldCheck, Users } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { LoginForm, LoginSubmit } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
>>>>>>> 1630ef5 (style: ajustar colores y estilos visuales)
  description: "Accede al campus virtual de la I. E. 40122 Manuel Scorza, Cerro Juli.",
};

const demoAccounts = [
  { label: "Estudiante", email: "estudiante@controlboard.dev", password: "Estudiante123!", icon: GraduationCap },
  { label: "Docente", email: "instructor@controlboard.dev", password: "Profe123!", icon: BookOpen },
  { label: "Secretaría", email: "secretaria@controlboard.dev", password: "Secretaria123!", icon: BriefcaseBusiness },
  { label: "Psicología", email: "psicologia@controlboard.dev", password: "Psicologia123!", icon: Brain },
  { label: "Administrador", email: "admin@controlboard.dev", password: "Admin123!", icon: Users },
  { label: "Superadministrador", email: "superadmin@controlboard.dev", password: "SuperAdmin123!", icon: ShieldCheck },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
<<<<<<< HEAD
    <main className="min-h-screen bg-[#f6f5ef] p-3 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1440px] overflow-hidden rounded-[28px] border border-stone-200/70 bg-white shadow-xl shadow-stone-900/5 lg:grid-cols-[0.95fr_1.05fr]">
        <section aria-label="Nuestra institución" className="relative flex flex-col overflow-hidden bg-[#153e32] px-7 py-8 text-white sm:px-12 lg:p-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-24 h-[560px] w-[560px] rounded-full border border-white/5" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-44 h-[400px] w-[400px] rounded-full border border-white/5" />
          <Link href="/" className="relative flex w-fit items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-300">
            <span className="h-8 w-1 rounded-full bg-[#e9ce58]" />
            <span className="text-xs font-medium uppercase leading-5 tracking-[0.2em]">Institución educativa<br /><span className="text-emerald-100/65">N.° 40122 · Cerro Juli</span></span>
          </Link>
          <div className="relative flex flex-1 flex-col justify-center py-8 lg:py-12">
            <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2.5 shadow-lg sm:h-28 sm:w-28 lg:h-40 lg:w-40 lg:rounded-[28px] lg:p-4">
              <Image src="/images/escudo-manuel-scorza.png" alt="Escudo de la I. E. 40122 Manuel Scorza" width={160} height={160} priority className="h-full w-full object-contain" />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#e9ce58]">Nuestro colegio, más cerca</p>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">Manuel<br className="hidden lg:block" /> Scorza<span className="text-[#e9ce58]">.</span></h1>
            <p className="mt-6 max-w-sm text-sm leading-7 text-emerald-50/75 sm:text-base">Un espacio para aprender, acompañar y crecer juntos. Toda nuestra comunidad educativa, conectada.</p>
            <div className="mt-9 hidden gap-3 border-t border-white/15 pt-6 lg:flex">
              {['Aprendizaje', 'Comunidad', 'Bienestar'].map((item) => <span key={item} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-emerald-50/80">{item}</span>)}
            </div>
          </div>
          <p className="relative flex items-center gap-2 text-xs text-emerald-50/60"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Cerro Juli · Arequipa, Perú</p>
        </section>
        <section aria-labelledby="login-title" className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-50/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#154c3b]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Campus virtual</span>
            <h2 id="login-title" className="mt-6 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">Te damos la bienvenida</h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">Ingresa con tu cuenta para continuar tu día en el colegio.</p>
            <div className="mt-8 space-y-5">
              {error ? <div role="alert"><Alert className="rounded-xl">{error}</Alert></div> : null}
              <LoginForm />
            </div>
            <p className="mt-5 text-center text-sm text-stone-500">¿Eres nuevo aquí? <Link href="/register" className="font-semibold text-[#154c3b] underline-offset-4 hover:underline">Crea tu cuenta</Link></p>
            <section aria-labelledby="demo-title" className="mt-9 border-t border-stone-100 pt-6">
              <div className="flex items-center justify-between gap-2">
                <h3 id="demo-title" className="text-sm font-semibold text-stone-700">Explora el campus</h3>
                <span className="rounded-md bg-[#faf5df] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#7d661b]">Demostración</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-stone-500">Elige un perfil de prueba para ingresar directamente.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
=======
    <main className="relative isolate min-h-svh overflow-hidden bg-[#101e26] text-white">
      <Image src="/images/login-montanas.png" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,22,24,0.96)_0%,rgba(8,24,28,0.83)_48%,rgba(8,20,28,0.25)_100%)]" />
      <div className="mx-auto flex min-h-svh max-w-[1440px] flex-col px-6 py-6 sm:px-12 sm:py-8 lg:px-20">
        <header className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
          <Link href="/" aria-label="Manuel Scorza, inicio" className="group flex items-center gap-4 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-200">
            <span className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] p-1.5 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors group-hover:bg-white/10 sm:h-[84px] sm:w-[84px]">
              <Image src="/images/escudo-manuel-scorza.png" alt="Escudo del colegio Manuel Scorza" width={72} height={72} priority className="h-full w-full object-contain drop-shadow-md" />
            </span>
            <span className="border-l border-[#edcf60]/60 pl-4"><span className="block text-[10px] uppercase tracking-[0.2em] text-white/65">Institución educativa · 40122</span><span className="mt-1 block text-xl font-semibold tracking-tight text-white sm:text-2xl">Manuel Scorza</span><span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-[#edcf60]/85">Cerro Juli · Arequipa</span></span>
          </Link>
          <span className="hidden items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 sm:inline-flex"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#edcf60]" /> Campus virtual</span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-2 lg:gap-16 lg:py-12">
          <section aria-labelledby="login-title" className="w-full max-w-[430px]">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.23em] text-[#edcf60]">Tu comunidad, siempre cerca</p>
            <h1 id="login-title" className="text-4xl font-light tracking-tight sm:text-5xl">¡Bienvenido!</h1>
            <p className="mb-8 mt-3 text-sm leading-6 text-white/70">Un nuevo día para aprender y crecer.<br />Ingresa a tu espacio en el colegio.</p>
            {error ? <div role="alert" className="mb-6 rounded-lg border border-red-300/40 bg-red-950/70 px-4 py-3 text-sm text-red-100">{error}</div> : null}
            <LoginForm />
            <p className="mt-6 text-sm text-white/65">¿Aún no tienes cuenta? <Link href="/register" className="font-medium text-[#edcf60] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-yellow-200">Regístrate aquí</Link></p>

            <details className="group mt-8 border-t border-white/20 pt-4">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded text-xs text-white/80 focus-visible:outline-2 focus-visible:outline-yellow-200 [&::-webkit-details-marker]:hidden">
                <span>Explorar con una cuenta de prueba</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs leading-5 text-white/60">Selecciona un perfil para entrar a la demostración.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
>>>>>>> 1630ef5 (style: ajustar colores y estilos visuales)
                {demoAccounts.map(({ label, email, password, icon: Icon }) => (
                  <form key={email} action={loginAction}>
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="password" value={password} />
<<<<<<< HEAD
                    <LoginSubmit className="group flex min-h-12 w-full items-center gap-2 rounded-xl border border-stone-200 px-3 py-3 text-left text-xs font-medium text-stone-600 transition-colors hover:border-emerald-700/30 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                      <Icon className="h-4 w-4 shrink-0 text-[#527567]" aria-hidden="true" /><span className="flex-1">{label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-emerald-700" aria-hidden="true" />
=======
                    <LoginSubmit className="group/item flex min-h-11 w-full items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-xs text-white/90 transition-colors hover:border-yellow-200/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-yellow-200">
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#edcf60]" /><span className="flex-1">{label}</span><ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-white/50" />
>>>>>>> 1630ef5 (style: ajustar colores y estilos visuales)
                    </LoginSubmit>
                  </form>
                ))}
              </div>
<<<<<<< HEAD
            </section>
            <p className="mt-8 text-center text-[11px] text-stone-400">I. E. 40122 Manuel Scorza · Comunidad educativa</p>
          </div>
        </section>
=======
            </details>
          </section>
          <aside className="hidden self-end pb-12 pl-12 lg:block" aria-label="Comunidad educativa">
            <span className="mb-6 block h-0.5 w-12 bg-[#edcf60]" />
            <p className="max-w-sm font-serif text-4xl leading-tight text-white/95 xl:text-5xl">Grandes sueños.<br />Un mismo horizonte.</p>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/70">Aprendizaje, acompañamiento y bienestar para nuestra comunidad educativa.</p>
          </aside>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[11px] text-white/55">
          <span>I. E. 40122 Manuel Scorza</span><span className="flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-3 w-3" /> Cerro Juli · Arequipa, Perú</span>
        </footer>
>>>>>>> 1630ef5 (style: ajustar colores y estilos visuales)
      </div>
    </main>
  );
}