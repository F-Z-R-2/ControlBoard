import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b3ddb]/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[#0b3ddb] bg-[#0b3ddb] text-white hover:border-[#0932b5] hover:bg-[#0932b5]",
        secondary:
          "border-[#242424] bg-[#242424] text-white hover:bg-[#333333]",
        outline:
          "border-[#c9c9c9] bg-white text-[#333333] hover:border-[#0b3ddb] hover:text-[#0b3ddb]",
        ghost:
          "border-transparent text-[#333333] hover:bg-[#eef3ff] hover:text-[#0b3ddb]",
        destructive: "border-red-600 bg-red-600 text-white hover:bg-red-700",
        link: "border-transparent p-0 text-[#0b3ddb] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
