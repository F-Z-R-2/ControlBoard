import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Megaphone,
  MonitorPlay,
  PenLine,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const learnFeatures = [
  {
    icon: BookOpen,
    title: "Cursos y contenido",
    description:
      "Organiza programas, páginas, enlaces y archivos en un espacio claro para cada materia.",
  },
  {
    icon: ClipboardList,
    title: "Tareas y entregas",
    description:
      "Publica consignas, recibe entregas y devuelve retroalimentación con nota en el mismo lugar.",
  },
  {
    icon: BarChart3,
    title: "Libro de notas",
    description:
      "Consulta el avance de cada estudiante y el consolidado de notas del curso.",
  },
  {
    icon: Megaphone,
    title: "Anuncios",
    description:
      "Comunica novedades y recordatorios a todo el curso con un solo mensaje.",
  },
];

const collaborateFeatures = [
  {
    icon: Video,
    title: "Video y audio en vivo",
    description:
      "Aulas WebRTC con cámara, micrófono, compartir pantalla y controles de moderación.",
  },
  {
    icon: PenLine,
    title: "Pizarra colaborativa",
    description:
      "Dibuja, diagrama y explica en una pizarra sincronizada para todos los participantes.",
  },
  {
    icon: Users,
    title: "Chat y participantes",
    description:
      "Conversación dentro de la sesión y lista de asistentes en tiempo real.",
  },
  {
    icon: MonitorPlay,
    title: "Grabaciones",
    description:
      "Guarda las clases para que quien no pudo asistir las vea después.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              ControlBoard
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className={buttonVariants({ size: "sm" })}
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#e0e7ff_0,_transparent_45%),radial-gradient(circle_at_bottom_left,_#f1f5f9_0,_transparent_40%)]" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
            <div>
              <Badge className="mb-5">Learn + Collaborate, en un solo lugar</Badge>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Todo tu campus, sin saltar entre plataformas.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Gestiona cursos, tareas y calificaciones, y entra a clases en
                vivo con video, chat y pizarra colaborativa desde el mismo
                panel.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className={buttonVariants({ size: "lg" })}
                >
                  Empezar ahora
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Ver demo
                </Link>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Roles de administrador, profesor y estudiante incluidos.
              </p>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60">
                <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-white">
                  <span className="text-xs font-medium">CS-101 · En vivo</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    12 conectados
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["LM", "DR", "AT", "JP", "SC", "MR"].map((person, index) => (
                    <div
                      key={person}
                      className={`flex aspect-video items-center justify-center rounded-lg text-sm font-semibold ${
                        index === 0
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {person}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white">
                    <PenLine className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <div className="h-2 w-2/3 rounded-full bg-slate-200" />
                    <div className="mt-1.5 h-2 w-1/3 rounded-full bg-slate-100" />
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                    Pizarra
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              ControlBoard Learn
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              La gestión académica, resuelta.
            </h2>
            <p className="mt-3 text-slate-600">
              Lo esencial del curso sin menús interminables: contenido,
              entregas, notas y comunicación.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {learnFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                ControlBoard Collaborate
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Clases en vivo que sí se sienten en vivo.
              </h2>
              <p className="mt-3 text-slate-600">
                Video, audio, pantalla, chat y pizarra sobre LiveKit, con la
                misma sesión de usuario del campus.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {collaborateFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-slate-900 p-8 text-white sm:p-10 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Prueba el campus con datos de demostración.
              </h2>
              <p className="mt-2 text-slate-300">
                Tres roles, un curso y una sesión en vivo listos para explorar.
              </p>
            </div>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "secondary",
                size: "lg",
                className: "shrink-0",
              })}
            >
              Entrar a la demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span>ControlBoard · Next.js + Neon + LiveKit</span>
          <span>Interfaz en español</span>
        </div>
      </footer>
    </div>
  );
}
