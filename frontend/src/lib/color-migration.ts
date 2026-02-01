// Utility functions for migrating from legacy theming to Teal v2 design system
// This helps systematic replacement of color classes across the codebase

export const legacyToV2Mapping = {
  // Primary colors
  'accent': 'accent',
  'accent/90': 'accent/90',
  'accent/80': 'accent/80',
  'accent/70': 'accent/70',
  'accent/50': 'accent/50',
  'accent/30': 'accent/30',
  'accent/25': 'accent/25',
  'accent/20': 'accent/20',
  'accent/10': 'accent/10',

  // Background colors
  'background': 'background',
  'muted': 'muted',
  'border': 'border',
  'border-light': 'muted-foreground',
  'border/20': 'border/20',
  'border/30': 'border/30',
  'border/40': 'border/40',
  'border/50': 'border/50',
  'border/60': 'border/60',
  'border/70': 'border/70',
  'border/80': 'border/80',
  'border/90': 'border/90',

  // Surface colors
  'bg-background': 'bg-background',
  'bg-muted': 'bg-muted',
  'bg-border': 'bg-border',
  'bg-border/5': 'bg-muted/5',
  'bg-border/10': 'bg-muted/10',
  'bg-border/20': 'bg-muted/20',
  'bg-border/30': 'bg-muted/30',
  'bg-border/50': 'bg-muted/50',
  'bg-border/70': 'bg-muted/70',

  // Text colors
  'foreground': 'foreground',
  'text-foreground': 'text-foreground',
  'text-border-light': 'text-muted-foreground',
  'text-border': 'text-muted-foreground',
  'text-muted': 'text-muted-foreground',

  // Border colors
  'border-border': 'border',
  'border-border/20': 'border/20',
  'border-border/30': 'border/30',
  'border-border/40': 'border/40',
  'border-border/50': 'border/50',
  'border-accent': 'accent',
  'border-accent/30': 'accent/30',
  'border-accent/50': 'accent/50',

  // Hover states
  'hover:bg-muted/80': 'hover:bg-muted',
  'hover:bg-border/10': 'hover:bg-muted/10',
  'hover:bg-border/20': 'hover:bg-muted/20',
  'hover:bg-accent': 'hover:bg-accent',
  'hover:bg-accent/90': 'hover:bg-accent/90',
  'hover:bg-accent/80': 'hover:bg-accent/80',
  'hover:text-foreground': 'hover:text-foreground',
  'hover:text-border-light': 'hover:text-muted-foreground',
  'hover:border-accent': 'hover:border-accent',
  'hover:border-accent/50': 'hover:border-accent/50',

  // Focus states
  'focus:border-accent': 'focus:border-accent',
  'focus:ring-accent': 'focus:ring-accent',
  'focus:ring-accent/50': 'focus:ring-accent/50',
  'focus:ring-2': 'focus:ring-2',
  'focus:ring-4': 'focus:ring-4',

  // Shadow colors
  'shadow-accent': 'shadow-accent',
  'shadow-accent/10': 'shadow-accent/10',
  'shadow-accent/25': 'shadow-accent/25',
  'shadow-accent/50': 'shadow-accent/50',

  // Gradient backgrounds
  'from-accent': 'from-accent',
  'from-accent/90': 'from-accent/90',
  'to-accent/80': 'to-accent/80',
  'to-accent/60': 'to-accent/60',
  'from-accent/20': 'from-accent/20',
  'to-accent/10': 'to-accent/10',
  'from-border': 'from-muted',
  'to-border/5': 'to-muted/5',
  'from-border/10': 'from-muted/10',

  // Placeholder and special states
  'placeholder-border-light': 'placeholder-muted-foreground',
  'ring-offset-background': 'ring-offset-background',
};

// Function to convert legacy color classes to v2 design system
export const convertLegacyToV2 = (className: string): string => {
  if (!className || typeof className !== 'string') {
    return className;
  }

  let converted = className;
  
  // Convert each mapping
  Object.entries(legacyToV2Mapping).forEach(([legacy, v2]) => {
    const regex = new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    converted = converted.replace(regex, v2);
  });

  return converted;
};

// Function to batch convert class strings
export const convertClasses = (classes: string[]): string[] => {
  return classes.map(convertLegacyToV2);
};

// Function to process Tailwind class strings with proper spacing
export const processClassString = (classString: string): string => {
  if (!classString) return '';
  
  const classes = classString.split(' ').filter(Boolean);
  const converted = convertClasses(classes);
  return converted.join(' ');
};

// Validation functions
export const hasLegacyClasses = (className: string): boolean => {
  return /spotify-/.test(className);
};

export const validateConversion = (original: string, converted: string): boolean => {
  return original !== converted && !hasLegacyClasses(converted);
};