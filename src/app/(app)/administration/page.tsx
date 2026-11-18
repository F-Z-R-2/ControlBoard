import type { Metadata } from "next";
import type { Role } from "@prisma/client";
import Link from "next/link";
import { saveUserAction, manageEnrollmentAction } from "@/app/actions/administration";
import { ManagementSubmit } from "@/components/management-submit";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canManageUser, manageableRoles } from "@/lib/roles";
import { roleLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Administración" };

type EditableUser = { id: string; name: string; email: string; role: Role; isActive: boolean };

function UserForm({ roles, user }: { roles: Role[]; user?: EditableUser }) {
  return <form action={saveUserAction} className="grid gap-4 sm:grid-cols-2">
    {user && <input type="hidden" name="id" value={user.id} />}
    <label className="text-sm">Nombre completo<Input name="name" defaultValue={user?.name} required minLength={2} maxLength={120} autoComplete="name" /></label>
    <label className="text-sm">Correo<Input name="email" type="email" defaultValue={user?.email} required autoComplete="email" /></label>
    <label className="text-sm">Rol<Select name="role" defaultValue={user?.role ?? roles[0]}>{roles.map(role => <option key={role} value={role}>{roleLabel(role)}</option>)}</Select></label>
    <label className="text-sm">Estado<Select name="isActive" defaultValue={String(user?.isActive ?? true)}><option value="true">Activo</option><option value="false">Inactivo</option></Select></label>
    <label className="text-sm sm:col-span-2">{user ? "Nueva contraseña (dejar vacía para conservarla)" : "Contraseña inicial"}<Input name="password" type="password" minLength={8} maxLength={72} required={!user} autoComplete="new-password" /></label>
    <div className="sm:col-span-2"><ManagementSubmit>{user ? "Guardar cambios" : "Crear cuenta"}</ManagementSubmit></div>
  </form>;
}

export default async function AdministrationPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; edit?: string; error?: string; success?: string }> }) {
  const actor = await requireStaff();
  const params = await searchParams;
  const roles = manageableRoles(actor.role);
  const q = (params.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const where = { role: { in: roles }, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}) };
  const select = { id: true, name: true, email: true, role: true, isActive: true } as const;
  const [users, count, editing, students, courses, enrollmentCount] = await Promise.all([
    prisma.user.findMany({ where, select, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * 20, take: 20 }),
    prisma.user.count({ where }),
    params.edit ? prisma.user.findFirst({ where: { id: params.edit, role: { in: roles } }, select }) : null,
    prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true, name: true, email: true, isActive: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ select: { id: true, code: true, title: true, _count: { select: { enrollments: true } } }, orderBy: { title: "asc" } }),
    prisma.enrollment.count(),
  ]);
  const editable = editing && canManageUser(actor, editing) ? editing : null;
  const title = actor.role === "SECRETARY" ? "Secretaría" : actor.role === "SUPER_ADMIN" ? "Superadministración" : "Administración";
  const description = actor.role === "SECRETARY" ? "Gestiona estudiantes y matrículas." : actor.role === "SUPER_ADMIN" ? "Gestiona todos los roles y las cuentas del campus." : "Gestiona docentes, estudiantes, Secretaría y matrículas.";
  return <div>
    <PageHeader title={title} description={description} />
    <div className="space-y-6 p-4 sm:p-8">
      {params.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
      {params.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[ ["Estudiantes", students.length], ["Cursos", courses.length], ["Matrículas", enrollmentCount] ].map(([label, value]) => <div key={label} className="border bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
      </div>
      <section className="border bg-white p-5" aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className="mb-4 text-lg font-semibold">Cuentas ({count})</h2>
        <form className="mb-4 flex flex-wrap gap-2" action="/administration"><Input name="q" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo" defaultValue={q} className="max-w-sm" /><Button type="submit" variant="outline">Buscar</Button><Link className="self-center text-sm text-blue-700" href="/administration">Limpiar</Link></form>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Nombre / correo</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2">Acciones</th></tr></thead><tbody>{users.map(user => <tr key={user.id} className="border-b"><td className="p-2"><p>{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="p-2">{roleLabel(user.role)}</td><td className="p-2">{user.isActive ? "Activo" : "Inactivo"}</td><td className="p-2">{canManageUser(actor, user) ? <Link className="text-blue-700 underline" href={`/administration?edit=${user.id}#user-form`}>Editar</Link> : "Tu cuenta"}</td></tr>)}</tbody></table></div>
        {!users.length && <p className="py-4 text-sm text-slate-500">No se encontraron cuentas.</p>}
        <div className="mt-4 flex gap-4 text-sm"><span>Página {page}</span>{page > 1 && <Link href={`/administration?q=${encodeURIComponent(q)}&page=${page - 1}`}>Anterior</Link>}{page * 20 < count && <Link href={`/administration?q=${encodeURIComponent(q)}&page=${page + 1}`}>Siguiente</Link>}</div>
      </section>
      <section id="user-form" className="border bg-white p-5" aria-labelledby="user-heading">
        <div className="mb-4 flex justify-between gap-3"><h2 id="user-heading" className="text-lg font-semibold">{editable ? `Editar: ${editable.name}` : "Crear cuenta"}</h2>{params.edit && <Link href="/administration#user-form" className="text-sm text-blue-700">Cancelar edición</Link>}</div>
        {params.edit && !editable && <p role="alert" className="mb-4 text-sm text-red-700">Esta cuenta no está disponible para edición.</p>}
        <UserForm key={editable?.id ?? "new"} roles={roles} user={editable ?? undefined} />
        <p className="mt-3 text-xs text-slate-500">Las cuentas inactivas no pueden acceder al campus. No puedes modificar tu propia cuenta desde este panel.</p>
      </section>
      <section className="border bg-white p-5" aria-labelledby="enrollment-heading">
        <h2 id="enrollment-heading" className="mb-4 text-lg font-semibold">Gestionar matrículas</h2>
        {students.length && courses.length ? <form action={manageEnrollmentAction} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Estudiante<Select name="userId" required defaultValue=""><option value="" disabled>Selecciona un estudiante</option>{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.email}{student.isActive ? "" : " (inactivo)"}</option>)}</Select></label>
          <label className="text-sm">Curso<Select name="courseId" required defaultValue=""><option value="" disabled>Selecciona un curso</option>{courses.map(course => <option key={course.id} value={course.id}>{course.code} · {course.title} ({course._count.enrollments} matriculados)</option>)}</Select></label>
          <label className="text-sm">Operación<Select name="operation"><option value="enroll">Matricular</option><option value="withdraw">Retirar matrícula</option></Select></label>
          <div className="self-end"><ManagementSubmit>Aplicar matrícula</ManagementSubmit></div>
          <p className="text-xs text-slate-500 sm:col-span-2">Retirar la matrícula quita el acceso al curso y conserva las entregas existentes.</p>
        </form> : <p className="text-sm text-slate-500">Crea al menos un estudiante y un curso para gestionar matrículas.</p>}
      </section>
    </div>
  </div>;
}
