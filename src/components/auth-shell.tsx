import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#4338ca_0,_transparent_55%),radial-gradient(circle_at_bottom_left,_#1e293b_0,_transparent_50%)]" />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              ControlBoard
            </span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Tu curso, tus clases y tus notas en el mismo campus.
          </h2>
          <p className="mt-4 text-slate-300">
            Un campus completo para gestionar cursos, tareas y clases en vivo,
            pensado para equipos docentes que quieren menos clics y más clase.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="font-medium text-white">Learn</p>
              <p className="mt-1 text-slate-400">Contenido, tareas y notas</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="font-medium text-white">Collaborate</p>
              <p className="mt-1 text-slate-400">Video, chat y pizarra</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">
          Next.js · Neon Postgres · LiveKit · Vercel
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex items-center gap-2 lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              ControlBoard
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-sm text-slate-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}
