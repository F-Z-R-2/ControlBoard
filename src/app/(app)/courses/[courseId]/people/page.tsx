import { GraduationCap, Mail, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCourseAccess } from "@/lib/permissions";
import { formatDate, initials, roleLabel } from "@/lib/utils";

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course } = await getCourseAccess(courseId);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: course.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Personas</h2>
        <p className="text-sm text-slate-500">
          Docente y estudiantes matriculados en {course.code}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            Docente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials(course.instructor.name)}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {course.instructor.name}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                {course.instructor.email}
              </p>
            </div>
            <Badge className="ml-auto">Profesor</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              Estudiantes
            </CardTitle>
            <CardDescription>
              {enrollments.length} personas matriculadas.
            </CardDescription>
          </div>
          <Badge variant="slate">{enrollments.length}</Badge>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-slate-500">
              Todavía no hay estudiantes en el curso.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {enrollments.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials(enrollment.user.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {enrollment.user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {enrollment.user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="slate">
                      {roleLabel(enrollment.role)}
                    </Badge>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Desde {formatDate(enrollment.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
