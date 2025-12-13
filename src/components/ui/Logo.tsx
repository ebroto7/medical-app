import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
};

export function Logo({ size = "md", className }: LogoProps) {
  const dimension = sizeMap[size];

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
    >
      {/* Gota principal */}
      <path
        d="M24 4L40 28C40 38 33 44 24 44C15 44 8 38 8 28L24 4Z"
        fill="currentColor"
      />
      {/* Reflejo interior */}
      <path
        d="M24 14L32 28C32 34 28 38 24 38C20 38 16 34 16 28L24 14Z"
        fill="white"
        fillOpacity="0.4"
      />
    </svg>
  );
}
