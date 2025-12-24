import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

const iconBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 [&_svg]:stroke-[2]",
  {
    variants: {
      color: {
        orange: "bg-accent-orange text-foreground",
        yellow: "bg-accent-yellow text-foreground",
        green: "bg-accent-green text-foreground",
        red: "bg-accent-red text-foreground",
        blue: "bg-accent-blue text-foreground",
        purple: "bg-accent-purple text-foreground",
        primary: "bg-primary text-primary-foreground",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
        md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
        lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
        xl: "h-14 w-14 [&_svg]:h-7 [&_svg]:w-7",
      },
    },
    defaultVariants: {
      color: "primary",
      size: "md",
    },
  }
)

export interface IconBadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
  VariantProps<typeof iconBadgeVariants> {
  icon: LucideIcon
}

const IconBadge = React.forwardRef<HTMLDivElement, IconBadgeProps>(
  ({ className, color, size, icon: Icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(iconBadgeVariants({ color, size, className }))}
        {...props}
      >
        <Icon />
      </div>
    )
  }
)
IconBadge.displayName = "IconBadge"

export { IconBadge, iconBadgeVariants }
