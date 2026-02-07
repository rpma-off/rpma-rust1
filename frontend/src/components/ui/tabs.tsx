"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

type TabsVariant = "underline";

type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  "data-variant"?: TabsVariant;
};

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, "data-variant": dataVariant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    data-variant={dataVariant}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-full bg-[hsl(var(--rpma-surface))] p-1 text-muted-foreground border border-[hsl(var(--rpma-border))]",
      dataVariant === "underline" &&
        "h-auto rounded-none border-0 bg-transparent p-0 text-white gap-2",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  "data-variant"?: TabsVariant;
};

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, "data-variant": dataVariant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    data-variant={dataVariant}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-[var(--rpma-shadow-soft)]",
      dataVariant === "underline" &&
        "h-12 rounded-none px-4 py-0 uppercase tracking-wide text-xs text-white/85 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none border-b-[3px] border-transparent data-[state=active]:border-white",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
