# Design System - RPMA v2

Ce document décrit le système de design complet de l'application RPMA v2, incluant les composants UI, les thèmes, les patterns d'interaction, et les guidelines de développement.

## 📋 Vue d'Ensemble

Le design system de RPMA v2 est construit sur une foundation moderne avec :
- **Tailwind CSS** : Utility-first framework pour le styling
- **shadcn/ui + Radix** : Composants accessibles et robustes
- **Design Tokens** : Variables CSS pour la consistance
- **Responsive Design** : Mobile-first approach
- **Accessibility** : WCAG 2.1 AA compliance

## 🎨 Système de Thème

### 1. Color Palette

#### Primary RPMA Colors
```css
:root {
  /* RPMA Brand Colors */
  --rpma-primary: 221 83% 53%;      /* hsl(221, 83%, 53%) - RPMA Teal */
  --rpma-hover: 221 83% 48%;         /* Darker for hover */
  --rpma-active: 221 83% 43%;        /* Even darker for active */
  --rpma-foreground: 0 0% 95%;      /* White text on RPMA colors */
  
  /* Semantic Colors */
  --background: 0 0% 100%;           /* Pure white */
  --foreground: 222.2 84% 4.9%;      /* Near black */
  
  /* Surface Colors */
  --card: 0 0% 100%;                /* White cards */
  --card-foreground: 222.2 84% 4.9%; /* Card text */
  --popover: 0 0% 100%;              /* White popovers */
  --popover-foreground: 222.2 84% 4.9%;
  
  /* Status Colors */
  --success: 142 76% 36%;            /* Green */
  --warning: 38 92% 50%;             /* Amber */
  --error: 0 84% 60%;               /* Red */
  --info: 217 91% 60%;              /* Blue */
}
```

#### Status-Specific Colors
```css
:root {
  /* Workflow Status Colors */
  --workflow-draft: 220 9% 46%;        /* Gray */
  --workflow-scheduled: 221 83% 53%;     /* RPMA Teal */
  --workflow-inProgress: 38 92% 50%;     /* Amber */
  --workflow-completed: 142 76% 36%;      /* Green */
  --workflow-cancelled: 0 84% 60%;        /* Red */
  
  /* Priority Colors */
  --priority-low: 221 83% 53%;          /* Blue */
  --priority-medium: 38 92% 50%;        /* Amber */
  --priority-high: 25 95% 53%;           /* Deep Orange */
  --priority-urgent: 0 84% 60%;          /* Red */
}
```

### 2. Typography System

#### Font Scale
```css
:root {
  /* Font Size Scale (4px base unit for scalability) */
  --font-size-2xs: 0.625rem;   /* 10px - Tiny */
  --font-size-xs: 0.75rem;      /* 12px - Caption */
  --font-size-sm: 0.875rem;     /* 14px - Body Small */
  --font-size-base: 1rem;       /* 16px - Body */
  --font-size-lg: 1.125rem;     /* 18px - Body Large */
  --font-size-xl: 1.25rem;      /* 20px - H4 */
  --font-size-2xl: 1.5rem;      /* 24px - H3 */
  --font-size-3xl: 1.875rem;    /* 30px - H2 */
  --font-size-4xl: 2.25rem;     /* 36px - H1 */
  --font-size-5xl: 3rem;         /* 48px - Display */
  --font-size-6xl: 3.75rem;      /* 60px - Jumbo */
}
```

#### Line Heights
```css
:root {
  --line-height-tight: 1.1;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  --line-height-loose: 2;
}
```

#### Font Weights
```css
:root {
  --font-weight-normal: 400;      /* Regular */
  --font-weight-medium: 500;      /* Medium */
  --font-weight-semibold: 600;    /* Semibold */
  --font-weight-bold: 700;        /* Bold */
}
```

### 3. Spacing System

#### 4px Base Unit Scale
```css
:root {
  /* 4px base unit spacing */
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
}
```

#### Semantic Spacing
```css
:root {
  /* Component-specific spacing */
  --spacing-xs: var(--space-1);    /* 4px */
  --spacing-sm: var(--space-2);    /* 8px */
  --spacing-md: var(--space-3);    /* 12px */
  --spacing-lg: var(--space-4);    /* 16px */
  --spacing-xl: var(--space-5);    /* 20px */
  --spacing-2xl: var(--space-6);  /* 24px */
  --spacing-3xl: var(--space-8);  /* 32px */
  --spacing-4xl: var(--space-10); /* 40px */
  --spacing-5xl: var(--space-12); /* 48px */
}
```

