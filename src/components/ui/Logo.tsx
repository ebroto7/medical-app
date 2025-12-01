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
      className={cn("text-primary dark:text-primary", className)}
    >
      {/* Heart shape (top) - representing health */}
      <g>
        {/* Left curve of heart */}
        <path
          d="M24 40C24 40 8 28 8 18C8 12.47 11.58 8 15.5 8C18.52 8 21.14 9.94 24 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Right curve of heart */}
        <path
          d="M24 40C24 40 40 28 40 18C40 12.47 36.42 8 32.5 8C29.48 8 26.86 9.94 24 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Nutrition plate/bowl shape (bottom) - representing nutrition */}
      <g>
        {/* Upper arc of plate */}
        <path
          d="M12 28C12 23.58 17.37 20 24 20C30.63 20 36 23.58 36 28"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Bottom of plate */}
        <path
          d="M14 28H34"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Left side of plate */}
        <path
          d="M14 28V34C14 35.66 18.48 37 24 37C29.52 37 34 35.66 34 34V28"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Center accent line - connecting elements */}
      <line
        x1="24"
        y1="20"
        x2="24"
        y2="28"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.3"
      />
    </svg>
  );
}
