import { get } from "@vercel/blob";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { PsychologyMaterial } from "@/lib/db-types";
import { requireUser } from "@/lib/permissions";
import { canViewPsychologyMaterials } from "@/lib/psychology";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  const user = await requireUser();
  if (!canViewPsychologyMaterials(user.role)) notFound();

  const { materialId } = await params;
  const records = await db.sql<Pick<PsychologyMaterial, "title" | "url">>`
    SELECT "title", "url" FROM "PsychologyMaterial" WHERE "id" = ${materialId} LIMIT 1
  `;
  const material = records[0];
  if (!material) notFound();

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new Response("No se pudo descargar la ficha: falta configurar Blob", {
      status: 503,
    });
  }

  const blob = await get(material.url, { access: "private", token });
  if (!blob) notFound();

  return new Response(blob.stream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="ficha.pdf"; filename*=UTF-8''${encodeURIComponent(`${material.title}.pdf`)}`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
