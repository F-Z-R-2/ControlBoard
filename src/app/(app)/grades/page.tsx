import { ArrowRight, BarChart3, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAccessibleCourses } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Calificaciones" };

export default async function GradesOverviewPage() {
  const user = await requireUser();
  const isStudent = user.role === "STUDENT";
  const courses = await getAccessibleCourses(user);

  const assignments = await prisma.assignment.findMany({
    where: { courseId: { in: courses.map((course) => course.id) } },
    select: {
      id: true,
      courseId: true,
      points: true,
      submissions: {
        where: isStudent ? { studentId: user.id } : { grade: null },
        select: { grade: true },
      },
    },
  });

  const assignmentsByCourse = new Map<
    string,
    { points: number; submissions: { grade: number | null }[] }[]
  >();
  for (const assignment of assignments) {
    const current = assignmentsByCourse.get(assignment.courseId) ?? [];
    current.push({
      points: assignment.points,
      submissions: assignment.submissions,
    });
    assignmentsByCourse.set(assignment.courseId, current);
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Calificaciones"
        description={
          isStudent
            ? "Tu avance y promedio en cada curso."
            : "Estado de notas y entregas por calificar."
        }
      />
      <div className="px-4 py-6 sm:px-8">
        {courses.length === 0 ? (
          <Card className="p-10 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-[#c9c9c9]" />
            <p className="mt-3 font-medium text-[#242424]">
              Todavía no tienes cursos
            </p>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-left text-[11px] uppercase tracking-wider text-[#666]">
                    <th className="px-5 py-3 font-medium">Curso</th>
                    <th className="px-5 py-3 font-medium">Periodo</th>
                    <th className="px-5 py-3 font-medium">
                      {isStudent ? "Promedio" : "Por calificar"}
                    </th>
                    <th className="px-5 py-3 font-medium">
                      {isStudent ? "Entregas" : "Estudiantes"}
                    </th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {courses.map((course) => {
                    const courseAssignments =
                      assignmentsByCourse.get(course.id) ?? [];
                    const possible = courseAssignments.reduce(
                      (sum, assignment) => sum + assignment.points,
                      0,
                    );
                    const earned = courseAssignments.reduce(
                      (sum, assignment) =>
                        sum + (assignment.submissions[0]?.grade ?? 0),
                      0,
                    );
                    const graded = courseAssignments.filter(
                      (assignment) =>
                        assignment.submissions[0]?.grade !== null &&
                        assignment.submissions[0]?.grade !== undefined,
                    ).length;
                    const ungraded = courseAssignments.reduce(
                      (sum, assignment) => sum + assignment.submissions.length,
                      0,
                    );

                    return (
                      <tr key={course.id}>
                        <td className="px-5 py-4">
                          <p className="font-medium text-[#242424]">
                            {course.code}
                          </p>
                          <p className="text-xs text-[#666]">{course.title}</p>
                        </td>
                        <td className="px-5 py-4 text-[#555]">{course.term}</td>
                        <td className="px-5 py-4">
                          {isStudent ? (
                            <Badge variant="green">
                              {possible > 0
                                ? `${Math.round((earned / possible) * 100)}%`
                                : "—"}
                            </Badge>
                          ) : ungraded > 0 ? (
                            <Badge variant="amber">{ungraded} entregas</Badge>
                          ) : (
                            <Badge variant="slate">Al día</Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[#555]">
                          {isStudent
                            ? `${graded}/${courseAssignments.length}`
                            : course._count.enrollments}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/courses/${course.id}/grades`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#0b3ddb] hover:underline"
                          >
                            Ver notas
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {courses.length > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-[#666]">
            <BarChart3 className="h-4 w-4 text-[#0b3ddb]" />
            Los promedios se calculan con las tareas calificadas de cada curso.
          </p>
        ) : null}
      </div>
    </div>
  );
}
