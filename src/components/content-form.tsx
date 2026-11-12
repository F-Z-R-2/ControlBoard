"use client";

import { Loader2, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { createContentAction } from "@/app/actions/content";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ContentForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(createContentAction, null);
  const [type, setType] = useState("PAGE");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      {state?.error ? <Alert>{state.error}</Alert> : null}
      <div>
        <Label htmlFor="content-title">Título</Label>
        <Input
          id="content-title"
          name="title"
          maxLength={140}
          placeholder="Guía de la semana 1"
          required
        />
      </div>
      <div>
        <Label htmlFor="content-type">Tipo</Label>
        <Select
          id="content-type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="PAGE">Página de texto</option>
          <option value="LINK">Enlace externo</option>
          <option value="FILE">Archivo</option>
        </Select>
      </div>
      {type === "PAGE" ? (
        <div>
          <Label htmlFor="content-body">Contenido</Label>
          <Textarea
            id="content-body"
            name="body"
            rows={7}
            maxLength={8000}
            placeholder="Escribe el contenido de la página..."
          />
        </div>
      ) : null}
      {type === "LINK" ? (
        <div>
          <Label htmlFor="content-url">URL</Label>
          <Input
            id="content-url"
            name="url"
            type="url"
            placeholder="https://..."
          />
        </div>
      ) : null}
      {type === "FILE" ? (
        <div>
          <Label htmlFor="content-file">Archivo</Label>
          <Input id="content-file" name="file" type="file" />
          <p className="mt-1.5 text-xs text-slate-500">
            Requiere Vercel Blob configurado. Máximo 4.5 MB en Vercel.
          </p>
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {pending ? "Guardando..." : "Agregar contenido"}
      </Button>
    </form>
  );
}
