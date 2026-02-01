// Design tokens for consistent styling across the RPMA frontend
// This file centralizes all design-related constants

export const designTokens = {
  // Color palette - v2 Design System (Teal-based)
  colors: {
    // Primary brand colors (Dark Slate)
    primary: '#1E293B',
    primaryHover: '#334155',
    primaryActive: '#0F172A',

    // Accent colors (Teal)
    accent: '#14B8A6',
    accentHover: '#0D9488',
    accentActive: '#0F766E',

    // Background colors
    background: '#FFFFFF', // Light mode background
    backgroundDark: '#111827', // Dark mode background
    surface: '#F3F4F6', // Secondary/Gray 100
    surfaceElevated: '#FFFFFF', // Card background
    surfaceOverlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay

    // Text colors
    textPrimary: '#0A1929', // Foreground (light mode)
    textPrimaryDark: '#F9FAFB', // Text primary (dark mode)
    textSecondary: '#6B7280', // Muted foreground
    textTertiary: '#9CA3AF', // Tertiary text
    
    // Sidebar specific colors (Urable-style)
    sidebarBackground: '#1E293B', // Dark Slate for sidebar
    sidebarActive: '#FFFFFF', // White for active items
    sidebarInactive: '#94A3B8', // Light Gray for inactive items
    sidebarActiveBg: '#334155', // Active background hover

    // Border colors
    border: '#E5E7EB', // Border (light mode)
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
  cardHover: `hover:bg-card hover:border-accent hover:shadow-lg transition-all duration-200`,
  buttonPrimary: `bg-accent hover:bg-accent-hover text-accent-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200`,
  buttonSecondary: `border-border hover:bg-muted hover:text-foreground transition-all duration-200`,
  input: `bg-background border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-accent transition-all duration-200`,
};