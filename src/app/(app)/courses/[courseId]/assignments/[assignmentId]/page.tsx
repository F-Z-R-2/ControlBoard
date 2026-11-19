import { CheckCircle2, Clock, FileText, Paperclip } from "lucide-react";
import { notFound } from "next/navigation";
import { gradeSubmissionAction } from "@/app/actions/assignments";
import { SubmitAssignmentForm } from "@/components/submit-assignment-form";
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
import type { Assignment, Enrollment, Submission, User } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

type SubmissionWithStudent = Submission & { student: User };
type AssignmentWithSubmissions = Assignment & { submissions: SubmissionWithStudent[] };
type EnrollmentWithUser = Enrollment & { user: User };

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { courseId, assignmentId } = await params;
  const { error, ok } = await searchParams;
  const { course, canManage, user } = await getCourseAccess(courseId);

  const assignmentRows = await db.sql<AssignmentWithSubmissions>`
    SELECT a.*, COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s."id",
        'assignmentId', s."assignmentId",
        'studentId', s."studentId",
        'text', s."text",
        'fileUrl', s."fileUrl",
        'submittedAt', s."submittedAt",
        'grade', s."grade",
        'feedback', s."feedback",
        'gradedAt', s."gradedAt",
        'student', to_jsonb(u)
      ) ORDER BY s."submittedAt" DESC)
      FROM "Submission" s
      JOIN "User" u ON u."id" = s."studentId"
      WHERE s."assignmentId" = a."id"
        AND (${canManage}::boolean OR s."studentId" = ${user.id})
    ), '[]'::jsonb) AS submissions
    FROM "Assignment" a
    WHERE a."id" = ${assignmentId} AND a."courseId" = ${course.id}
    LIMIT 1
  `;

  const assignment = assignmentRows[0];

  if (!assignment) notFound();

  const enrollments = canManage
    ? await db.sql<EnrollmentWithUser>`
        SELECT e.*, to_jsonb(u) AS "user"
        FROM "Enrollment" e
        JOIN "User" u ON u."id" = e."userId"
        WHERE e."courseId" = ${course.id} AND e."role"::text = 'STUDENT'
        ORDER BY u."name" ASC
      `
    : [];

  const submissionByStudent = new Map(
    assignment.submissions.map((submission) => [
      submission.studentId,
      submission,
    ]),
  );
  const ownSubmission = canManage ? null : assignment.submissions[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{assignment.points} pts</Badge>
              <Badge variant="slate">
                {assignment.dueAt
                  ? `Vence ${formatDateTime(assignment.dueAt)}`
                  : "Sin fecha límite"}
              </Badge>
            </div>
            <CardTitle className="mt-3 text-xl">{assignment.title}</CardTitle>
            <CardDescription>{course.code} · {course.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
              {assignment.description}
            </p>
          </CardContent>
        </Card>

        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Entregas y calificaciones</CardTitle>
              <CardDescription>
                {assignment.submissions.length} de {enrollments.length}{" "}
                estudiantes han entregado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? <Alert className="mb-4">{error}</Alert> : null}
              {enrollments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Todavía no hay estudiantes matriculados.
                </p>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => {
                    const submission = submissionByStudent.get(
                      enrollment.userId,
                    );

                    return (
                      <div
                        key={enrollment.id}
                        className="border border-[#e5e5e5] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {enrollment.user.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {enrollment.user.email}
                            </p>
                          </div>
                          {submission ? (
                            <Badge
                              variant={
                                submission.grade !== null ? "green" : "amber"
                              }
                            >
                              {submission.grade !== null
                                ? `${submission.grade}/${assignment.points}`
                                : "Sin calificar"}
                            </Badge>
                          ) : (
                            <Badge variant="red">Sin entrega</Badge>
                          )}
                        </div>

                        {submission ? (
                          <div className="mt-3 space-y-3">
                            {submission.text ? (
                              <p className="whitespace-pre-line border border-[#e5e5e5] bg-[#fafafa] p-3 text-sm text-slate-600">
                                {submission.text}
                              </p>
                            ) : null}
                            {submission.fileUrl ? (
                              <a
                                href={submission.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                              >
                                <Paperclip className="h-4 w-4" />
                                Ver archivo entregado
                              </a>
                            ) : null}
                            <p className="text-xs text-slate-400">
                              Entregada el {formatDateTime(submission.submittedAt)}
                            </p>
                            <form
                              action={gradeSubmissionAction}
                              className="grid gap-3 border border-[#e5e5e5] bg-[#fafafa] p-3 sm:grid-cols-[120px_1fr_auto] sm:items-end"
                            >
                              <input
                                type="hidden"
                                name="courseId"
                                value={course.id}
                              />
                              <input
                                type="hidden"
                                name="assignmentId"
                                value={assignment.id}
                              />
                              <input
                                type="hidden"
                                name="submissionId"
                                value={submission.id}
                              />
                              <div>
                                <Label htmlFor={`grade-${submission.id}`}>
                                  Nota
                                </Label>
                                <Input
                                  id={`grade-${submission.id}`}
                                  name="grade"
                                  type="number"
                                  min={0}
                                  max={assignment.points}
                                  step="0.5"
                                  defaultValue={
                                    submission.grade ?? undefined
                                  }
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor={`feedback-${submission.id}`}>
                                  Retroalimentación
                                </Label>
                                <Textarea
                                  id={`feedback-${submission.id}`}
                                  name="feedback"
                                  rows={2}
                                  defaultValue={submission.feedback ?? ""}
                                  placeholder="Comentario para el estudiante"
                                />
                              </div>
                              <Button type="submit" size="sm">
                                <CheckCircle2 className="h-4 w-4" />
                                Guardar
                              </Button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Tu entrega</CardTitle>
                <CardDescription>
                  {ownSubmission
                    ? `Enviada el ${formatDateTime(ownSubmission.submittedAt)}`
                    : "Aún no has entregado esta tarea."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ownSubmission ? (
                  <div className="space-y-3">
                    {ownSubmission.text ? (
                      <p className="whitespace-pre-line border border-[#e5e5e5] bg-[#fafafa] p-3 text-sm text-slate-600">
                        {ownSubmission.text}
                      </p>
                    ) : null}
                    {ownSubmission.fileUrl ? (
                      <a
                        href={ownSubmission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        Ver archivo entregado
                      </a>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 border border-[#e5e5e5] bg-[#fafafa] p-3">
                      <span className="text-sm text-slate-500">Nota:</span>
                      {ownSubmission.grade !== null ? (
                        <Badge variant="green">
                          {ownSubmission.grade}/{assignment.points}
                        </Badge>
                      ) : (
                        <Badge variant="amber">Pendiente de calificar</Badge>
                      )}
                      {ownSubmission.feedback ? (
                        <p className="w-full text-sm text-slate-600">
                          {ownSubmission.feedback}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    Usa el formulario para subir tu respuesta.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {ownSubmission ? "Volver a entregar" : "Entregar tarea"}
                </CardTitle>
                <CardDescription>
                  Puedes reemplazar tu entrega antes de la fecha límite.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ok ? (
                  <Alert variant="success" className="mb-4">
                    Entrega guardada correctamente.
                  </Alert>
                ) : null}
                <SubmitAssignmentForm
                  courseId={course.id}
                  assignmentId={assignment.id}
                  initialText={ownSubmission?.text}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Curso</dt>
              <dd className="font-medium text-slate-900">{course.code}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Puntos</dt>
              <dd className="font-medium text-slate-900">
                {assignment.points}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Fecha límite</dt>
              <dd className="text-right font-medium text-slate-900">
                {assignment.dueAt
                  ? formatDateTime(assignment.dueAt)
                  : "Sin fecha"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Entregas</dt>
              <dd className="font-medium text-slate-900">
                {assignment.submissions.length}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
