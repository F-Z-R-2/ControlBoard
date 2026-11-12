import { BarChart3 } from "lucide-react";
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

export default async function GradesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course, canManage, user } = await getCourseAccess(courseId);

  if (!canManage) {
    const assignments = await prisma.assignment.findMany({
      where: { courseId: course.id },
      include: {
        submissions: {
          where: { studentId: user.id },
          select: { grade: true, feedback: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const possible = assignments.reduce(
      (sum, assignment) => sum + assignment.points,
      0,
    );
    const earned = assignments.reduce(
      (sum, assignment) => sum + (assignment.submissions[0]?.grade ?? 0),
      0,
    );

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mis notas</h2>
          <p className="text-sm text-slate-500">
            Calificaciones registradas en {course.code}.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Nota acumulada del curso.</CardDescription>
            </div>
            <Badge variant="green">
              {possible > 0 ? Math.round((earned / possible) * 100) : 0}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Tarea</th>
                    <th className="pb-3 pr-4 font-medium">Puntos</th>
                    <th className="pb-3 pr-4 font-medium">Nota</th>
                    <th className="pb-3 font-medium">Retroalimentación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((assignment) => {
                    const submission = assignment.submissions[0];
                    return (
                      <tr key={assignment.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {assignment.title}
                        </td>
                        <td className="py-3 pr-4 text-slate-500">
                          {assignment.points}
                        </td>
                        <td className="py-3 pr-4">
                          {submission?.grade !== null &&
                          submission?.grade !== undefined ? (
                            <Badge variant="green">
                              {submission.grade}/{assignment.points}
                            </Badge>
                          ) : submission ? (
                            <Badge variant="amber">Sin calificar</Badge>
                          ) : (
                            <Badge variant="red">Sin entrega</Badge>
                          )}
                        </td>
                        <td className="py-3 text-slate-500">
                          {submission?.feedback ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {assignments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-slate-500"
                      >
                        Aún no hay tareas calificadas.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [enrollments, assignments] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: course.id, role: "STUDENT" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.assignment.findMany({
      where: { courseId: course.id },
      include: {
        submissions: {
          select: { studentId: true, grade: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const gradesByStudent = new Map<string, Map<string, number | null>>();
  for (const assignment of assignments) {
    for (const submission of assignment.submissions) {
      const current =
        gradesByStudent.get(submission.studentId) ??
        new Map<string, number | null>();
      current.set(assignment.id, submission.grade);
      gradesByStudent.set(submission.studentId, current);
    }
  }

  const possible = assignments.reduce(
    (sum, assignment) => sum + assignment.points,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Libro de notas</h2>
          <p className="text-sm text-slate-500">
            Consolidado de {enrollments.length} estudiantes y{" "}
            {assignments.length} tareas.
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-indigo-600" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Estudiante</th>
                  {assignments.map((assignment) => (
                    <th
                      key={assignment.id}
                      className="pb-3 pr-4 font-medium"
                      title={`${assignment.title} (${assignment.points} pts)`}
                    >
                      {assignment.title.length > 18
                        ? `${assignment.title.slice(0, 18)}…`
                        : assignment.title}
                    </th>
                  ))}
                  <th className="pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enrollment) => {
                  const studentGrades = gradesByStudent.get(enrollment.userId);
                  const earned = assignments.reduce(
                    (sum, assignment) =>
                      sum + (studentGrades?.get(assignment.id) ?? 0),
                    0,
                  );

                  return (
                    <tr key={enrollment.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">
                          {enrollment.user.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {enrollment.user.email}
                        </p>
                      </td>
                      {assignments.map((assignment) => {
                        const grade = studentGrades?.get(assignment.id);
                        return (
                          <td
                            key={assignment.id}
                            className="py-3 pr-4 text-slate-600"
                          >
                            {grade === null || grade === undefined ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              `${grade}/${assignment.points}`
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3">
                        <Badge variant="slate">
                          {earned}/{possible} (
                          {possible > 0
                            ? Math.round((earned / possible) * 100)
                            : 0}
                          %)
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {enrollments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={assignments.length + 2}
                      className="py-6 text-center text-slate-500"
                    >
                      No hay estudiantes matriculados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
