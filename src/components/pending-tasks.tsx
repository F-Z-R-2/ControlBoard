"use client";

import { CalendarDays, ChevronDown, ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type PendingTaskItem = {
  id: string;
  title: string;
  type: string;
  course: string;
  date: string;
  time: string;
  href: string;
};

export type PendingTaskGroup = {
  name: string;
  emptyMessage: string;
  items: PendingTaskItem[];
};

export function PendingTasks({ groups }: { groups: PendingTaskGroup[] }) {
  const [collapsed, setCollapsed] = useState<string[]>([]);

  function toggleGroup(name: string) {
    setCollapsed((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-[#e1e1e1] bg-white px-5 py-5">
        <h2 className="text-[18px] font-semibold text-[#252525]">
          Tareas pendientes
        </h2>
        <p className="mt-1 text-[11px] text-[#666]">
          Entregas y vencimientos de tus cursos.
        </p>
      </div>
      <div className="divide-y divide-[#e3e3e3] px-5">
        {groups.map((group) => {
          const isCollapsed = collapsed.includes(group.name);
          return (
            <section key={group.name} className="py-2">
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => toggleGroup(group.name)}
                className="flex w-full items-center gap-2 py-2 text-left text-[13px] font-semibold text-[#333]"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {group.name}
                <span className="ml-auto text-[11px] font-normal text-slate-500">
                  {group.items.length}
                </span>
              </button>
              {!isCollapsed ? (
                group.items.length ? (
                  <div className="pb-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="block border-t border-[#ececec] py-3 first:border-t-0 hover:bg-[#f7f9ff]"
                      >
                        <div className="flex items-start gap-2.5">
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#4f607b]" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-[#65718a]">
                              {item.date}
                            </p>
                            <p className="mt-1 text-[12px] font-semibold leading-[1.4] text-[#222]">
                              {item.title}
                            </p>
                            <p className="mt-1 text-[10px] text-[#626262]">
                              {item.type}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[10px] text-[#4a4a4a]">
                              {item.course}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-[#626262]">
                              <Clock3 className="h-3 w-3" />
                              Límite: {item.date} · {item.time}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="pb-3 pl-6 text-[11px] leading-5 text-[#666]">
                    {group.emptyMessage}
                  </p>
                )
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
