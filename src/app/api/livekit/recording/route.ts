import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/permissions";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  action: z.enum(["start", "stop"]),
});

function egressClient() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const host = (
    process.env.LIVEKIT_URL ??
    process.env.NEXT_PUBLIC_LIVEKIT_URL ??
    ""
  ).replace(/^ws/, "http");

  if (!apiKey || !apiSecret || !host) return null;
  return new EgressClient(host, apiKey, apiSecret);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: { course: true },
  });

  if (!liveSession) {
    return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const isManager =
    liveSession.course.instructorId === user.id ||
    isAdmin(user.role);
  if (!isManager) {
    return Response.json({ error: "Solo el docente puede grabar" }, { status: 403 });
  }

  const client = egressClient();
  if (!client) {
    return Response.json(
      { error: "LiveKit no está configurado" },
      { status: 503 },
    );
  }

  if (parsed.data.action === "start") {
    if (liveSession.status !== "LIVE") {
      return Response.json(
        { error: "La sesión debe estar en vivo para grabar" },
        { status: 409 },
      );
    }

    const accessKey = process.env.LIVEKIT_S3_ACCESS_KEY;
    const secret = process.env.LIVEKIT_S3_SECRET;
    const bucket = process.env.LIVEKIT_S3_BUCKET;
    const region = process.env.LIVEKIT_S3_REGION;

    if (!accessKey || !secret || !bucket || !region) {
      return Response.json(
        {
          error:
            "Configura LIVEKIT_S3_ACCESS_KEY, LIVEKIT_S3_SECRET, LIVEKIT_S3_BUCKET y LIVEKIT_S3_REGION para grabar",
        },
        { status: 503 },
      );
    }

    const existing = await prisma.recording.findFirst({
      where: {
        liveSessionId: liveSession.id,
        status: "PROCESSING",
      },
    });
    if (existing) {
      return Response.json(
        { error: "Ya hay una grabación en curso" },
        { status: 409 },
      );
    }

    const endpoint = process.env.LIVEKIT_S3_ENDPOINT;
    const filepath = `recordings/${liveSession.roomName}/${Date.now()}.mp4`;

    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey,
          secret,
          bucket,
          region,
          endpoint,
          forcePathStyle:
            process.env.LIVEKIT_S3_FORCE_PATH_STYLE === "true",
        }),
      },
    });

    const info = await client.startRoomCompositeEgress(
      liveSession.roomName,
      output,
    );

    const url = endpoint
      ? `${endpoint.replace(/\/$/, "")}/${bucket}/${filepath}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${filepath}`;

    await prisma.recording.create({
      data: {
        liveSessionId: liveSession.id,
        egressId: info.egressId,
        url,
      },
    });

    return Response.json({ ok: true, egressId: info.egressId });
  }

  const recording = await prisma.recording.findFirst({
    where: { liveSessionId: liveSession.id, status: "PROCESSING" },
    orderBy: { startedAt: "desc" },
  });

  if (!recording) {
    return Response.json(
      { error: "No hay grabaciones en curso" },
      { status: 404 },
    );
  }

  await client.stopEgress(recording.egressId);
  await prisma.recording.update({
    where: { id: recording.id },
    data: { status: "READY", endedAt: new Date() },
  });

  return Response.json({ ok: true });
}
