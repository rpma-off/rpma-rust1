import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30",
        secondary:
          "bg-border/20 text-border-light border border-border/30 hover:bg-border/30",
        destructive:
          "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30",
        outline:
          "border border-border text-border-light hover:border-foreground hover:text-foreground",
        success:
          "bg-accent text-black border border-accent hover:bg-accent-hover",
        // PPF Status badges - adapted for dark theme
        inspection:
          "bg-ppf-inspection/20 text-ppf-inspection border border-ppf-inspection/30 hover:bg-ppf-inspection/30",
        preparation:
          "bg-ppf-preparation/20 text-ppf-preparation border border-ppf-preparation/30 hover:bg-ppf-preparation/30",
        installation:
          "bg-ppf-installation/20 text-ppf-installation border border-ppf-installation/30 hover:bg-ppf-installation/30",
        quality:
          "bg-ppf-quality/20 text-ppf-quality border border-ppf-quality/30 hover:bg-ppf-quality/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
