import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-semibold transition-all duration-base disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background aria-invalid:ring-error/20 aria-invalid:border-error active:scale-[0.98] hover:scale-[1.02] transform-gpu touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active hover:brightness-110 shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 focus-visible:ring-destructive/20 shadow-sm hover:shadow-md",
        outline:
          "border-2 border-border bg-transparent hover:bg-muted text-foreground hover:border-accent shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost:
          "hover:bg-muted hover:text-foreground text-muted-foreground",
        link: "text-accent underline-offset-4 hover:underline hover:text-accent-hover",
      },
      size: {
        default: "h-11 px-6 py-3 has-[>svg]:px-4",
        sm: "h-9 rounded-md gap-1.5 px-4 text-sm has-[>svg]:px-3",
        lg: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-lg",
        xl: "h-14 rounded-xl px-10 has-[>svg]:px-8 text-xl",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
        "touch": "min-h-[44px] px-6 py-3 has-[>svg]:px-4", // WCAG minimum touch target
        "touch-lg": "min-h-[48px] px-8 py-4 has-[>svg]:px-6 text-lg", // Larger touch target
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
