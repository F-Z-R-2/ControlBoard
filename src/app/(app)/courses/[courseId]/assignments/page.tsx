import { ClipboardList, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { createAssignmentAction } from "@/app/actions/assignments";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import type { Assignment, Submission, User } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

type AssignmentWithSubmissions = Assignment & {
  submissions: Array<Pick<Submission, "id" | "grade" | "studentId">>;
  _count: { submissions: number };
};

export default async function AssignmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const { error } = await searchParams;
  const { course, canManage, user } = await getCourseAccess(courseId);

  const assignments = await db.sql<AssignmentWithSubmissions>`
    SELECT a.*,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', s."id",
          'grade', s."grade",
          'studentId', s."studentId"
        ))
        FROM "Submission" s
        WHERE s."assignmentId" = a."id"
          AND (${canManage}::boolean OR s."studentId" = ${user.id})
      ), '[]'::jsonb) AS submissions,
      jsonb_build_object('submissions', (
        SELECT COUNT(*)::int FROM "Submission" sc WHERE sc."assignmentId" = a."id"
      )) AS "_count"
    FROM "Assignment" a
    WHERE a."courseId" = ${course.id}
    ORDER BY a."createdAt" DESC
  `;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tareas</h2>
            <p className="text-sm text-slate-500">
              Consignas, entregas y calificaciones.
            </p>
          </div>
          <ClipboardList className="h-5 w-5 text-indigo-600" />
        </div>

        {error ? <Alert className="mt-4">{error}</Alert> : null}

        <div className="mt-4 space-y-3">
          {assignments.length === 0 ? (
            <Card className="p-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-900">
                No hay tareas todavía
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {canManage
                  ? "Publica la primera tarea desde el formulario."
                  : "Cuando el docente publique tareas aparecerán aquí."}
              </p>
            </Card>
          ) : (
            assignments.map((assignment) => {
              const ownSubmission = !canManage
                ? assignment.submissions[0]
                : null;
              const gradedCount = assignment.submissions.filter(
                (submission) => submission.grade !== null,
              ).length;

              return (
                <Link
                  key={assignment.id}
                  href={`/courses/${course.id}/assignments/${assignment.id}`}
                  className="block"
                >
                  <Card className="p-5 transition-colors hover:border-indigo-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {assignment.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {assignment.dueAt
                            ? `Vence ${formatDateTime(assignment.dueAt)}`
                            : "Sin fecha límite"}
                          <span className="mx-1">·</span>
                          {assignment.points} pts
                        </p>
                      </div>
                      {canManage ? (
                        <Badge variant="slate">
                          {assignment._count.submissions} entregas
                        </Badge>
                      ) : ownSubmission ? (
                        <Badge
                          variant={
                            ownSubmission.grade !== null ? "green" : "amber"
                          }
                        >
                          {ownSubmission.grade !== null
                            ? `${ownSubmission.grade}/${assignment.points}`
                            : "Enviada"}
                        </Badge>
                      ) : (
                        <Badge variant="red">Pendiente</Badge>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                      {assignment.description}
                    </p>
                    {canManage ? (
                      <p className="mt-3 text-xs text-slate-400">
                        {gradedCount} de {assignment._count.submissions}{" "}
                        calificadas
                      </p>
                    ) : null}
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {canManage ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Nueva tarea
            </CardTitle>
            <CardDescription>
              Define la consigna, fecha y puntaje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAssignmentAction} className="space-y-4">
              <input type="hidden" name="courseId" value={course.id} />
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  name="title"
                  maxLength={140}
                  placeholder="Práctica 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Consigna</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={5}
                  maxLength={8000}
                  placeholder="Describe lo que debe hacer el estudiante..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dueAt">Fecha límite</Label>
                  <Input id="dueAt" name="dueAt" type="datetime-local" />
                </div>
                <div>
                  <Label htmlFor="points">Puntos</Label>
                  <Input
                    id="points"
                    name="points"
                    type="number"
                    min={1}
                    max={1000}
                    defaultValue={100}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Publicar tarea
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
