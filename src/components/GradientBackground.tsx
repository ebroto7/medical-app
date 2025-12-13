import React from "react";
import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function GradientBackground({
  className,
  children,
}: GradientBackgroundProps) {
  return (
    <div
      className={cn(
        "relative bg-background",
        className
      )}
    >
      {children}
    </div>
  );
}
