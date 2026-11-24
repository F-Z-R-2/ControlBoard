export default function AppModuleLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando módulo" className="mx-auto w-full max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <span className="sr-only">Cargando módulo…</span>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
        <span className="h-8 w-8 animate-pulse rounded-md bg-blue-100" />
        <div className="flex-1 space-y-2"><div className="h-6 w-48 animate-pulse rounded bg-slate-200" /><div className="h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" /></div>
        <span className="h-9 w-28 animate-pulse rounded bg-blue-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"><div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" /><div className="h-3 w-full animate-pulse rounded bg-slate-100" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" /><div className="h-20 animate-pulse rounded-md bg-slate-50" /></div>)}
      </div>
      <p className="text-center text-xs text-slate-400">Cargando contenido…</p>
    </div>
  );
}
