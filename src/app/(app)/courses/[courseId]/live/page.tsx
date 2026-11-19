import { CalendarClock, Plus, Radio, Video } from "lucide-react";
import Link from "next/link";
import { createLiveSessionAction } from "@/app/actions/live";
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
import { db } from "@/lib/db";
import type { LiveSession } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

type LiveSessionWithCount = LiveSession & { _count: { recordings: number } };

export default async function LivePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const { error } = await searchParams;
  const { course, canManage } = await getCourseAccess(courseId);

  const sessions = await db.sql<LiveSessionWithCount>`
    SELECT ls.*, jsonb_build_object('recordings', (
      SELECT COUNT(*)::int FROM "Recording" r WHERE r."liveSessionId" = ls."id"
    )) AS "_count"
    FROM "LiveSession" ls
    WHERE ls."courseId" = ${course.id}
    ORDER BY ls."createdAt" DESC
  `;

  const liveKitReady = Boolean(
    process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.NEXT_PUBLIC_LIVEKIT_URL,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Aula virtual
            </h2>
            <p className="text-sm text-slate-500">
              Clases en vivo con video, chat, pantalla compartida y pizarra.
            </p>
          </div>
          <Video className="h-5 w-5 text-indigo-600" />
        </div>

        {error ? <Alert className="mt-4">{error}</Alert> : null}
        {!liveKitReady ? (
          <Alert variant="info" className="mt-4">
            Configura <code>LIVEKIT_API_KEY</code>,{" "}
            <code>LIVEKIT_API_SECRET</code> y{" "}
            <code>NEXT_PUBLIC_LIVEKIT_URL</code> para habilitar las salas de
            video.
          </Alert>
        ) : null}

        <div className="mt-4 space-y-3">
          {sessions.length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-900">
                No hay sesiones creadas
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {canManage
                  ? "Crea la primera aula virtual desde el formulario."
                  : "Cuando el docente programe una clase aparecerá aquí."}
              </p>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {session.status === "LIVE" ? (
                        <Badge variant="red">
                          <Radio className="mr-1 h-3 w-3" />
                          En vivo
                        </Badge>
                      ) : session.status === "ENDED" ? (
                        <Badge variant="slate">Finalizada</Badge>
                      ) : (
                        <Badge variant="amber">Programada</Badge>
                      )}
                      {session._count.recordings > 0 ? (
                        <Badge variant="green">
                          {session._count.recordings} grabación
                          {session._count.recordings === 1 ? "" : "es"}
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">
                      {session.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Creada el {formatDateTime(session.createdAt)}
                      {session.startedAt
                        ? ` · Iniciada ${formatDateTime(session.startedAt)}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/courses/${course.id}/live/${session.id}`}
                    className="inline-flex h-9 items-center justify-center border border-[#0b3ddb] bg-[#0b3ddb] px-3 text-sm font-medium text-white transition-colors hover:border-[#0932b5] hover:bg-[#0932b5]"
                  >
                    {session.status === "ENDED" ? "Ver sesión" : "Entrar"}
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {canManage ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Nueva sesión
            </CardTitle>
            <CardDescription>
              Se genera una sala de LiveKit al instante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createLiveSessionAction} className="space-y-4">
              <input type="hidden" name="courseId" value={course.id} />
              <div>
                <Label htmlFor="title">Título de la clase</Label>
                <Input
                  id="title"
                  name="title"
                  maxLength={140}
                  placeholder="Clase 1: Introducción"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <Video className="h-4 w-4" />
                Crear aula virtual
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
