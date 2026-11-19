import { AccessToken } from "livekit-server-sdk";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { isAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import type { Course, Enrollment, LiveSession } from "@/lib/db-types";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const roomName = request.nextUrl.searchParams.get("room");
  if (!roomName) {
    return Response.json({ error: "Falta el parámetro room" }, { status: 400 });
  }

  const sessions = await db.sql<LiveSession & { course: Course }>`
    SELECT ls.*, to_jsonb(c) AS "course"
    FROM "LiveSession" ls
    JOIN "Course" c ON c."id" = ls."courseId"
    WHERE ls."roomName" = ${roomName}
    LIMIT 1
  `;
  const sessionRow = sessions[0];

  if (!sessionRow) {
    return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const enrollments = await db.sql<Pick<Enrollment, "id">>`
    SELECT "id" FROM "Enrollment" WHERE "courseId" = ${sessionRow.courseId} AND "userId" = ${user.id}
  `;
  const liveSession = {
    ...sessionRow,
    course: { ...sessionRow.course, enrollments },
  };

  const isManager =
    liveSession.course.instructorId === user.id ||
    isAdmin(user.role);
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
    identity: `${user.id}:${crypto.randomUUID()}`,
    name: user.name ?? user.email ?? "Usuario",
    ttl: "2h",
    metadata: JSON.stringify({ userId: user.id }),
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  if (liveSession.status === "SCHEDULED") {
    await db.sql`
      UPDATE "LiveSession" SET "status" = 'LIVE', "startedAt" = NOW()
      WHERE "id" = ${liveSession.id}
    `;
  }

  return Response.json({
    token: await token.toJwt(),
    serverUrl,
    isManager,
  });
}
