import {
  Dumbbell,
  Heart,
  Zap,
  Activity,
  Sparkles,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";

export type TrainingType = "cardio" | "strength" | "flexibility" | "hiit" | "yoga" | "other";

export interface TrainingTypeConfig {
  value: TrainingType;
  label: string;
  icon: LucideIcon;
  /** Classes for selected/highlighted state (bg + text + border) */
  colorClasses: string;
  /** Classes for badge/icon background only */
  badgeClasses: string;
}

/**
 * Centralized configuration for training types.
 * Uses CSS variables for theme consistency.
 */
export const trainingTypes: TrainingTypeConfig[] = [
  {
    value: "cardio",
    label: "Cardio",
    icon: Heart,
    colorClasses: "bg-accent-red/20 text-accent-red border-accent-red/30",
    badgeClasses: "bg-accent-red/20 text-accent-red",
  },
  {
    value: "strength",
    label: "Fuerza",
    icon: Dumbbell,
    colorClasses: "bg-accent-blue/20 text-accent-blue border-accent-blue/30",
    badgeClasses: "bg-accent-blue/20 text-accent-blue",
  },
  {
    value: "flexibility",
    label: "Flexibilidad",
    icon: Activity,
    colorClasses: "bg-accent-purple/20 text-accent-purple border-accent-purple/30",
    badgeClasses: "bg-accent-purple/20 text-accent-purple",
  },
  {
    value: "hiit",
    label: "HIIT",
    icon: Zap,
    colorClasses: "bg-accent-orange/20 text-accent-orange border-accent-orange/30",
    badgeClasses: "bg-accent-orange/20 text-accent-orange",
  },
  {
    value: "yoga",
    label: "Yoga",
    icon: Sparkles,
    colorClasses: "bg-accent-green/20 text-accent-green border-accent-green/30",
    badgeClasses: "bg-accent-green/20 text-accent-green",
  },
  {
    value: "other",
    label: "Otro",
    icon: MoreHorizontal,
    colorClasses: "bg-muted text-muted-foreground border-border",
    badgeClasses: "bg-muted text-muted-foreground",
  },
];

/**
 * Get training type config by value
 */
export function getTrainingTypeConfig(type: TrainingType): TrainingTypeConfig {
  return trainingTypes.find((t) => t.value === type) || trainingTypes[trainingTypes.length - 1];
}

/**
 * Record-style config for quick lookups (backwards compatible)
 */
export const trainingTypeRecord: Record<TrainingType, Omit<TrainingTypeConfig, "value">> = {
  cardio: { label: "Cardio", icon: Heart, colorClasses: "bg-accent-red/20 text-accent-red border-accent-red/30", badgeClasses: "bg-accent-red/20 text-accent-red" },
  strength: { label: "Fuerza", icon: Dumbbell, colorClasses: "bg-accent-blue/20 text-accent-blue border-accent-blue/30", badgeClasses: "bg-accent-blue/20 text-accent-blue" },
  flexibility: { label: "Flexibilidad", icon: Activity, colorClasses: "bg-accent-purple/20 text-accent-purple border-accent-purple/30", badgeClasses: "bg-accent-purple/20 text-accent-purple" },
  hiit: { label: "HIIT", icon: Zap, colorClasses: "bg-accent-orange/20 text-accent-orange border-accent-orange/30", badgeClasses: "bg-accent-orange/20 text-accent-orange" },
  yoga: { label: "Yoga", icon: Sparkles, colorClasses: "bg-accent-green/20 text-accent-green border-accent-green/30", badgeClasses: "bg-accent-green/20 text-accent-green" },
  other: { label: "Otro", icon: MoreHorizontal, colorClasses: "bg-muted text-muted-foreground border-border", badgeClasses: "bg-muted text-muted-foreground" },
};
