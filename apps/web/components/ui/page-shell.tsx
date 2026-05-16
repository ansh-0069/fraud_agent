import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function PageShell({
  step,
  title,
  description,
  rightSlot,
  children,
}: {
  step?: string;
  title: ReactNode;
  description?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          {step && (
            <Badge variant="secondary" className="mb-3">
              {step}
            </Badge>
          )}
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 text-muted-foreground max-w-3xl">{description}</p>
          )}
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </header>
      {children}
    </div>
  );
}
