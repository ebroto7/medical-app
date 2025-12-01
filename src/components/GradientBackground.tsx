import React from "react";
import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  from?: string;
  to?: string;
  className?: string;
  children?: React.ReactNode;
}

export function GradientBackground({
  from = "from-teal-50",
  to = "to-white",
  className,
  children,
}: GradientBackgroundProps) {
  return (
    <div
      className={cn(
        `relative bg-gradient-to-b ${from} ${to} dark:from-slate-900 dark:to-slate-800`,
        className
      )}
    >
      {children}
    </div>
  );
}
