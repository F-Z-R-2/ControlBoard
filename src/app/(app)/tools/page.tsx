import { ArrowRight, BookOpen, CalendarDays, GraduationCap, KeyRound, ShieldCheck, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { changeOwnPasswordAction, updateOwnProfileAction } from "@/app/actions/profile";
import { ManagementSubmit } from "@/components/management-submit";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/permissions";
import { isStaff } from "@/lib/roles";
import { roleLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi perfil y herramientas" };

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await requireUser();
  const messages = await searchParams;
  const staff = isStaff(user.role);
  return <div>
    <PageHeader title="Mi perfil y herramientas" description="Administra tu cuenta y accede a las tareas frecuentes del campus." />
    <div className="space-y-6 p-4 sm:p-8">
      {messages.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{messages.error}</p>}
      {messages.success && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{messages.success}</p>}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="profile-heading">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-800"><UserRound className="h-5 w-5" /></span><div><h2 id="profile-heading" className="text-base font-semibold text-slate-950">Perfil de usuario</h2><p className="mt-1 text-xs text-slate-500">Actualiza el nombre y el correo de inicio de sesión.</p></div></div>
            <form action={updateOwnProfileAction} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Nombre completo<Input name="name" defaultValue={user.name ?? ""} autoComplete="name" minLength={2} maxLength={120} required className="mt-1.5" /></label>
              <label className="text-sm font-medium text-slate-700">Correo electrónico<Input name="email" type="email" defaultValue={user.email ?? ""} autoComplete="email" maxLength={254} required className="mt-1.5" /></label>
              <div className="flex items-center justify-between gap-3 sm:col-span-2"><p className="text-xs text-slate-500">Rol actual: <span className="font-medium text-slate-700">{roleLabel(user.role)}</span></p><ManagementSubmit>Guardar perfil</ManagementSubmit></div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="password-heading">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-800"><KeyRound className="h-5 w-5" /></span><div><h2 id="password-heading" className="text-base font-semibold text-slate-950">Cambiar contraseña</h2><p className="mt-1 text-xs text-slate-500">Confirma tu contraseña actual para guardar una nueva.</p></div></div>
            <form action={changeOwnPasswordAction} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Contraseña actual<Input name="currentPassword" type="password" autoComplete="current-password" required className="mt-1.5" /></label>
              <label className="text-sm font-medium text-slate-700">Nueva contraseña<Input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="mt-1.5" /></label>
              <label className="text-sm font-medium text-slate-700">Repetir contraseña<Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="mt-1.5" /></label>
              <div className="flex justify-end sm:col-span-2"><ManagementSubmit variant="outline">Actualizar contraseña</ManagementSubmit></div>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="tools-heading">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700"><ShieldCheck className="h-4 w-4" /></span><div><h2 id="tools-heading" className="text-base font-semibold text-slate-950">Accesos de trabajo</h2><p className="mt-1 text-xs text-slate-500">Funciones del colegio disponibles para tu rol.</p></div></div>
            <div className="divide-y divide-slate-100">
              <Link href="/courses" className="flex items-center justify-between gap-3 py-3 text-sm text-slate-700 hover:text-blue-800"><span className="flex items-center gap-2.5"><BookOpen className="h-4 w-4 text-blue-800" />Cursos</span><ArrowRight className="h-3.5 w-3.5" /></Link>
              <Link href="/calendar" className="flex items-center justify-between gap-3 py-3 text-sm text-slate-700 hover:text-blue-800"><span className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-blue-800" />Calendario</span><ArrowRight className="h-3.5 w-3.5" /></Link>
              {staff && <>
                <Link href="/students" className="flex items-center justify-between gap-3 py-3 text-sm text-slate-700 hover:text-blue-800"><span className="flex items-center gap-2.5"><GraduationCap className="h-4 w-4 text-blue-800" />Directorio de estudiantes</span><ArrowRight className="h-3.5 w-3.5" /></Link>
                <Link href="/administration" className="flex items-center justify-between gap-3 py-3 text-sm text-slate-700 hover:text-blue-800"><span className="flex items-center gap-2.5"><Users className="h-4 w-4 text-blue-800" />Cuentas y restablecimiento de contraseña</span><ArrowRight className="h-3.5 w-3.5" /></Link>
                <Link href="/academics" className="flex items-center justify-between gap-3 py-3 text-sm text-slate-700 hover:text-blue-800"><span className="flex items-center gap-2.5"><BookOpen className="h-4 w-4 text-blue-800" />Años, periodos y secciones</span><ArrowRight className="h-3.5 w-3.5" /></Link>
                <Link href="/attendance" className="flex items-center justify-between gap-3 py-3 text-sm text-slate-700 hover:text-blue-800"><span className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-blue-800" />Control de asistencia</span><ArrowRight className="h-3.5 w-3.5" /></Link>
              </>}
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-blue-50/60 p-4"><p className="text-sm font-semibold text-slate-900">Seguridad de cuenta</p><p className="mt-1 text-xs leading-5 text-slate-600">Las contraseñas se almacenan con hash. Solo se modifican después de verificar la contraseña actual o desde el formulario de cuentas autorizado.</p></section>
        </aside>
      </section>
    </div>
  </div>;
}
