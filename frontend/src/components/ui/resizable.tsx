import * as React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizableGroup = ResizablePrimitive.Group

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Panel>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Panel>
>(({ className, id, style, ...props }, ref) => (
  <ResizablePrimitive.Panel
    id={id}
    style={style}
    className={cn("h-full w-full min-w-0", className)}
    {...props}
  />
))
ResizablePanel.displayName = ResizablePrimitive.Panel.displayName

interface ResizableHandleProps {
  className?: string;
  withHandle?: boolean;
  disabled?: boolean;
  hitAreaMargins?: number;
}

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Separator>,
  ResizableHandleProps
>(({ className, withHandle, disabled, hitAreaMargins }, ref) => (
  <ResizablePrimitive.Separator
    disabled={disabled}
    hitAreaMargins={hitAreaMargins}
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-border data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:-translate-y-1/2 hover:bg-accent/50 [&[data-orientation=vertical]>div]:rotate-90",
      className
    )}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizableGroup, ResizablePanel, ResizableHandle }
