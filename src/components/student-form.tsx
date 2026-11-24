import { Users } from "lucide-react";
import { saveStudentAction } from "@/app/actions/students";
import { ManagementSubmit } from "@/components/management-submit";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type StudentSectionOption = {
  id: string;
  level: "PRIMARY" | "SECONDARY";
  gradeName: string;
  sectionName: string;
  yearName: string;
};

export type StudentFormData = {
  id: string;
  name: string;
  email: string;
  documentNumber: string;
  schoolSectionId: string | null;
  guardians: Array<{
    fullName: string;
    relationship: string;
    documentNumber: string | null;
    phone: string | null;
    email: string | null;
  }>;
};

export function StudentForm({
  sections,
  student,
}: {
  sections: StudentSectionOption[];
  student?: StudentFormData;
}) {
  const guardianAt = (position: number) => student?.guardians[position];

  return (
    <form action={saveStudentAction} className="space-y-6">
      {student && <input type="hidden" name="id" value={student.id} />}
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2" aria-labelledby="student-data-heading">
        <div className="sm:col-span-2">
          <p id="student-data-heading" className="text-sm font-semibold text-slate-900">Datos del estudiante</p>
          <p className="mt-1 text-xs text-slate-500">El código se genera automáticamente y el estudiante queda asociado a la sección seleccionada.</p>
        </div>
        <label className="text-sm font-medium text-slate-700">Nombre completo
          <Input name="name" defaultValue={student?.name} autoComplete="name" minLength={2} maxLength={120} required className="mt-1.5" />
        </label>
        <label className="text-sm font-medium text-slate-700">DNI
          <Input name="documentNumber" defaultValue={student?.documentNumber} inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} required className="mt-1.5" />
        </label>
        <label className="text-sm font-medium text-slate-700">Correo institucional
          <Input name="email" type="email" defaultValue={student?.email} autoComplete="email" maxLength={254} required className="mt-1.5" />
        </label>
        <label className="text-sm font-medium text-slate-700">Nivel, grado y sección
          <Select name="sectionId" defaultValue={student?.schoolSectionId ?? ""} required className="mt-1.5">
            <option value="" disabled>Selecciona una sección</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.level === "PRIMARY" ? "Primaria" : "Secundaria"} · {section.gradeName} · {section.sectionName} · {section.yearName}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          {student ? "Nueva contraseña (opcional)" : "Contraseña inicial"}
          <Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required={!student} className="mt-1.5" />
          {student && <span className="mt-1 block text-xs font-normal text-slate-500">Déjala vacía para conservar la contraseña actual.</span>}
        </label>
        {!sections.length && <p role="alert" className="text-sm text-amber-800 sm:col-span-2">No hay secciones A o B de Primaria o Secundaria en un año abierto. Configúralas primero en Gestión académica.</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4" aria-labelledby="guardians-heading">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-800"><Users className="h-4 w-4" /></span>
          <div>
            <p id="guardians-heading" className="text-sm font-semibold text-slate-900">Apoderados autorizados</p>
            <p className="mt-1 text-xs text-slate-500">Puedes registrar hasta tres personas. Deja una fila vacía si no corresponde.</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((position) => {
            const guardian = guardianAt(position - 1);
            return (
              <fieldset key={position} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Apoderado {position}</legend>
                <label className="text-xs font-medium text-slate-700">Nombre completo
                  <Input name={`guardianName${position}`} defaultValue={guardian?.fullName} maxLength={120} className="mt-1.5" />
                </label>
                <label className="text-xs font-medium text-slate-700">Parentesco
                  <Input name={`guardianRelationship${position}`} defaultValue={guardian?.relationship} placeholder="Madre, padre, tutor…" maxLength={40} className="mt-1.5" />
                </label>
                <label className="text-xs font-medium text-slate-700">DNI
                  <Input name={`guardianDocument${position}`} defaultValue={guardian?.documentNumber ?? ""} inputMode="numeric" maxLength={12} className="mt-1.5" />
                </label>
                <label className="text-xs font-medium text-slate-700">Teléfono
                  <Input name={`guardianPhone${position}`} defaultValue={guardian?.phone ?? ""} type="tel" autoComplete="tel" maxLength={20} className="mt-1.5" />
                </label>
                <label className="text-xs font-medium text-slate-700">Correo
                  <Input name={`guardianEmail${position}`} defaultValue={guardian?.email ?? ""} type="email" autoComplete="email" maxLength={254} className="mt-1.5" />
                </label>
              </fieldset>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end"><ManagementSubmit>{student ? "Guardar ficha" : "Registrar estudiante"}</ManagementSubmit></div>
    </form>
  );
}
