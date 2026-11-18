"use client";

import {
  BarChart3,
  ClipboardList,
  FolderOpen,
  Home,
  Megaphone,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { segment: "", label: "Inicio", icon: Home },
  { segment: "content", label: "Contenido", icon: FolderOpen },
  { segment: "assignments", label: "Tareas", icon: ClipboardList },
  { segment: "attendance", label: "Asistencia", icon: ClipboardList },
  { segment: "period-grades", label: "Notas del periodo", icon: BarChart3 },
  { segment: "grades", label: "Notas de tareas", icon: BarChart3 },
  { segment: "announcements", label: "Anuncios", icon: Megaphone },
  { segment: "people", label: "Personas", icon: Users },
  { segment: "live", label: "Aula virtual", icon: Video },
];

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const base = `/courses/${courseId}`;

  return (
    <div className="overflow-x-auto border-b border-[#dedede] bg-white">
      <nav className="flex min-w-max gap-1 px-2 sm:px-6">
        {tabs.map((tab) => {
          const href = tab.segment === "attendance"
            ? `/attendance?course=${encodeURIComponent(courseId)}`
            : tab.segment ? `${base}/${tab.segment}` : base;
          const active = tab.segment
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === base;

          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 text-[12px] font-medium transition-colors",
                active
                  ? "border-[#0b3ddb] text-[#0b3ddb]"
                  : "border-transparent text-[#555] hover:border-[#c9c9c9] hover:text-[#242424]",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
