"use client";

import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useRoomContext } from "@livekit/components-react";
import {
  RoomEvent,
  type DataPacket_Kind,
  type Participant,
} from "livekit-client";
import { Loader2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((module) => module.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando pizarra...
      </div>
    ),
  },
);

const TOPIC = "controlboard-whiteboard";

type SceneMessage =
  | { type: "scene"; elements: readonly OrderedExcalidrawElement[] }
  | { type: "request" };

export function Whiteboard({ onClose }: { onClose: () => void }) {
  const room = useRoomContext();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const elementsRef = useRef<readonly OrderedExcalidrawElement[]>([]);
  const lastRemoteRef = useRef("");
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encoderRef = useRef(new TextEncoder());

  const publish = useCallback(
    (message: SceneMessage) => {
      const payload = encoderRef.current.encode(JSON.stringify(message));
      void room.localParticipant.publishData(payload, {
        reliable: true,
        topic: TOPIC,
      });
    },
    [room],
  );

  const publishScene = useCallback(
    (elements: readonly OrderedExcalidrawElement[]) => {
      publish({ type: "scene", elements });
    },
    [publish],
  );

  useEffect(() => {
    const decoder = new TextDecoder();

    function handleData(
      payload: Uint8Array,
      _participant?: Participant,
      _kind?: DataPacket_Kind,
      topic?: string,
    ) {
      if (topic !== TOPIC) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as SceneMessage;

        if (message.type === "request") {
          if (elementsRef.current.length > 0) {
            publishScene(elementsRef.current);
          }
          return;
        }

        if (message.type === "scene" && apiRef.current) {
          lastRemoteRef.current = JSON.stringify(message.elements);
          apiRef.current.updateScene({ elements: message.elements });
        }
      } catch {
        // Ignore malformed whiteboard messages.
      }
    }

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, publishScene]);

  useEffect(() => {
    const timer = setTimeout(() => publish({ type: "request" }), 500);
    return () => clearTimeout(timer);
  }, [publish]);

  useEffect(
    () => () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    },
    [],
  );

  function handleChange(elements: readonly OrderedExcalidrawElement[]) {
    elementsRef.current = elements;

    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      if (JSON.stringify(elements) === lastRemoteRef.current) return;
      publishScene(elements);
    }, 150);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Pizarra colaborativa
          </p>
          <p className="text-xs text-slate-500">
            Los trazos se sincronizan con todos los participantes.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
          Cerrar
        </button>
      </div>
      <div className="relative flex-1">
        <Excalidraw
          langCode="es-ES"
          excalidrawAPI={(api) => {
            apiRef.current = api;
          }}
          onChange={(elements) => handleChange(elements)}
        />
      </div>
    </div>
  );
}
