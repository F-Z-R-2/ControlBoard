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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 pb-0 sm:px-8">
          <div className="flex flex-col gap-5 border-b border-slate-100 py-5 sm:flex-row sm:items-start sm:justify-between sm:py-7">
            <div className="min-w-0">
              <Link href="/courses" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-blue-800"><BookOpen className="h-3.5 w-3.5" /> Cursos</Link>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-blue-900">{course.code}</span>
                <Badge variant="slate">{course.section?.year.name ?? course.term}</Badge>
                {course.section && <Badge variant="slate">{course.section.grade.name} · {course.section.name}</Badge>}
                {course.academicPeriod && <Badge variant="slate">{course.academicPeriod.name}</Badge>}
                {canManage && <Badge variant="green">Gestión habilitada</Badge>}
              </div>
              <h1 className="mt-3 max-w-4xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-[32px]">{course.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600"><span className="font-medium text-slate-800">{course.instructor.name}</span><span className="text-slate-300">·</span><span>{course.instructor.email}</span></div>
              {course.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{course.description}</p>}
            </div>
            <Link href={`/courses/${course.id}/live`} className={buttonVariants({ variant: "outline", className: "shrink-0 rounded-md" })}><Video className="h-4 w-4 text-[#0b3ddb]" /> Abrir aula virtual</Link>
          </div>
          <CourseTabs courseId={course.id} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
