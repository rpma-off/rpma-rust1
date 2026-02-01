import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-background font-semibold hover:bg-accent-hover hover:scale-105 active:scale-95 shadow-lg",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:scale-105 active:scale-95",
        outline:
          "border border-border bg-transparent text-foreground hover:border-accent hover:bg-border/10 hover:text-accent hover:scale-105 active:scale-95",
        secondary:
          "bg-border text-foreground shadow-sm hover:bg-muted hover:scale-105 active:scale-95 border border-border/50",
        ghost:
          "text-border hover:bg-border/20 hover:text-foreground hover:scale-105 active:scale-95",
        link:
          "text-accent underline-offset-4 hover:underline hover:text-accent-hover",
        accent:
          "bg-accent text-black font-bold rounded-full hover:bg-accent-hover hover:scale-110 active:scale-95 shadow-xl",
        // PPF specific variants - adapted for dark theme
        inspection:
          "bg-ppf-inspection/20 text-ppf-inspection border border-ppf-inspection/30 hover:bg-ppf-inspection/30 hover:scale-105",
        preparation:
          "bg-ppf-preparation/20 text-ppf-preparation border border-ppf-preparation/30 hover:bg-ppf-preparation/30 hover:scale-105",
        installation:
          "bg-ppf-installation/20 text-ppf-installation border border-ppf-installation/30 hover:bg-ppf-installation/30 hover:scale-105",
        quality:
          "bg-ppf-quality/20 text-ppf-quality border border-ppf-quality/30 hover:bg-ppf-quality/30 hover:scale-105",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 rounded-md px-4 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
        xl: "h-14 rounded-lg px-10 text-lg font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
