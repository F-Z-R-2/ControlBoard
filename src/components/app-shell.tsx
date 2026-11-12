"use client";

import {
  BookOpen,
  Building,
  CalendarDays,
  ClipboardList,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import {
  PendingTasks,
  type PendingTaskGroup,
} from "@/components/pending-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials, roleLabel } from "@/lib/utils";

type ShellUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
};

const navigation = [
  { label: "Página de la institución", icon: Building, href: "/dashboard" },
  { label: "Cursos", icon: BookOpen, href: "/courses" },
  { label: "Calendario", icon: CalendarDays, href: "/calendar" },
  { label: "Anuncios", icon: MessageSquare, href: "/announcements" },
  { label: "Calificaciones", icon: ClipboardList, href: "/grades" },
  { label: "Herramientas", icon: Settings, href: "/tools" },
];

function isActive(pathname: string, href: string) {
  if (href === "/courses") {
    return pathname === "/courses" || pathname.startsWith("/courses/");
  }
  return pathname === href;
}

function Sidebar({
  user,
  open,
  onClose,
  pathname,
}: {
  user: ShellUser;
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const name = user.name ?? "Usuario";

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/45 md:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[208px] shrink-0 flex-col bg-[#242424] text-white transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link
          href="/dashboard"
          className="flex h-[66px] items-center justify-between border-b border-white/10 px-4"
          onClick={onClose}
        >
          <span className="flex items-center gap-2 text-[18px] font-semibold tracking-tight">
            <BookOpen className="h-[21px] w-[21px] text-white" />
            ControlBoard
          </span>
          <span className="text-[11px] font-semibold text-slate-300">®</span>
        </Link>

        <div className="mx-4 mt-5 flex min-w-0 items-center gap-2.5 border-b border-white/10 pb-5">
          {user.image ? (
            <span
              role="img"
              aria-label={`Foto de ${name}`}
              className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url("${user.image}")` }}
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b8c2d0] text-xs font-semibold text-slate-800">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{name}</p>
            <p className="truncate text-[10px] text-slate-400">{user.email}</p>
          </div>
        </div>

        <nav
          aria-label="Navegación principal"
          className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2"
        >
          {navigation.map(({ href, icon: Icon, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
                className={`flex min-h-10 items-center gap-3 px-3 text-[12px] transition-colors ${
                  active
                    ? "bg-[#0b3ddb] font-medium text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Badge variant="slate" className="border-white/15 bg-white/10 text-slate-200">
              {roleLabel(user.role)}
            </Badge>
            <span className="text-[10px] text-slate-500">Demo</span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 text-xs text-white hover:text-slate-300"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
          <p className="mt-3 text-[10px] leading-4 text-slate-500">
            ControlBoard · Campus virtual de demostración
          </p>
        </div>
      </aside>
    </>
  );
}

export function AppShell({
  user,
  tasks,
  children,
}: {
  user: ShellUser;
  tasks: PendingTaskGroup[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const pendingCount = tasks.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="flex h-screen min-h-[600px] w-full overflow-hidden bg-[#f6f6f6] text-[#222]">
      <Sidebar
        user={user}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        pathname={pathname}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#dedede] bg-white px-4 md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
              className="text-slate-700"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#0b3ddb]" />
              <span className="font-semibold tracking-tight">ControlBoard</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setTasksOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700"
          >
            <CalendarDays className="h-4 w-4" />
            Tareas
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          <aside className="hidden w-[310px] shrink-0 flex-col border-l border-[#d8d8d8] bg-white xl:flex">
            <PendingTasks groups={tasks} />
          </aside>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setTasksOpen(true)}
        className="fixed bottom-5 right-5 z-20 flex items-center gap-2 border border-[#0b3ddb] bg-[#0b3ddb] px-3 py-2 text-xs font-medium text-white shadow-lg xl:hidden"
      >
        <CalendarDays className="h-4 w-4" />
        Tareas ({pendingCount})
      </button>

      {tasksOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 xl:hidden">
          <button
            type="button"
            aria-label="Cerrar tareas pendientes"
            className="flex-1"
            onClick={() => setTasksOpen(false)}
          />
          <aside className="flex h-full w-[min(92vw,360px)] flex-col border-l border-[#d8d8d8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e1e1e1] px-5 py-4">
              <p className="text-sm font-semibold">Tareas pendientes</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTasksOpen(false)}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <PendingTasks groups={tasks} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
