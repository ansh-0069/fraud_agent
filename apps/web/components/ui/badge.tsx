import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-grab-500/30 bg-grab-500/10 text-grab-300",
        secondary: "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
        destructive: "border-rose-500/30 bg-rose-500/10 text-rose-300",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
        outline: "border-white/[0.12] text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
