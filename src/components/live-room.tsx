"use client";

import {
  Chat,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PenLine,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Whiteboard } from "@/components/whiteboard";
import { Alert } from "@/components/ui/alert";
import { cn, initials } from "@/lib/utils";

type Connection = {
  token: string;
  serverUrl: string;
};

export function LiveRoom({
  roomName,
  title,
  leaveHref,
}: {
  roomName: string;
  title: string;
  leaveHref: string;
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
      options={{ adaptiveStream: true, dynacast: true }}
      className="h-full"
    >
      <RoomAudioRenderer />
      <RoomView title={title} leaveHref={leaveHref} />
    </LiveKitRoom>
  );
}

type SidePanel = "chat" | "people" | null;

function RoomView({ title, leaveHref }: { title: string; leaveHref: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const participants = useParticipants();
  const [panel, setPanel] = useState<SidePanel>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  function togglePanel(next: Exclude<SidePanel, null>) {
    setPanel((current) => (current === next ? null : next));
  }

  function leaveRoom() {
    void room.disconnect();
    router.push(leaveHref);
  }

  return (
    <div
      data-lk-theme="default"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/60 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-white">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate">{title}</span>
          <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            En vivo
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {participants.length}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 bg-slate-950 p-3">
          <GridLayout tracks={tracks} className="h-full">
            <ParticipantTile className="overflow-hidden rounded-xl border border-white/10 bg-slate-900" />
          </GridLayout>
        </div>

        {panel === "people" ? (
          <PeoplePanel
            participants={participants}
            onClose={() => setPanel(null)}
          />
        ) : null}

        {panel === "chat" ? <ChatPanel onClose={() => setPanel(null)} /> : null}
      </div>

      <footer className="flex justify-center border-t border-white/10 bg-slate-900/60 px-3 py-3">
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/90 p-1.5 shadow-xl shadow-black/30 backdrop-blur">
          <DockButton
            label={isMicrophoneEnabled ? "Silenciar" : "Activar micrófono"}
            muted={!isMicrophoneEnabled}
            onClick={() =>
              void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
            }
          >
            {isMicrophoneEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </DockButton>

          <DockButton
            label={isCameraEnabled ? "Apagar cámara" : "Encender cámara"}
            muted={!isCameraEnabled}
            onClick={() =>
              void localParticipant.setCameraEnabled(!isCameraEnabled)
            }
          >
            {isCameraEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </DockButton>

          <DockButton
            label={isScreenShareEnabled ? "Detener pantalla" : "Compartir pantalla"}
            active={isScreenShareEnabled}
            onClick={() =>
              void localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
            }
          >
            <MonitorUp className="h-5 w-5" />
          </DockButton>

          <span className="mx-1 h-7 w-px bg-white/10" />

          <DockButton
            label="Chat"
            active={panel === "chat"}
            onClick={() => togglePanel("chat")}
          >
            <MessageSquare className="h-5 w-5" />
          </DockButton>

          <DockButton
            label="Personas"
            active={panel === "people"}
            badge={participants.length}
            onClick={() => togglePanel("people")}
          >
            <Users className="h-5 w-5" />
          </DockButton>

          <DockButton
            label="Pizarra"
            active={boardOpen}
            onClick={() => setBoardOpen(true)}
          >
            <PenLine className="h-5 w-5" />
          </DockButton>

          <span className="mx-1 h-7 w-px bg-white/10" />

          <DockButton label="Salir de la clase" danger onClick={leaveRoom}>
            <PhoneOff className="h-5 w-5" />
          </DockButton>
        </div>
      </footer>

      {boardOpen ? <Whiteboard onClose={() => setBoardOpen(false)} /> : null}
    </div>
  );
}

function DockButton({
  label,
  children,
  onClick,
  active = false,
  muted = false,
  danger = false,
  badge,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  muted?: boolean;
  danger?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "group relative inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-medium text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        "hover:bg-white/10 hover:text-white",
        active && "bg-white text-slate-900 hover:bg-white hover:text-slate-900",
        muted && "bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:text-red-200",
        danger &&
          "bg-red-500 text-white hover:bg-red-600 hover:text-white focus-visible:ring-red-300/50",
      )}
    >
      {children}
      <span className="hidden text-xs lg:inline">{label}</span>
      {badge !== undefined ? (
        <span
          className={cn(
            "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
            active ? "bg-slate-900/10 text-slate-700" : "bg-white/10 text-slate-200",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function PeoplePanel({
  participants,
  onClose,
}: {
  participants: ReturnType<typeof useParticipants>;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-xs flex-col border-l border-white/10 bg-slate-900 sm:static">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Personas</p>
          <p className="text-xs text-slate-400">
            {participants.length} en la sala
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de personas"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {participants.map((participant) => {
          const name = participant.name || "Participante";
          return (
            <li
              key={participant.identity}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                {initials(name) || "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {name}
                  {participant.isLocal ? (
                    <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                      (Tú)
                    </span>
                  ) : null}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {participant.isLocal ? "Tú" : "Conectado"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {participant.isMicrophoneEnabled ? (
                  <Mic className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <MicOff className="h-3.5 w-3.5 text-slate-500" />
                )}
                {participant.isCameraEnabled ? (
                  <Video className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <VideoOff className="h-3.5 w-3.5 text-slate-500" />
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-white/10 bg-white sm:static">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Chat de la clase</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar chat"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Chat className="h-full [&_.lk-chat-header]:hidden" />
      </div>
    </aside>
  );
}
