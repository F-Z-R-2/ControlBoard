import { ExternalLink, FileText, FolderOpen, Link2, Trash2 } from "lucide-react";
import { deleteContentAction } from "@/app/actions/content";
import { ContentForm } from "@/components/content-form";
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
import type { ContentItem, User } from "@/lib/db-types";
import { getCourseAccess } from "@/lib/permissions";

type ContentItemWithAuthor = ContentItem & { author: User };

const typeLabels = {
  PAGE: "Página",
  LINK: "Enlace",
  FILE: "Archivo",
} as const;

export default async function ContentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course, canManage } = await getCourseAccess(courseId);

  const items = await db.sql<ContentItemWithAuthor>`
    SELECT c.*, to_jsonb(u) AS author
    FROM "ContentItem" c
    JOIN "User" u ON u."id" = c."authorId"
    WHERE c."courseId" = ${course.id}
    ORDER BY c."position" ASC, c."createdAt" ASC
  `;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Contenido</h2>
            <p className="text-sm text-slate-500">
              Material de estudio publicado en el curso.
            </p>
          </div>
          <FolderOpen className="h-5 w-5 text-indigo-600" />
        </div>

        <div className="mt-4 space-y-3">
          {items.length === 0 ? (
            <Card className="p-8 text-center">
              <FolderOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-900">
                Todavía no hay contenido
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {canManage
                  ? "Publica una página, un enlace o un archivo."
                  : "El docente publicará material próximamente."}
              </p>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#e5e5e5] bg-[#fafafa] text-slate-500">
                      {item.type === "LINK" ? (
                        <Link2 className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>
                        {item.author.name} · {typeLabels[item.type]}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="slate">{typeLabels[item.type]}</Badge>
                    {canManage ? (
                      <form action={deleteContentAction}>
                        <input
                          type="hidden"
                          name="courseId"
                          value={course.id}
                        />
                        <input type="hidden" name="id" value={item.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600"
                          aria-label="Eliminar contenido"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {item.type === "PAGE" ? (
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                      {item.body}
                    </p>
                  ) : null}
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir recurso
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {canManage ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Agregar contenido</CardTitle>
            <CardDescription>
              Publica material para todo el curso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentForm courseId={course.id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
