"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ManagementSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : children}</Button>;
}
