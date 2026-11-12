import { BookOpen, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CourseTabs } from "@/components/course-tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCourseAccess } from "@/lib/permissions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  const { course } = await getCourseAccess(courseId);
  return { title: `${course.code} · ${course.title}` };
}

export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { course, canManage } = await getCourseAccess(courseId);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[#dedede] bg-white">
        <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#666] hover:text-[#0b3ddb]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Cursos
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{course.code}</Badge>
              <Badge variant="slate">{course.term}</Badge>
              {canManage ? <Badge variant="green">Docente</Badge> : null}
            </div>
            <h1 className="mt-2 font-serif text-[27px] font-normal text-[#242424] sm:text-[31px]">
              {course.title}
            </h1>
            <p className="mt-1 text-xs text-[#555]">
              {course.instructor.name}
              {course.description ? ` · ${course.description}` : ""}
            </p>
          </div>
          <Link
            href={`/courses/${course.id}/live`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Video className="h-4 w-4 text-[#0b3ddb]" />
            Ir al aula virtual
          </Link>
        </div>
        <CourseTabs courseId={course.id} />
      </header>

      <div className="px-4 py-6 sm:px-8">{children}</div>
    </div>
  );
}
