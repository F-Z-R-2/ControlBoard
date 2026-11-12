"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createCourseAction, enrollAction } from "@/app/actions/courses";
import { PageHeader } from "@/components/page-header";

type Course = {
  id: string;
  code: string;
  title: string;
  term: string;
  instructorName: string;
};

type CourseWorkspaceProps = {
  canCreate: boolean;
  courses: Course[];
};

const coverImages = [
  "photo-1519389950473-47ba0277781c",
  "photo-1518770660439-4636190af475",
  "photo-1519608487953-e999c86e7455",
  "photo-1497366754035-f200968a6e72",
  "photo-1516321318423-f06f85e504b3",
  "photo-1500530855697-b586d89ba3ee",
  "photo-1486406146926-c627a92ad1ab",
];

const coverUrl = (index: number) =>
  `https://images.unsplash.com/${coverImages[index % coverImages.length]}?auto=format&fit=crop&w=800&q=80`;

function CourseFilters({
  terms,
  term,
  onTermChange,
  status,
  onStatusChange,
  query,
  onQueryChange,
  view,
  onViewChange,
}: {
  terms: string[];
  term: string;
  onTermChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  view: "grid" | "list";
  onViewChange: (value: "grid" | "list") => void;
}) {
  const controlClass =
    "h-9 border border-[#c9c9c9] bg-white px-2.5 text-xs text-[#333] outline-none focus:border-[#0b3ddb]";
  return (
    <div className="flex flex-col gap-3 border-b border-[#dedede] bg-white px-4 py-4 sm:px-7">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 items-center border border-[#c9c9c9]">
          <button
            type="button"
            aria-label="Vista de cuadrícula"
            aria-pressed={view === "grid"}
            onClick={() => onViewChange("grid")}
            className={`h-full px-2.5 ${view === "grid" ? "bg-[#e9efff] text-[#0b3ddb]" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <span className="grid grid-cols-2 gap-0.5">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="h-[6px] w-[6px] border border-current" />
              ))}
            </span>
          </button>
          <button
            type="button"
            aria-label="Vista de lista"
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
            className={`h-full border-l border-[#c9c9c9] px-2.5 ${view === "list" ? "bg-[#e9efff] text-[#0b3ddb]" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <label className="relative min-w-[180px] flex-1 sm:max-w-[270px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Busque sus cursos"
            className={`${controlClass} w-full pl-8`}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#333]">
          <span className="hidden text-slate-500 sm:inline">Períodos</span>
          <select
            value={term}
            onChange={(event) => onTermChange(event.target.value)}
            className={controlClass}
          >
            <option value="all">Todos los períodos</option>
            {terms.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[#333]">
          <span className="hidden text-slate-500 sm:inline">Filtros</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className={controlClass}
          >
            <option value="all">Todos los cursos</option>
            <option value="open">Cursos abiertos</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
        <SlidersHorizontal className="h-3.5 w-3.5 sm:hidden" />
        <span>Los cursos se actualizan en tiempo real</span>
      </div>
    </div>
  );
}

function WorkspaceCourseCard({
  course,
  index,
  favorite,
  onToggleFavorite,
  list,
}: {
  course: Course;
  index: number;
  favorite: boolean;
  onToggleFavorite: () => void;
  list: boolean;
}) {
  return (
    <article
      className={`group relative border border-[#d4d4d4] bg-white transition-shadow hover:border-[#9caecf] hover:shadow-sm ${
        list ? "flex min-h-[132px] flex-row" : "flex min-h-[300px] flex-col"
      }`}
    >
      <Link
        href={`/courses/${course.id}`}
        aria-label={`Abrir curso ${course.title}`}
        className={`block shrink-0 bg-slate-200 ${
          list ? "min-h-[132px] w-[150px] sm:w-[210px]" : "aspect-[16/8.5] w-full"
        }`}
        style={{
          backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.15), rgba(0,0,0,0)), url("${coverUrl(index)}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className={`flex min-w-0 flex-1 flex-col p-3.5 ${list ? "sm:p-4" : ""}`}>
        <Link href={`/courses/${course.id}`} className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-wide text-[#555]">
            {course.code}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[14px] font-semibold uppercase leading-[1.35] text-[#202020] group-hover:text-[#0b3ddb]">
            {course.title}
          </h3>
          <p className="mt-2 text-[11px] text-[#4c4c4c]">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#25824a] align-middle" />
            Abierto
          </p>
        </Link>
        <div className="mt-3 flex items-end justify-between gap-2 border-t border-[#e5e5e5] pt-2.5">
          <div className="min-w-0">
            <p className="truncate text-[10px] text-[#646464]">
              {course.instructorName}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-[#777]">
              {course.term}
            </p>
          </div>
          <button
            type="button"
            aria-label={
              favorite
                ? `Quitar ${course.title} de favoritos`
                : `Marcar ${course.title} como favorito`
            }
            aria-pressed={favorite}
            onClick={onToggleFavorite}
            className={`shrink-0 p-1 ${favorite ? "text-[#d99a00]" : "text-[#767676] hover:text-[#d99a00]"}`}
          >
            <Star
              className="h-[17px] w-[17px]"
              fill={favorite ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    </article>
  );
}

function CourseFormDialog({
  canCreate,
  onClose,
}: {
  canCreate: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-dialog-title"
        className="w-full max-w-[440px] border border-[#d3d3d3] bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between border-b border-[#e5e5e5] pb-3">
          <h2
            id="course-dialog-title"
            className="font-serif text-xl text-[#222]"
          >
            {canCreate ? "Crear curso" : "Unirme a un curso"}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="p-1 text-slate-600 hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {canCreate ? (
          <form action={createCourseAction} className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Código
              <input
                name="code"
                placeholder="CS-101"
                maxLength={20}
                required
                className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm focus:border-[#0b3ddb] focus:outline-none"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Título
              <input
                name="title"
                placeholder="Fundamentos de Programación"
                maxLength={120}
                required
                className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm focus:border-[#0b3ddb] focus:outline-none"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Periodo
              <input
                name="term"
                placeholder="202620"
                maxLength={40}
                required
                className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm focus:border-[#0b3ddb] focus:outline-none"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Descripción
              <textarea
                name="description"
                placeholder="Breve descripción del curso"
                maxLength={1000}
                rows={3}
                className="mt-1.5 w-full resize-y border border-slate-300 px-3 py-2 text-sm focus:border-[#0b3ddb] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="mt-2 h-10 w-full bg-[#0b3ddb] text-sm font-medium text-white hover:bg-[#0932b5]"
            >
              Crear curso
            </button>
          </form>
        ) : (
          <form action={enrollAction} className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Código del curso
              <input
                name="code"
                placeholder="CS-101"
                maxLength={20}
                required
                className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm focus:border-[#0b3ddb] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="h-10 w-full bg-[#0b3ddb] text-sm font-medium text-white hover:bg-[#0932b5]"
            >
              Unirme
            </button>
            <p className="text-xs text-slate-500">
              Tu profesor te compartirá el código del curso.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

export function CoursesWorkspace({
  canCreate,
  courses,
}: CourseWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const terms = useMemo(
    () => Array.from(new Set(courses.map((course) => course.term))),
    [courses],
  );
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return courses.filter((course) => {
      const matchesQuery =
        !normalizedQuery ||
        course.title.toLocaleLowerCase().includes(normalizedQuery) ||
        course.code.toLocaleLowerCase().includes(normalizedQuery);
      const matchesTerm = term === "all" || course.term === term;
      const matchesStatus = status !== "closed";
      return matchesQuery && matchesTerm && matchesStatus;
    });
  }, [courses, query, status, term]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleCourses = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function toggleFavorite(courseId: string) {
    setFavorites((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Cursos"
        description={`${courses.length} cursos disponibles en tu campus`}
        actions={
          <>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-2 border border-[#c8c8c8] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Crear curso</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-2 border border-[#c8c8c8] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Unirme a un curso</span>
              </button>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs font-medium text-[#222] hover:text-[#0b3ddb] sm:text-sm"
            >
              <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={1.7} />
              <span className="hidden sm:inline">Panel</span>
            </Link>
          </>
        }
      />
      <CourseFilters
        terms={terms}
        term={term}
        onTermChange={(value) => {
          setTerm(value);
          setPage(0);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(0);
        }}
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(0);
        }}
        view={view}
        onViewChange={setView}
      />
      <section className="px-4 pb-8 pt-5 sm:px-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] text-[#555]">{filtered.length} resultados</p>
            <h2 className="mt-2 text-[17px] font-semibold text-[#252525]">
              {term === "all" ? "Todos los cursos" : term}
            </h2>
          </div>
          {filtered.length > pageSize ? (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>
                {page + 1} de {pageCount}
              </span>
              <button
                type="button"
                aria-label="Página anterior"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                className="border border-slate-300 p-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Página siguiente"
                disabled={page + 1 >= pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount - 1, current + 1))
                }
                className="border border-slate-300 p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
        {visibleCourses.length ? (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3"
                : "flex flex-col gap-3"
            }
          >
            {visibleCourses.map((course) => (
              <WorkspaceCourseCard
                key={course.id}
                course={course}
                index={courses.findIndex((item) => item.id === course.id)}
                favorite={favorites.includes(course.id)}
                onToggleFavorite={() => toggleFavorite(course.id)}
                list={view === "list"}
              />
            ))}
          </div>
        ) : (
          <div className="border border-[#d5d5d5] bg-white px-5 py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              {courses.length
                ? "No se encontraron cursos"
                : "No hay cursos todavía"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {courses.length
                ? "Pruebe con otros términos o filtros."
                : canCreate
                  ? "Cree su primer curso para empezar."
                  : "Pida a su profesor el código del curso para unirse."}
            </p>
            {!canCreate && courses.length === 0 ? (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="mt-4 border border-[#0b3ddb] px-4 py-2 text-xs font-medium text-[#0b3ddb] hover:bg-[#f1f4ff]"
              >
                Unirme a un curso
              </button>
            ) : null}
          </div>
        )}
      </section>
      {formOpen ? (
        <CourseFormDialog
          canCreate={canCreate}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
    </div>
  );
}
