"use client";

import { Trash2 } from "lucide-react";
import { deletePsychologyMaterialAction } from "@/app/actions/psychology-materials";
import { Button } from "@/components/ui/button";

export function PsychologyMaterialDeleteForm({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <form
      action={deletePsychologyMaterialAction}
      onSubmit={(event) => {
        if (!window.confirm(`¿Eliminar la ficha "${title}"? Esta acción no se puede deshacer.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="destructive"
        size="sm"
        aria-label={`Eliminar ${title}`}
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>
    </form>
  );
}