### 4. Border Radius System

```css
:root {
  --radius-none: 0px;
  --radius-xs: 4px;          /* Small elements (tags, badges) */
  --radius-sm: 6px;          /* Buttons, inputs */
  --radius-md: 8px;          /* Cards */
  --radius-lg: 12px;         /* Large cards */
  --radius-xl: 16px;         /* Modals */
  --radius-2xl: 20px;        /* Special cases */
  --radius-full: 9999px;      /* Pills, avatars */
}
```

### 5. Shadow System

```css
:root {
  /* Elevation levels */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);          /* Level 1 - Subtle */
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 
              0 2px 4px -2px rgb(0 0 0 / 0.1);          /* Level 2 - Cards */
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 
              0 4px 6px -4px rgb(0 0 0 / 0.1);          /* Level 3 - Raised */
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 
              0 8px 10px -6px rgb(0 0 0 / 0.1);          /* Level 4 - Floating */
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25); /* Level 5 - Modals */
}
```

## 🧩 Component Architecture

### 1. Component Hierarchy

```
src/components/
├── ui/                          # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown.tsx
│   └── ...
├── layout/                       # Layout components
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── footer.tsx
│   └── navigation.tsx
├── forms/                        # Form components
│   ├── task-form.tsx
│   ├── client-form.tsx
│   ├── user-form.tsx
│   └── ...
├── charts/                       # Data visualization
│   ├── task-chart.tsx
│   ├── performance-chart.tsx
│   └── ...
├── dashboard/                    # Dashboard specific
│   ├── stats-card.tsx
│   ├── task-list.tsx
│   └── calendar.tsx
├── tasks/                        # Task management
│   ├── task-card.tsx
│   ├── task-detail.tsx
│   ├── task-list.tsx
│   └── workflow/
├── clients/                      # Client management
│   ├── client-card.tsx
│   ├── client-list.tsx
│   └── client-detail.tsx
└── workflow/                     # PPF workflow
    ├── step-progress.tsx
    ├── zone-selector.tsx
    └── quality-check.tsx
```

### 2. Base Component Examples

#### Button Component
```typescript
// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-base font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--rpma-teal))] text-white hover:bg-[hsl(var(--rpma-teal))]/90 active:bg-[hsl(var(--rpma-teal))]/80 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        outline: "border border-[hsl(var(--rpma-border))] bg-white hover:bg-[hsl(var(--rpma-surface))]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2 rounded-[6px]",
        sm: "px-3 py-1.5 rounded-sm text-sm",
        lg: "px-6 py-3 rounded-lg text-lg",
        xl: "px-8 py-4 rounded-xl text-xl",
        icon: "size-10 rounded-[6px]",
        "icon-sm": "size-8 rounded-[6px]",
        "icon-lg": "size-12 rounded-[6px]",
        touch: "min-h-[44px] px-6 py-2 rounded-[6px]", // WCAG minimum
        "touch-lg": "min-h-[48px] px-8 py-3 rounded-[6px]",
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
```

#### Card Component
```typescript
// src/components/ui/card.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"
```

### 3. Complex Components

