"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import { submitAssignmentAction } from "@/app/actions/assignments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SubmitAssignmentForm({
  courseId,
  assignmentId,
  initialText,
}: {
  courseId: string;
  assignmentId: string;
  initialText?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitAssignmentAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {state?.error ? <Alert>{state.error}</Alert> : null}
      <div>
        <Label htmlFor="submission-text">Respuesta</Label>
        <Textarea
          id="submission-text"
          name="text"
          rows={6}
          defaultValue={initialText ?? ""}
          placeholder="Escribe tu respuesta o pega el enlace de tu repositorio..."
        />
      </div>
      <div>
        <Label htmlFor="submission-file">Archivo (opcional)</Label>
        <Input id="submission-file" name="file" type="file" />
        <p className="mt-1.5 text-xs text-slate-500">
          Si vuelves a entregar, la respuesta anterior se reemplaza.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {pending ? "Enviando..." : "Entregar tarea"}
      </Button>
    </form>
  );
}
