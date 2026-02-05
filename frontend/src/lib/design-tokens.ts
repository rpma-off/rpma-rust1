// Design tokens for consistent styling across the RPMA frontend
// This file centralizes all design-related constants

export const designTokens = {
  // Color palette - v2 Design System (Teal-based)
  colors: {
    // Primary brand colors (Teal - v2 Design System)
    primary: '#2ecaa0',
    primaryHover: '#28b892',
    primaryActive: '#22a584',

    // Secondary colors (Dark Slate)
    secondary: '#1E293B',
    secondaryHover: '#334155',
    secondaryActive: '#0F172A',
    secondaryForeground: '#F5F7FA',

    // Background colors
    background: '#FFFFFF', // Light mode background
    backgroundDark: '#111827', // Dark mode background
    surface: '#f5f6f7', // Light surface
    surfaceMuted: '#f5f6f7', // Light gray surface
    surfaceElevated: '#FFFFFF', // Card background
    surfaceOverlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay

    // Text colors
    textPrimary: '#0A1929', // Foreground (light mode)
    textPrimaryDark: '#F9FAFB', // Text primary (dark mode)
    textSecondary: '#6B7280', // Muted foreground
    textTertiary: '#9CA3AF', // Tertiary text
    
    // Sidebar specific colors
    sidebarBackground: '#FFFFFF', // White background
    sidebarActive: '#1ad1ba', // Teal for active items
    sidebarInactive: '#94A3B8', // Light Gray for inactive items
    sidebarActiveBg: '#e6f9f7', // Teal-light background for active items

    // Border colors
    border: '#e3e6ea', // Border (light mode)
    borderSoft: '#EEF2F7',
    borderDark: '#4B5563', // Border (dark mode)
    borderLight: '#F3F4F6',

    // Status colors (unchanged - already v2 compliant)
    success: '#10B981', // Green
    warning: '#F59E0B', // Amber
    error: '#EF4444', // Red
    info: '#3B82F6', // Blue

    // Priority colors
    priority: {
      low: '#3B82F6', // Blue
      medium: '#F59E0B', // Amber
      high: '#F97316', // Deep Orange
      urgent: '#EF4444', // Red
    },

    // Workflow status colors
    workflow: {
      draft: '#6B7280', // Gray
      scheduled: '#3B82F6', // Blue
      inProgress: '#F59E0B', // Amber
      completed: '#10B981', // Green
      cancelled: '#EF4444', // Red
    },

    // Chart colors (Teal-first palette)
    chart1: '#14B8A6', // Teal (primary)
    chart2: '#3B82F6', // Blue
    chart3: '#F59E0B', // Amber
    chart4: '#10B981', // Green
    chart5: '#F97316', // Orange
  },

  // Spacing scale (4px increments)
  spacing: {
    xs: '4px',   // 1
    sm: '8px',   // 2
    md: '16px',  // 4
    lg: '24px',  // 6
    xl: '32px',  // 8
    '2xl': '48px', // 12
    '3xl': '64px', // 16
    '4xl': '72px', // 18 - NEW
    '5xl': '80px', // 20 - NEW
  },

  // Border radius
  radius: {
    sm: '6px',   // rounded-sm
    md: '8px',   // rounded-md
    lg: '12px',  // rounded-lg
    xl: '16px',  // rounded-xl
    '2xl': '20px', // rounded-2xl
  },

  // Typography scale - v2 Design System
  typography: {
    // Headings
    heading1: 'text-5xl font-bold text-foreground',
    heading2: 'text-4xl font-bold text-foreground',
    heading3: 'text-3xl font-semibold text-foreground',
    heading4: 'text-xl font-semibold text-foreground',

    // Body text
    bodyLarge: 'text-lg text-foreground',
    body: 'text-base text-foreground',
    bodySmall: 'text-sm text-muted-foreground',

    // Labels and captions
    label: 'text-sm font-medium text-foreground',
    caption: 'text-xs text-muted-foreground',
    tiny: 'text-2xs font-medium text-muted-foreground',
  },

  // Shadows
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    colored: 'shadow-accent/25',
  },

  // Animation durations
  animations: {
    instant: '150ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Z-index scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },

  // Breakpoints (for reference)
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

// Utility functions for consistent styling
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'success':
      return designTokens.colors.success;
    case 'in_progress':
    case 'warning':
      return designTokens.colors.warning;
    case 'pending':
      case 'error':
      return designTokens.colors.error;
    case 'cancelled':
      return designTokens.colors.textTertiary;
    default:
      return designTokens.colors.info;
  }
};

export const getWorkflowColor = (status: string) => {
  const workflowColors = designTokens.colors.workflow;
  switch (status) {
    case 'draft':
      return workflowColors.draft;
    case 'scheduled':
      return workflowColors.scheduled;
    case 'in_progress':
      return workflowColors.inProgress;
    case 'completed':
      return workflowColors.completed;
    case 'cancelled':
      return workflowColors.cancelled;
    default:
      return designTokens.colors.textSecondary;
  }
};

export const getPriorityColor = (priority: string) => {
  const priorityColors = designTokens.colors.priority;
  switch (priority) {
    case 'low':
      return priorityColors.low;
    case 'medium':
      return priorityColors.medium;
    case 'high':
      return priorityColors.high;
    case 'urgent':
      return priorityColors.urgent;
    default:
      return designTokens.colors.textSecondary;
  }
};

export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

// Common component styles - v2 Design System
export const componentStyles = {
  card: `bg-card rounded-xl border border-border shadow-md backdrop-blur-sm`,
  cardHover: `hover:bg-card hover:border-primary hover:shadow-lg transition-all duration-200`,
  buttonPrimary: `bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200`,
  buttonSecondary: `border-border hover:bg-muted hover:text-foreground transition-all duration-200`,
  input: `bg-background border-border rounded-md text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition-all duration-200`,
};
