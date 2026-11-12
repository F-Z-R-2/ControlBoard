"use client";

import { Loader2, Circle, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function RecordingControls({
  sessionId,
  hasProcessing,
}: {
  sessionId: string;
  hasProcessing: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "start" | "stop") {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/livekit/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar la grabación");
      }
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Error al grabar la sesión",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={hasProcessing ? "destructive" : "outline"}
        size="sm"
        disabled={busy}
        onClick={() => run(hasProcessing ? "stop" : "start")}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasProcessing ? (
          <Square className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4 fill-current" />
        )}
        {busy
          ? "Procesando..."
          : hasProcessing
            ? "Detener grabación"
            : "Grabar sesión"}
      </Button>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
