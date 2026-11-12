import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex min-h-[82px] flex-wrap items-center justify-between gap-3 border-b border-[#dedede] bg-white px-5 py-4 sm:min-h-[96px] sm:px-8">
      <div className="min-w-0">
        <h1 className="font-serif text-[27px] font-normal text-[#242424] sm:text-[31px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-xs text-[#555]">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
