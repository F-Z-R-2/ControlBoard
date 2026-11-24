import { Megaphone, Trash2 } from "lucide-react";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "@/app/actions/announcements";
import { Alert } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import type { Announcement, User } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

type AnnouncementWithAuthor = Announcement & { author: User };

export default async function AnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const { error } = await searchParams;
  const { course, canManage } = await getCourseAccess(courseId);

  const announcements = await db.sql<AnnouncementWithAuthor>`
    SELECT a.*, to_jsonb(u) AS author
    FROM "Announcement" a
    JOIN "User" u ON u."id" = a."authorId"
    WHERE a."courseId" = ${course.id}
    ORDER BY a."createdAt" DESC
  `;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Anuncios</h2>
            <p className="text-sm text-slate-500">
              Comunicación oficial del curso.
            </p>
          </div>
          <Megaphone className="h-5 w-5 text-indigo-600" />
        </div>

        {error ? <Alert className="mt-4">{error}</Alert> : null}

        <div className="mt-4 space-y-3">
          {announcements.length === 0 ? (
            <Card className="p-8 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-900">
                No hay anuncios todavía
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {canManage
                  ? "Publica el primero desde el formulario."
                  : "Cuando el docente publique novedades aparecerán aquí."}
              </p>
            </Card>
          ) : (
            announcements.map((announcement) => (
              <Card key={announcement.id} className="overflow-hidden border-l-4 border-l-blue-800 transition-shadow hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-[17px] leading-6">{announcement.title}</CardTitle>
                    <CardDescription>
                      {announcement.author.name} ·{" "}
                      {formatDateTime(announcement.createdAt)}
                    </CardDescription>
                  </div>
                  {canManage ? (
                    <form action={deleteAnnouncementAction}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="id" value={announcement.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Eliminar anuncio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                    {announcement.body}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {canManage ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nuevo anuncio</CardTitle>
            <CardDescription>
              Se mostrará a todos los estudiantes del curso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAnnouncementAction} className="space-y-4">
              <input type="hidden" name="courseId" value={course.id} />
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  name="title"
                  maxLength={140}
                  placeholder="Recordatorio de entrega"
                  required
                />
              </div>
              <div>
                <Label htmlFor="body">Mensaje</Label>
                <Textarea
                  id="body"
                  name="body"
                  rows={6}
                  maxLength={4000}
                  placeholder="Escribe el anuncio..."
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Publicar anuncio
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
