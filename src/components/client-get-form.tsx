"use client";

import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

export function ClientGetForm({
  action,
  className,
  children,
}: {
  action: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const [key, value] of values.entries()) {
      if (typeof value === "string" && value) query.append(key, value);
    }
    const suffix = query.size ? `?${query.toString()}` : "";
    router.push(`${action}${suffix}`, { scroll: false });
  }

  return <form action={action} method="get" className={className} onSubmit={handleSubmit}>{children}</form>;
}
