"use client";

import {
  Chat,
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useRoomContext,
} from "@livekit/components-react";
import { Loader2, MessageSquare, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Whiteboard } from "@/components/whiteboard";
import { Alert } from "@/components/ui/alert";

type Connection = {
  token: string;
  serverUrl: string;
};

export function LiveRoom({
  roomName,
  title,
}: {
  roomName: string;
  title: string;
}) {
  const router = useRouter();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const response = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomName)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          token?: string;
          serverUrl?: string;
          error?: string;
        };

        if (!response.ok || !data.token || !data.serverUrl) {
          throw new Error(data.error ?? "No se pudo entrar a la sala");
        }

        if (!cancelled) {
          setConnection({ token: data.token, serverUrl: data.serverUrl });
          router.refresh();
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo conectar a la sala",
          );
        }
      }
    }

    void connect();
    return () => {
      cancelled = true;
    };
  }, [roomName, router]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white p-6">
        <Alert>{error}</Alert>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="flex h-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Conectando al aula virtual...
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={connection.token}
      serverUrl={connection.serverUrl}
      connect
      audio
      video
      className="h-full"
    >
      <RoomAudioRenderer />
      <RoomView title={title} />
    </LiveKitRoom>
  );
}

function RoomView({ title }: { title: string }) {
  const room = useRoomContext();
  const [chatOpen, setChatOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);

  return (
    <div
      data-lk-theme="default"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
          <span className="truncate">{title}</span>
          <span className="shrink-0 text-xs font-normal text-slate-400">
            {room.numParticipants} en la sala
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
              chatOpen
                ? "bg-white text-slate-900"
                : "border border-white/20 text-white hover:bg-white/10"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setBoardOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-xs font-medium text-white transition-colors hover:bg-white/10"
          >
            <PenLine className="h-4 w-4" />
            Pizarra
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <VideoConference className="h-full" />
        </div>
        {chatOpen ? (
          <aside className="absolute inset-y-0 right-0 z-20 w-full max-w-sm border-l border-slate-200 bg-white sm:static sm:z-auto">
            <Chat className="h-full" />
          </aside>
        ) : null}
      </div>

      {boardOpen ? <Whiteboard onClose={() => setBoardOpen(false)} /> : null}
    </div>
  );
}