#### Task Card Component
```typescript
// src/components/tasks/TaskCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onView?: (task: Task) => void;
  className?: string;
}

export function TaskCard({ task, onEdit, onView, className }: TaskCardProps) {
  const statusColor = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }[task.status];

  const priorityColor = {
    low: 'bg-blue-500',
    medium: 'bg-amber-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  }[task.priority];

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{task.title}</h3>
              <div className={cn("w-2 h-2 rounded-full", priorityColor)} />
            </div>
            <p className="text-muted-foreground text-sm line-clamp-2">
              {task.description}
            </p>
          </div>
          <Badge variant="secondary" className={statusColor}>
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Vehicle Info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Véhicule:</span>
            <span>{task.vehicle_plate} - {task.vehicle_model}</span>
          </div>
          
          {/* Schedule Info */}
          {task.scheduled_date && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Planifié:</span>
              <span>
                {formatRelative(new Date(task.scheduled_date), new Date(), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </span>
            </div>
          )}
          
          {/* PPF Zones */}
          {task.ppf_zones && task.ppf_zones.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.ppf_zones.map((zone, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {zone}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onView?.(task)}
            >
              Détails
            </Button>
            <Button 
              size="sm"
              onClick={() => onEdit?.(task)}
            >
              Modifier
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 📱 Responsive Design Strategy

### 1. Breakpoint System

```css
/* Tailwind default breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### 2. Mobile-First Approach

```typescript
// src/components/layouts/ResponsiveLayout.tsx
import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1023px)');

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <MobileNavigation />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={isTablet} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

## 🎭 Animations and Transitions

### 1. Animation Tokens

```css
:root {
  /* Duration */
  --transition-fast: 150ms;
  --transition-base: 200ms;
  --transition-slow: 300ms;
  
  /* Easing Functions */
  --ease-out: cubic-bezier(0.0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2. Keyframe Animations

```css
/* Core animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px); 
  }
  to { 
    opacity: 1;
    transform: translateY(0); 
  }
}

@keyframes slideInRight {
  from { 
    opacity: 0;
    transform: translateX(100%); 
  }
  to { 
    opacity: 1;
    transform: translateX(0); 
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 3. Animation Components

```typescript
// src/components/ui/animations.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const FadeIn = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export const SlideUp = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export const AnimatedList = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 }
      }
    }}
  >
    {children}
  </motion.div>
);
```

## ♿ Accessibility Guidelines

### 1. WCAG 2.1 AA Compliance

#### Color Contrast
```css
/* All text meets 4.5:1 contrast ratio */
.text-on-primary {
  color: hsl(var(--rpma-foreground));
  background-color: hsl(var(--rpma-primary));
}

.text-on-surface {
  color: hsl(var(--card-foreground));
  background-color: hsl(var(--card));
}
```

#### Focus Management
```typescript
// src/components/ui/focus-trap.tsx
import React, { useEffect, useRef } from 'react';

export function FocusTrap({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    firstElement?.focus();

    // Trap focus within container
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const elements = Array.from(focusableElements) as HTMLElement[];
        const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
        
        let nextIndex;
        if (e.shiftKey) {
          nextIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= elements.length - 1 ? 0 : currentIndex + 1;
        }
        
        e.preventDefault();
        elements[nextIndex]?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus when unmounting
      previousFocusRef.current?.focus();
    };
  }, []);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}
```

#### Screen Reader Support
```typescript
// src/components/ui/accessible-button.tsx
import React from 'react';
import { Button } from './button';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  children?: React.ReactNode;
}

export function AccessibleButton({ 
  'aria-label': ariaLabel, 
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  children,
  ...props 
}: AccessibleButtonProps) {
  return (
    <Button
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      {...props}
    >
      {children}
    </Button>
  );
}
```

### 2. Keyboard Navigation

```typescript
// src/hooks/useKeyboardNavigation.ts
import { useEffect, useCallback } from 'react';

