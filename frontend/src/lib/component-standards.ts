// Component standards and patterns for consistent UI across the application

import { designTokens, componentStyles } from './design-tokens';
import { layoutSpacing } from './spacing-utils';

// Standard page layout structure
export const pageLayout = {
  // Page container
  container: 'max-w-7xl mx-auto px-4 md:px-6 lg:px-8',

  // Page header
  header: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 md:mb-8',
  headerTitle: designTokens.typography.heading2,
  headerSubtitle: 'text-border-light text-base',

  // Page sections
  section: `${layoutSpacing.sectionGap} ${componentStyles.card} ${componentStyles.cardHover}`,
  sectionHeader: 'flex items-center gap-3 mb-4 md:mb-6',
  sectionTitle: designTokens.typography.heading3,
  sectionSubtitle: 'text-border-light text-sm',
};

// Card component standards
export const cardStandards = {
  // Base card styles
  base: componentStyles.card,
  hover: componentStyles.cardHover,
  interactive: `${componentStyles.card} ${componentStyles.cardHover} cursor-pointer`,

  // Card content spacing
  content: layoutSpacing.cardPadding,
  contentLarge: layoutSpacing.cardPaddingLarge,

  // Card headers
  header: 'flex items-start justify-between gap-3 mb-4',
  headerCompact: 'flex items-center justify-between gap-3 mb-3',

  // Card sections
  section: 'space-y-3',
  sectionBordered: 'border-t border-border/20 pt-4 mt-4 space-y-3',
};

// Button standards
export const buttonStandards = {
  // Primary actions
  primary: componentStyles.buttonPrimary,
  primaryLarge: `${componentStyles.buttonPrimary} px-6 py-3 text-base`,

  // Secondary actions
  secondary: componentStyles.buttonSecondary,
  secondaryLarge: `${componentStyles.buttonSecondary} px-6 py-3 text-base`,

  // Sizes
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4',
  lg: 'h-10 px-6 text-base',
  xl: 'h-12 px-8 text-lg',

  // Touch-friendly (minimum 44px)
  touch: 'min-h-[44px] px-4',
};

// Form standards
export const formStandards = {
  // Input styles
  input: componentStyles.input,
  inputError: `${componentStyles.input} border-red-500/50 focus:ring-red-500/50`,
  inputSuccess: `${componentStyles.input} border-green-500/50 focus:ring-green-500/50`,

  // Label styles
  label: designTokens.typography.label,
  labelRequired: `${designTokens.typography.label} after:content-['*'] after:text-red-500 after:ml-1`,

  // Form layout
  field: 'space-y-2',
  fieldRow: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  fieldRow3: 'grid grid-cols-1 md:grid-cols-3 gap-4',

  // Form actions
  actions: 'flex flex-col sm:flex-row gap-3 sm:justify-end pt-6 border-t border-border/20',
};

// Table standards
export const tableStandards = {
  // Table container
  container: 'bg-muted/50 rounded-xl border border-border/20 overflow-hidden',

  // Table header
  header: 'bg-muted/80 border-b border-border/30',
  headerCell: 'px-4 py-3 text-left text-sm font-semibold text-foreground',

  // Table body
  body: 'divide-y divide-border/20',
  row: 'hover:bg-muted/40 transition-colors duration-150',
  rowInteractive: 'hover:bg-muted/40 cursor-pointer transition-colors duration-150',

  // Table cells
  cell: 'px-4 py-3 text-sm text-border-light',
  cellPrimary: 'px-4 py-3 text-sm font-medium text-foreground',
};

// Loading and skeleton standards
export const loadingStandards = {
  // Skeleton base
  skeleton: 'bg-border/30 rounded animate-pulse',

  // Skeleton sizes
  skeletonText: 'h-4 w-full',
  skeletonTextLarge: 'h-5 w-3/4',
  skeletonAvatar: 'h-10 w-10 rounded-full',
  skeletonButton: 'h-9 w-24 rounded-md',
  skeletonCard: 'h-32 w-full rounded-xl',

  // Loading spinner
  spinner: 'animate-spin text-accent',
  spinnerSm: 'h-4 w-4',
  spinnerMd: 'h-6 w-6',
  spinnerLg: 'h-8 w-8',
};

// Animation standards
export const animationStandards = {
  // Page transitions
  pageEnter: 'animate-in fade-in slide-in-from-bottom-4 duration-300',
  pageExit: 'animate-out fade-out slide-out-to-bottom-4 duration-200',

  // Component animations
  fadeIn: 'animate-in fade-in duration-300',
  slideIn: 'animate-in slide-in-from-right-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-200',

  // Hover animations
  hoverLift: 'hover:scale-[1.02] hover:shadow-lg transition-all duration-200',
  hoverGlow: 'hover:shadow-accent/25 transition-shadow duration-200',

  // Loading animations
  pulse: 'animate-pulse',
  spin: 'animate-spin',
};

// Responsive standards
export const responsiveStandards = {
  // Hide/show breakpoints
  hiddenMobile: 'hidden md:block',
  hiddenDesktop: 'block md:hidden',
  showMobile: 'block md:hidden',
  showDesktop: 'hidden md:block',

  // Grid layouts
  gridResponsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6',
  gridCards: 'grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',

  // Flex layouts
  flexResponsive: 'flex flex-col sm:flex-row gap-4',
  flexActions: 'flex flex-col sm:flex-row gap-3 sm:justify-end',
};

// Accessibility standards
export const accessibilityStandards = {
  // Focus styles
  focus: 'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',

  // Screen reader only
  srOnly: 'sr-only',

  // ARIA attributes helpers
  aria: {
    button: 'role="button" tabIndex={0}',
    dialog: 'role="dialog" aria-modal="true"',
    menu: 'role="menu"',
    menuitem: 'role="menuitem"',
  },

  // Color contrast (ensured by design tokens)
  contrast: {
    high: 'text-foreground', // 21:1 contrast
    medium: 'text-border-light', // 7:1 contrast
    low: 'text-border', // 4.5:1 contrast
  },
};

// Utility functions for consistent component creation
export const createCardClass = (interactive = false, size: 'sm' | 'md' | 'lg' = 'md') => {
  const base = cardStandards.base;
  const hover = interactive ? cardStandards.hover : '';
  const padding = size === 'sm' ? cardStandards.content : size === 'lg' ? cardStandards.contentLarge : cardStandards.content;

  return `${base} ${hover} ${padding}`.trim();
};

export const createButtonClass = (variant: 'primary' | 'secondary', size: 'sm' | 'md' | 'lg' = 'md', touch = false) => {
  const base = variant === 'primary' ? buttonStandards.primary : buttonStandards.secondary;
  const sizeClass = buttonStandards[size];
  const touchClass = touch ? buttonStandards.touch : '';

  return `${base} ${sizeClass} ${touchClass}`.trim();
};

export const createInputClass = (state?: 'error' | 'success') => {
  const base = formStandards.input;
  const stateClass = state === 'error' ? formStandards.inputError : state === 'success' ? formStandards.inputSuccess : '';

  return `${base} ${stateClass}`.trim();
};