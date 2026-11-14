import { AccessToken } from "livekit-server-sdk";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const roomName = request.nextUrl.searchParams.get("room");
  if (!roomName) {
    return Response.json({ error: "Falta el parámetro room" }, { status: 400 });
  }

  const liveSession = await prisma.liveSession.findUnique({
    where: { roomName },
    include: {
      course: {
        include: {
          enrollments: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!liveSession) {
    return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const isManager =
    liveSession.course.instructorId === session.user.id ||
    session.user.role === "ADMIN";
  const enrolled = liveSession.course.enrollments.length > 0;

  if (!isManager && !enrolled) {
    return Response.json({ error: "No perteneces a este curso" }, { status: 403 });
  }

  if (liveSession.status === "ENDED") {
    return Response.json(
      { error: "La sesión ya finalizó" },
      { status: 409 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return Response.json(
      { error: "LiveKit no está configurado en el servidor" },
      { status: 503 },
    );
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: `${session.user.id}:${crypto.randomUUID()}`,
    name: session.user.name ?? session.user.email ?? "Usuario",
    ttl: "2h",
    metadata: JSON.stringify({ userId: session.user.id }),
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  if (liveSession.status === "SCHEDULED") {
    await prisma.liveSession.update({
      where: { id: liveSession.id },
      data: { status: "LIVE", startedAt: new Date() },
    });
  }

  return Response.json({
    token: await token.toJwt(),
    serverUrl,
    isManager,
  });
}
