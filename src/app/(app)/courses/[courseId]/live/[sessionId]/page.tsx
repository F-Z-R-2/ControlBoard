import { ArrowLeft, Download, Radio, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { endLiveSessionAction } from "@/app/actions/live";
import { LiveRoom } from "@/components/live-room";
import { RecordingControls } from "@/components/recording-controls";
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
import { db } from "@/lib/db";
import type { LiveSession, Recording } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

type LiveSessionWithRecordings = LiveSession & { recordings: Recording[] };

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { courseId, sessionId } = await params;
  const { course, canManage } = await getCourseAccess(courseId);

  const liveSessionRows = await db.sql<LiveSessionWithRecordings>`
    SELECT ls.*, COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r."startedAt" DESC)
      FROM "Recording" r
      WHERE r."liveSessionId" = ls."id"
    ), '[]'::jsonb) AS recordings
    FROM "LiveSession" ls
    WHERE ls."id" = ${sessionId} AND ls."courseId" = ${course.id}
    LIMIT 1
  `;

  const liveSession = liveSessionRows[0];

  if (!liveSession) notFound();

  const liveKitReady = Boolean(
    process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.NEXT_PUBLIC_LIVEKIT_URL,
  );
  const hasProcessing = liveSession.recordings.some(
    (recording) => recording.status === "PROCESSING",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/courses/${course.id}/live`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al aula virtual
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {liveSession.title}
            </h2>
            {liveSession.status === "LIVE" ? (
              <Badge variant="red">
                <Radio className="mr-1 h-3 w-3" />
                En vivo
              </Badge>
            ) : liveSession.status === "ENDED" ? (
              <Badge variant="slate">Finalizada</Badge>
            ) : (
              <Badge variant="amber">Programada</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {course.code} · {course.title}
            {liveSession.startedAt
              ? ` · Iniciada ${formatDateTime(liveSession.startedAt)}`
              : ""}
          </p>
        </div>

        {canManage && liveSession.status === "LIVE" ? (
          <div className="flex flex-wrap items-start gap-2">
            <RecordingControls
              sessionId={liveSession.id}
              hasProcessing={hasProcessing}
            />
            <form action={endLiveSessionAction}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="sessionId" value={liveSession.id} />
              <Button type="submit" variant="destructive" size="sm">
                Finalizar sesión
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      {!liveKitReady ? (
        <Alert variant="info">
          Configura <code>LIVEKIT_API_KEY</code>,{" "}
          <code>LIVEKIT_API_SECRET</code> y{" "}
          <code>NEXT_PUBLIC_LIVEKIT_URL</code> para habilitar esta sala.
        </Alert>
      ) : liveSession.status === "ENDED" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Video className="h-8 w-8 text-slate-300" />
            <p className="font-medium text-slate-900">Esta sesión ya terminó</p>
            <p className="max-w-md text-sm text-slate-500">
              Las grabaciones disponibles aparecen debajo. El docente puede
              crear una nueva aula virtual para continuar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="h-[72vh] min-h-[520px]">
          <LiveRoom
            roomName={liveSession.roomName}
            title={liveSession.title}
            leaveHref={`/courses/${course.id}/live`}
          />
        </div>
      )}

      {liveSession.recordings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Grabaciones</CardTitle>
            <CardDescription>
              Clases grabadas con LiveKit Egress y almacenadas en S3.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {liveSession.recordings.map((recording) => (
                <li
                  key={recording.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDateTime(recording.startedAt)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {recording.endedAt
                        ? `Finalizada ${formatDateTime(recording.endedAt)}`
                        : "Grabación en curso"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        recording.status === "READY"
                          ? "green"
                          : recording.status === "FAILED"
                            ? "red"
                            : "amber"
                      }
                    >
                      {recording.status === "READY"
                        ? "Lista"
                        : recording.status === "FAILED"
                          ? "Falló"
                          : "Procesando"}
                    </Badge>
                    {recording.status === "READY" && recording.url ? (
                      <a
                        href={recording.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 border border-[#c9c9c9] bg-white px-3 text-sm font-medium text-slate-700 hover:border-[#0b3ddb] hover:text-[#0b3ddb]"
                      >
                        <Download className="h-4 w-4" />
                        Abrir
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
