import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex w-full rounded-[6px] border border-[hsl(var(--rpma-border))] bg-white px-3 py-2 text-sm shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          "aria-invalid:border-error aria-invalid:ring-error/20 aria-invalid:ring-2",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
