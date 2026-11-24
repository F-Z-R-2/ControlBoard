"use client";

import { useFormStatus } from "react-dom";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";

export function ManagementSubmit({ children, variant = "default" }: { children: React.ReactNode; variant?: VariantProps<typeof buttonVariants>["variant"] }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} disabled={pending}>{pending ? "Guardando…" : children}</Button>;
}
