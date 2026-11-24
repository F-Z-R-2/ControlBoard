import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import type { Assignment, Enrollment, Submission, User } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";

type AssignmentWithOwnGrades = Assignment & {
  submissions: Array<Pick<Submission, "grade" | "feedback">>;
};
type EnrollmentWithUser = Enrollment & { user: User };
type AssignmentWithSubmissions = Assignment & {
  submissions: Array<Pick<Submission, "studentId" | "grade">>;
};

export default async function GradesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course, canManage, user } = await getCourseAccess(courseId);

  if (!canManage) {
    const assignments = await db.sql<AssignmentWithOwnGrades>`
      SELECT a.*, COALESCE((
        SELECT jsonb_agg(jsonb_build_object('grade', s."grade", 'feedback', s."feedback"))
        FROM "Submission" s
        WHERE s."assignmentId" = a."id" AND s."studentId" = ${user.id}
      ), '[]'::jsonb) AS submissions
      FROM "Assignment" a
      WHERE a."courseId" = ${course.id}
      ORDER BY a."createdAt" ASC
    `;

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
    db.sql<EnrollmentWithUser>`
      SELECT e.*, to_jsonb(u) AS "user"
      FROM "Enrollment" e
      JOIN "User" u ON u."id" = e."userId"
      WHERE e."courseId" = ${course.id} AND e."role"::text = 'STUDENT'
      ORDER BY u."name" ASC
    `,
    db.sql<AssignmentWithSubmissions>`
      SELECT a.*, COALESCE((
        SELECT jsonb_agg(jsonb_build_object('studentId', s."studentId", 'grade', s."grade"))
        FROM "Submission" s
        WHERE s."assignmentId" = a."id"
      ), '[]'::jsonb) AS submissions
      FROM "Assignment" a
      WHERE a."courseId" = ${course.id}
      ORDER BY a."createdAt" ASC
    `,
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
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Estudiante</th>
                  {assignments.map((assignment) => (
                    <th
                      key={assignment.id}
                      className="max-w-36 px-3 py-3 font-semibold"
                      title={`${assignment.title} (${assignment.points} pts)`}
                    >
                      {assignment.title.length > 18
                        ? `${assignment.title.slice(0, 18)}…`
                        : assignment.title}
                    </th>
                  ))}
                  <th className="sticky right-0 bg-slate-50 px-4 py-3 font-semibold">Total</th>
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
                    <tr key={enrollment.id} className="group transition-colors hover:bg-blue-50/40">
                      <td className="sticky left-0 border-r border-slate-100 bg-white px-4 py-3 group-hover:bg-blue-50/40">
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
                            className="border-r border-slate-50 px-3 py-3 text-center tabular-nums text-slate-700"
                          >
                            {grade === null || grade === undefined ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              `${grade}/${assignment.points}`
                            )}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 border-l border-slate-100 bg-white px-4 py-3">
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
