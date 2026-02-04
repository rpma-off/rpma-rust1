import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-semibold transition-all duration-base disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background aria-invalid:ring-error/20 aria-invalid:border-error active:scale-[0.98] hover:scale-[1.02] transform-gpu touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active hover:brightness-110 shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 focus-visible:ring-destructive/20 shadow-sm hover:shadow-md",
        outline:
          "border-2 border-border bg-transparent hover:bg-primary/10 text-foreground hover:border-primary shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost:
          "hover:bg-muted hover:text-foreground text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "px-4 py-2 rounded-[6px] has-[>svg]:px-4",
        sm: "px-3 py-1.5 rounded-sm text-sm has-[>svg]:px-3",
        lg: "px-6 py-3 rounded-lg has-[>svg]:px-6 text-lg",
        xl: "px-8 py-4 rounded-xl has-[>svg]:px-8 text-xl",
        icon: "size-10 rounded-[6px]",
        "icon-sm": "size-8 rounded-[6px]",
        "icon-lg": "size-12 rounded-[6px]",
        "touch": "min-h-[44px] px-6 py-2 rounded-[6px] has-[>svg]:px-4", // WCAG minimum touch target
        "touch-lg": "min-h-[48px] px-8 py-3 rounded-[6px] has-[>svg]:px-6 text-lg", // Larger touch target
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
