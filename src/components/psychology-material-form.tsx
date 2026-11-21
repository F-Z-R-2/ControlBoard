"use client";

import { Loader2, Upload } from "lucide-react";
import { useActionState } from "react";
import { uploadPsychologyMaterialAction } from "@/app/actions/psychology-materials";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PsychologyMaterialForm() {
  const [state, formAction, pending] = useActionState(
    uploadPsychologyMaterialAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3 border-t pt-4">
      {state?.error ? <Alert>{state.error}</Alert> : null}
      {state?.success ? (
        <p role="status" className="text-sm text-green-800">
          {state.success}
        </p>
      ) : null}
      <div>
        <Label htmlFor="psychology-material-title">Nombre de la ficha</Label>
        <Input
          id="psychology-material-title"
          name="title"
          maxLength={140}
          placeholder="Ficha de hábitos de estudio"
          required
        />
      </div>
      <div>
        <Label htmlFor="psychology-material-file">Archivo PDF (máximo 4 MB)</Label>
        <Input
          id="psychology-material-file"
          name="file"
          type="file"
          accept=".pdf,application/pdf"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {pending ? "Subiendo..." : "Subir ficha"}
      </Button>
    </form>
  );
}
