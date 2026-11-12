import { BookOpen, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CourseCardProps = {
  course: {
    id: string;
    code: string;
    title: string;
    term: string;
    description: string;
    instructor: { name: string };
    _count?: { enrollments: number; assignments: number };
  };
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/courses/${course.id}`} className="group block">
      <Card className="h-full p-5 transition-colors group-hover:border-[#9caecf]">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-[#c4d3ff] bg-[#eef3ff] text-[#0b3ddb]">
            <BookOpen className="h-5 w-5" />
          </span>
          <Badge variant="slate">{course.term}</Badge>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#0b3ddb]">
          {course.code}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-[#242424] group-hover:text-[#0b3ddb]">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-[#666]">
          {course.description || "Sin descripción."}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-[#e5e5e5] pt-3 text-xs text-[#666]">
          <span className="truncate">{course.instructor.name}</span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course._count?.enrollments ?? 0}
          </span>
        </div>
      </Card>
    </Link>
  );
}
