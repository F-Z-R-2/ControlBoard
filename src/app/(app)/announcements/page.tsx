import { isAdmin as isAdministrator } from "@/lib/roles";
import { ArrowRight, Megaphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { Announcement, Course, User } from "@/lib/db-types";
import { getAccessibleCourses } from "@/lib/courses";
import { requireUser } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Anuncios" };

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const courses = await getAccessibleCourses(user);
  const courseIds = courses.map((course) => course.id);

  const placeholders = courseIds.map((_, index) => `$${index + 1}`).join(", ");
  const announcements: (Announcement & { course: Course; author: User })[] = courseIds.length
    ? await db.query(
        `SELECT a.*, to_jsonb(c) AS "course", to_jsonb(u) AS "author"
         FROM "Announcement" a
         JOIN "Course" c ON c."id" = a."courseId"
         JOIN "User" u ON u."id" = a."authorId"
         WHERE a."courseId" IN (${placeholders})
         ORDER BY a."createdAt" DESC`,
        courseIds,
      )
    : [];

  const canManage = user.role === "INSTRUCTOR" || isAdministrator(user.role);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Anuncios"
        description="Todas las novedades de tus cursos en un solo lugar."
        actions={
          canManage ? (
            <Link
              href="/courses"
              className="flex items-center gap-2 border border-[#c8c8c8] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
            >
              <Megaphone className="h-4 w-4" />
              Publicar anuncio
            </Link>
          ) : null
        }
      />
      <div className="px-4 py-6 sm:px-8">
        {announcements.length === 0 ? (
          <Card className="p-10 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-[#c9c9c9]" />
            <p className="mt-3 font-medium text-[#242424]">
              No hay anuncios publicados
            </p>
            <p className="mt-1 text-sm text-[#666]">
              Cuando tus docentes publiquen novedades aparecerán aquí.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="slate">{announcement.course.code}</Badge>
                        <span className="text-[11px] text-[#888]">
                          {formatDateTime(announcement.createdAt)}
                        </span>
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-[#242424]">
                        {announcement.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#666]">
                        {announcement.author.name} · {announcement.course.title}
                      </p>
                    </div>
                    <Link
                      href={`/courses/${announcement.courseId}/announcements`}
                      className="flex items-center gap-1 text-xs font-medium text-[#0b3ddb] hover:underline"
                    >
                      Abrir curso
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#555]">
                    {announcement.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
