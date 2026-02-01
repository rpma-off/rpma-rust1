// Typography and Spacing Utilities for RPMA Design System

// Typography Scale
export const typography = {
  // Display
  display: {
    1: 'text-6xl font-bold tracking-tight',
    2: 'text-5xl font-bold tracking-tight',
    3: 'text-4xl font-bold tracking-tight',
  },

  // Headings
  heading: {
    1: 'text-3xl font-bold tracking-tight',
    2: 'text-2xl font-bold tracking-tight',
    3: 'text-xl font-semibold tracking-tight',
    4: 'text-lg font-semibold',
    5: 'text-base font-semibold',
    6: 'text-sm font-semibold uppercase tracking-wider',
  },

  // Body Text
  body: {
    lg: 'text-lg leading-relaxed',
    base: 'text-base leading-relaxed',
    sm: 'text-sm leading-relaxed',
    xs: 'text-xs leading-relaxed',
  },

  // Labels and UI Text
  label: {
    lg: 'text-sm font-medium',
    base: 'text-sm font-medium',
    sm: 'text-xs font-medium uppercase tracking-wider',
  },

  // Captions
  caption: {
    base: 'text-xs text-muted-foreground',
    sm: 'text-2xs text-muted-foreground',
  },
} as const;

// Spacing Scale
export const spacing = {
  // Layout spacing
  layout: {
    section: 'py-16 md:py-20 lg:py-24',
    container: 'px-4 sm:px-6 lg:px-8',
    page: 'max-w-7xl mx-auto',
  },

  // Component spacing
  component: {
    card: 'p-6 md:p-8',
    cardCompact: 'p-4 md:p-6',
    modal: 'p-6 md:p-8',
    form: 'space-y-6',
    formGroup: 'space-y-2',
  },

  // Element spacing
  element: {
    gap: {
      xs: 'gap-2',
      sm: 'gap-3 md:gap-4',
      md: 'gap-4 md:gap-6',
      lg: 'gap-6 md:gap-8',
      xl: 'gap-8 md:gap-12',
    },
    margin: {
      xs: 'mb-2',
      sm: 'mb-4',
      md: 'mb-6',
      lg: 'mb-8 md:mb-10',
      xl: 'mb-12 md:mb-16',
    },
    padding: {
      xs: 'p-2',
      sm: 'p-3 md:p-4',
      md: 'p-4 md:p-6',
      lg: 'p-6 md:p-8',
      xl: 'p-8 md:p-12',
    },
  },
} as const;

// Color Utilities
export const colors = {
  // Status colors
  status: {
    success: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      icon: 'text-emerald-500',
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      icon: 'text-red-500',
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      icon: 'text-amber-500',
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      icon: 'text-blue-500',
    },
  },

  // Interactive states
  interactive: {
    hover: 'hover:bg-border/10 hover:border-border/30 transition-all duration-200',
    active: 'active:scale-95 transition-transform duration-100',
    focus: 'focus:ring-2 focus:ring-accent/50 focus:border-accent',
  },
} as const;

// Animation Utilities
export const animations = {
  entrance: {
    fadeIn: 'animate-in fade-in-0 duration-300',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
    slideDown: 'animate-in slide-in-from-top-4 duration-300',
    scaleIn: 'animate-in zoom-in-95 duration-200',
  },

  micro: {
    hover: 'hover:scale-105 transition-transform duration-200',
    press: 'active:scale-95 transition-transform duration-100',
    glow: 'hover:shadow-lg hover:shadow-accent/10 transition-shadow duration-200',
  },
} as const;

// Component Variants
export const variants = {
  card: {
    base: 'bg-border/5 border border-border/20 rounded-xl shadow-sm',
    elevated: 'bg-border/5 border border-border/20 rounded-xl shadow-lg',
    interactive: 'bg-border/5 border border-border/20 rounded-xl shadow-sm hover:shadow-md hover:border-border/30 transition-all duration-200 cursor-pointer',
  },

  button: {
    primary: 'bg-accent hover:bg-accent/90 text-black font-semibold shadow-lg hover:shadow-accent/25',
    secondary: 'bg-border/10 hover:bg-border/20 border border-border/30 text-foreground hover:border-border/50',
    ghost: 'hover:bg-border/10 text-border-light hover:text-foreground',
  },

  input: {
    base: 'bg-border/10 border border-border/30 rounded-lg text-foreground placeholder-border-light transition-all duration-200',
    focus: 'focus:border-accent focus:ring-2 focus:ring-accent/20',
    error: 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
  },
} as const;