export function useKeyboardNavigation(
  items: Array<{ id: string; element: HTMLElement }>,
  onSelect?: (id: string) => void
) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(items[selectedIndex]?.id);
        break;
    }
  }, [items, selectedIndex, onSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    items[selectedIndex]?.element?.focus();
  }, [selectedIndex, items]);
}
```

## 📐 Layout Patterns

### 1. Dashboard Layout
```typescript
// src/components/layouts/DashboardLayout.tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MainContent } from './MainContent';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
}
```

### 2. Form Layout
```typescript
// src/components/forms/FormLayout.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface FormLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FormLayout({ 
  title, 
  description, 
  children, 
  actions,
  className 
}: FormLayoutProps) {
  return (
    <div className={cn("max-w-2xl mx-auto p-6", className)}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>
      
      {/* Form Content */}
      <div className="space-y-6 mb-8">
        {children}
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="flex justify-end gap-3 pt-6 border-t">
          {actions}
        </div>
      )}
    </div>
  );
}
```

## 🎯 Component Patterns

### 1. Compound Components
```typescript
// src/components/ui/dialog.tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
}
```

### 2. State Management Patterns
```typescript
// src/components/ui/data-table.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: keyof T;
    label: string;
    render?: (value: any, row: T) => React.ReactNode;
    sortable?: boolean;
  }[];
  sortable?: boolean;
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  sortable = true,
  onSort
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof T) => {
    if (!sortable) return;
    
    const newDirection = 
      sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortColumn(column);
    setSortDirection(newDirection);
    onSort?.(column, newDirection);
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  return (
    <div className="w-full overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((column) => (
              <th
                key={column.key as string}
                className="px-4 py-3 text-left font-medium"
              >
                {sortable && column.sortable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort(column.key)}
                    className="h-auto p-0 font-semibold"
                  >
                    {column.label}
                    {sortColumn === column.key && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index} className="border-b hover:bg-muted/50">
              {columns.map((column) => (
                <td key={column.key as string} className="px-4 py-3">
                  {column.render ? (
                    column.render(row[column.key], row)
                  ) : (
                    row[column.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 🔄 State Management Integration

### 1. Zustand Store Pattern
```typescript
// src/lib/stores/uiStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        setTheme: (theme) => set({ theme }),
        
        sidebarCollapsed: false,
        toggleSidebar: () => set(state => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        
        isLoading: false,
        setLoading: (loading) => set({ isLoading: loading }),
        
        notifications: [],
        addNotification: (notification) => set(state => ({
          notifications: [...state.notifications, { ...notification, id: crypto.randomUUID() }]
        })),
        removeNotification: (id) => set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);
```

### 2. Component Store Integration
```typescript
// src/components/theme-toggle.tsx
import React from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { Moon, Sun, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded ${theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        aria-label="Thème clair"
      >
        <Sun className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded ${theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        aria-label="Thème sombre"
      >
        <Moon className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded ${theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        aria-label="Thème système"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}
```

## 📱 Mobile Optimization

### 1. Touch-Friendly Components
```typescript
// src/components/ui/mobile-button.tsx
import React from 'react';
import { Button } from './button';

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'default' | 'large';
}

export function MobileButton({ 
  size = 'default', 
  className, 
  children, 
  ...props 
}: MobileButtonProps) {
  const sizeClasses = {
    default: 'min-h-[44px] px-6 py-2',
    large: 'min-h-[48px] px-8 py-3 text-lg',
  };

  return (
    <Button
      className={`${sizeClasses[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </Button>
  );
}
```

### 2. Swipe Gestures
```typescript
// src/components/ui/swipe-actions.tsx
import React, { useRef, useState } from 'react';

interface SwipeActionsProps {
  children: React.ReactNode;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function SwipeActions({ 
  children, 
  leftActions, 
  rightActions,
  onSwipeLeft,
  onSwipeRight 
}: SwipeActionsProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 120;
    const constrainedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    
    setTranslateX(constrainedDiff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Trigger actions based on swipe distance
    if (Math.abs(translateX) > 50) {
      if (translateX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (translateX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // Reset position
    setTranslateX(0);
  };

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Left Actions (revealed on right swipe) */}
      {leftActions && (
        <div 
          className="absolute inset-y-0 left-0 flex items-center pl-4 bg-red-500 text-white"
          style={{ 
            width: `${Math.max(0, translateX)}px`,
            opacity: Math.abs(translateX) / 120
          }}
        >
          {leftActions}
        </div>
      )}
      
      {/* Right Actions (revealed on left swipe) */}
      {rightActions && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center pr-4 bg-blue-500 text-white"
          style={{ 
            width: `${Math.max(0, -translateX)}px`,
            opacity: Math.abs(translateX) / 120
          }}
        >
          {rightActions}
        </div>
      )}
      
      {/* Main Content */}
      <div
        className="relative bg-background transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
```

## 🔧 Development Guidelines

### 1. Component Creation Checklist

- [ ] **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- [ ] **Responsive**: Mobile-first design, breakpoints tested
- [ ] **Performance**: React.memo, useCallback, useMemo where appropriate
- [ ] **TypeScript**: Strong typing, no any types
- [ ] **Testability**: Test-friendly structure, test file created
- [ ] **Documentation**: JSDoc comments, props interface documented
- [ ] **Error Boundaries**: Graceful error handling
- [ ] **Loading States**: Skeleton loaders or spinners
- [ ] **Empty States**: Meaningful empty state displays

### 2. Performance Guidelines

```typescript
// src/components/ui/optimized-list.tsx
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface OptimizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: (index: number) => number;
}

export function OptimizedList<T>({ 
  items, 
  itemHeight, 
  renderItem,
  estimateSize 
}: OptimizedListProps<T>) {
  const memoizedItems = useMemo(() => items, [items]);
  const memoizedRenderItem = useMemo(() => renderItem, [renderItem]);

  return (
    <List
      height={600}
      itemCount={memoizedItems.length}
      itemSize={estimateSize || itemHeight}
      itemData={memoizedItems}
    >
      {({ index, style, data }) => (
        <div style={style}>
          {memoizedRenderItem(data[index], index)}
        </div>
      )}
    </List>
  );
}
```

---

*Cette documentation du design system est un guide vivant qui évolue avec l'application RPMA v2.*