"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedHeadingProps {
  level?: "h1" | "h2" | "h3" | "h4";
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
  delay?: number;
  onScroll?: boolean;
}

export function AnimatedHeading({
  level = "h2",
  children,
  className,
  animated = true,
  delay = 0,
  onScroll = false,
}: AnimatedHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!animated || !ref.current) return;

    const headingElement = ref.current;

    if (onScroll) {
      // Animate on scroll
      gsap.fromTo(
        headingElement,
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headingElement,
            start: "top 80%",
            end: "top 50%",
            toggleActions: "play none none none",
          },
        }
      );
    } else {
      // Animate on mount
      gsap.fromTo(
        headingElement,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          delay: delay,
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [animated, delay, onScroll]);

  const headingClasses = cn(
    "font-bold tracking-tight text-foreground",
    {
      "text-4xl sm:text-5xl lg:text-6xl": level === "h1",
      "text-3xl sm:text-4xl lg:text-5xl": level === "h2",
      "text-2xl sm:text-3xl lg:text-4xl": level === "h3",
      "text-xl sm:text-2xl lg:text-3xl": level === "h4",
    },
    className
  );

  const Component = level;

  return <Component ref={ref} className={headingClasses}>{children}</Component>;
}
