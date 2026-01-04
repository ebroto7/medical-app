export const HABIT_COLORS = {
  red: { label: "Rojo", bg: "bg-red-500", text: "text-red-500", ring: "ring-red-500", softBg: "bg-red-500/10", border: "border-red-500/20" },
  orange: { label: "Naranja", bg: "bg-orange-500", text: "text-orange-500", ring: "ring-orange-500", softBg: "bg-orange-500/10", border: "border-orange-500/20" },
  amber: { label: "Ambar", bg: "bg-amber-500", text: "text-amber-500", ring: "ring-amber-500", softBg: "bg-amber-500/10", border: "border-amber-500/20" },
  green: { label: "Verde", bg: "bg-green-500", text: "text-green-500", ring: "ring-green-500", softBg: "bg-green-500/10", border: "border-green-500/20" },
  emerald: { label: "Esmeralda", bg: "bg-emerald-500", text: "text-emerald-500", ring: "ring-emerald-500", softBg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  teal: { label: "Verde azulado", bg: "bg-teal-500", text: "text-teal-500", ring: "ring-teal-500", softBg: "bg-teal-500/10", border: "border-teal-500/20" },
  cyan: { label: "Cian", bg: "bg-cyan-500", text: "text-cyan-500", ring: "ring-cyan-500", softBg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  blue: { label: "Azul", bg: "bg-blue-500", text: "text-blue-500", ring: "ring-blue-500", softBg: "bg-blue-500/10", border: "border-blue-500/20" },
  indigo: { label: "Indigo", bg: "bg-indigo-500", text: "text-indigo-500", ring: "ring-indigo-500", softBg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  violet: { label: "Violeta", bg: "bg-violet-500", text: "text-violet-500", ring: "ring-violet-500", softBg: "bg-violet-500/10", border: "border-violet-500/20" },
  purple: { label: "Morado", bg: "bg-purple-500", text: "text-purple-500", ring: "ring-purple-500", softBg: "bg-purple-500/10", border: "border-purple-500/20" },
  fuchsia: { label: "Fucsia", bg: "bg-fuchsia-500", text: "text-fuchsia-500", ring: "ring-fuchsia-500", softBg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20" },
  pink: { label: "Rosa", bg: "bg-pink-500", text: "text-pink-500", ring: "ring-pink-500", softBg: "bg-pink-500/10", border: "border-pink-500/20" },
  rose: { label: "Rosa fuerte", bg: "bg-rose-500", text: "text-rose-500", ring: "ring-rose-500", softBg: "bg-rose-500/10", border: "border-rose-500/20" },
  slate: { label: "Gris", bg: "bg-slate-500", text: "text-slate-500", ring: "ring-slate-500", softBg: "bg-slate-500/10", border: "border-slate-500/20" },
} as const;

export type HabitColor = keyof typeof HABIT_COLORS;

export const DEFAULT_HABIT_COLOR: HabitColor = "blue";
