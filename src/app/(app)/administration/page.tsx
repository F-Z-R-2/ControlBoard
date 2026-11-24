import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { saveUserAction, manageEnrollmentAction } from "@/app/actions/administration";
import { ClientGetForm } from "@/components/client-get-form";
import { ManagementSubmit } from "@/components/management-submit";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Course, Role, User } from "@/lib/db-types";
import { requireStaff } from "@/lib/permissions";
import { canManageUser, manageableRoles } from "@/lib/roles";
import { roleLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Administración" };

type EditableUser = { id: string; name: string; email: string; role: Role; isActive: boolean };

function UserForm({ roles, user, defaultRole }: { roles: Role[]; user?: EditableUser; defaultRole?: Role }) {
  return <form action={saveUserAction} className="grid gap-4 sm:grid-cols-2">
    {user && <input type="hidden" name="id" value={user.id} />}
    <label className="text-sm">Nombre completo<Input name="name" defaultValue={user?.name} required minLength={2} maxLength={120} autoComplete="name" /></label>
    <label className="text-sm">Correo<Input name="email" type="email" defaultValue={user?.email} required autoComplete="email" /></label>
    <label className="text-sm">Rol<Select name="role" defaultValue={user?.role ?? defaultRole ?? roles[0]}>{roles.map(role => <option key={role} value={role}>{roleLabel(role)}</option>)}</Select></label>
    <label className="text-sm">Estado<Select name="isActive" defaultValue={String(user?.isActive ?? true)}><option value="true">Activo</option><option value="false">Inactivo</option></Select></label>
    <label className="text-sm sm:col-span-2">{user ? "Nueva contraseña (dejar vacía para conservarla)" : "Contraseña inicial"}<Input name="password" type="password" minLength={8} maxLength={72} required={!user} autoComplete="new-password" /></label>
    <div className="sm:col-span-2"><ManagementSubmit>{user ? "Guardar cambios" : "Crear cuenta"}</ManagementSubmit></div>
  </form>;
}

export default async function AdministrationPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; edit?: string; new?: string; error?: string; success?: string }> }) {
  const actor = await requireStaff();
  const params = await searchParams;
  const roles = manageableRoles(actor.role);
  const q = (params.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const roleParams = roles.map((_, index) => `$${index + 1}`).join(", ");
  const conditions = [`"role" IN (${roleParams})`];
  const filterParams: unknown[] = [...roles];
  if (q) {
    filterParams.push(`%${q}%`);
    conditions.push(`("name" ILIKE $${filterParams.length} OR "email" ILIKE $${filterParams.length})`);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const [userRows, countRows, editingRows, students, courseRows, enrollmentCountRows] = await Promise.all([
    db.query<EditableUser>(
      `SELECT "id", "name", "email", "role", "isActive" FROM "User" ${where}
       ORDER BY "name" ASC, "id" ASC LIMIT 20 OFFSET $${filterParams.length + 1}`,
      [...filterParams, (page - 1) * 20],
    ),
    db.query<{ count: number }>(`SELECT COUNT(*)::int AS "count" FROM "User" ${where}`, filterParams),
    params.edit
      ? db.query<EditableUser>(
          `SELECT "id", "name", "email", "role", "isActive" FROM "User"
           WHERE "id" = $1 AND "role" IN (${roleParams}) LIMIT 1`,
          [params.edit, ...roles],
        )
      : Promise.resolve([] as EditableUser[]),
    db.sql<Pick<User, "id" | "name" | "email" | "isActive">>`
      SELECT "id", "name", "email", "isActive" FROM "User"
      WHERE "role" = 'STUDENT' ORDER BY "name" ASC
    `,
    db.query<Pick<Course, "id" | "code" | "title"> & { enrollmentCount: number }>(
      `SELECT c."id", c."code", c."title",
         (SELECT COUNT(*)::int FROM "Enrollment" e WHERE e."courseId" = c."id") AS "enrollmentCount"
       FROM "Course" c ORDER BY c."title" ASC`,
    ),
    db.sql<{ count: number }>`SELECT COUNT(*)::int AS "count" FROM "Enrollment"`,
  ]);
  const users = userRows;
  const count = countRows[0]!.count;
  const editing = editingRows[0] ?? null;
  const courses = courseRows.map(({ enrollmentCount, ...course }) => ({
    ...course,
    _count: { enrollments: enrollmentCount },
  }));
  const enrollmentCount = enrollmentCountRows[0]!.count;
  const editable = editing && canManageUser(actor, editing) ? editing : null;
  const creatingTeacher = params.new === "teacher" && !editable && roles.includes("INSTRUCTOR");
  const title = actor.role === "SECRETARY" ? "Secretaría" : actor.role === "SUPER_ADMIN" ? "Superadministración" : "Administración";
  const description = actor.role === "SECRETARY" ? "Gestiona estudiantes y matrículas." : actor.role === "SUPER_ADMIN" ? "Gestiona todos los roles y las cuentas del campus." : "Gestiona docentes, estudiantes, Secretaría y matrículas.";
  return <div>
    <PageHeader title={title} description={description} actions={roles.includes("INSTRUCTOR") ? <Link href="/administration?new=teacher#user-form" className="inline-flex h-10 items-center gap-2 border border-[#0b3ddb] bg-[#0b3ddb] px-4 text-sm font-medium text-white hover:bg-[#0932b5]"><UserPlus className="h-4 w-4" />Añadir profesor</Link> : undefined} />
    <div className="space-y-6 p-4 sm:p-8">
      {params.error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>}
      {params.success && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[ ["Estudiantes", students.length], ["Cursos", courses.length], ["Matrículas", enrollmentCount] ].map(([label, value]) => <div key={label} className="border bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
      </div>
      <section className="border bg-white p-5" aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className="mb-4 text-lg font-semibold">Cuentas ({count})</h2>
        <ClientGetForm className="mb-4 flex flex-wrap gap-2" action="/administration"><Input name="q" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo" defaultValue={q} className="max-w-sm" /><Button type="submit" variant="outline">Buscar</Button><Link className="self-center text-sm text-blue-700" href="/administration">Limpiar</Link></ClientGetForm>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Nombre / correo</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2">Acciones</th></tr></thead><tbody>{users.map(user => <tr key={user.id} className="border-b"><td className="p-2"><p>{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="p-2">{roleLabel(user.role)}</td><td className="p-2">{user.isActive ? "Activo" : "Inactivo"}</td><td className="p-2">{canManageUser(actor, user) ? <Link className="text-blue-700 underline" href={`/administration?edit=${user.id}#user-form`}>Editar</Link> : "Tu cuenta"}</td></tr>)}</tbody></table></div>
        {!users.length && <p className="py-4 text-sm text-slate-500">No se encontraron cuentas.</p>}
        <div className="mt-4 flex gap-4 text-sm"><span>Página {page}</span>{page > 1 && <Link href={`/administration?q=${encodeURIComponent(q)}&page=${page - 1}`}>Anterior</Link>}{page * 20 < count && <Link href={`/administration?q=${encodeURIComponent(q)}&page=${page + 1}`}>Siguiente</Link>}</div>
      </section>
      <section id="user-form" className="border bg-white p-5" aria-labelledby="user-heading">
        <div className="mb-4 flex justify-between gap-3"><div><h2 id="user-heading" className="text-lg font-semibold">{editable ? `Editar: ${editable.name}` : creatingTeacher ? "Registrar nuevo profesor" : "Crear cuenta"}</h2><p className="mt-1 text-sm text-slate-500">{creatingTeacher ? "Completa los datos de acceso del docente. Después podrás asignarlo a sus cursos." : "Registra una cuenta institucional y define su rol de acceso."}</p></div>{(params.edit || params.new) && <Link href="/administration#user-form" className="text-sm text-blue-700">Cancelar</Link>}</div>
        {params.edit && !editable && <p role="alert" className="mb-4 text-sm text-red-700">Esta cuenta no está disponible para edición.</p>}
        <UserForm key={editable?.id ?? (creatingTeacher ? "new-teacher" : "new")} roles={roles} user={editable ?? undefined} defaultRole={creatingTeacher ? "INSTRUCTOR" : undefined} />
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
