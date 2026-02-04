import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
        className={cn(
          "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-3 text-base shadow-sm transition-colors resize-y",
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

export { Textarea }
