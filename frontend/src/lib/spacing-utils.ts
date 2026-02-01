// Spacing utilities for consistent layout across the application
// Uses the design tokens spacing scale

import { designTokens } from './design-tokens';

export const spacing = designTokens.spacing;

// Common spacing patterns used across the app
export const layoutSpacing = {
  // Page layouts
  pagePadding: 'p-4 md:p-6 lg:p-8',
  pagePaddingLarge: 'p-6 md:p-8 lg:p-10',

  // Section spacing
  sectionGap: 'space-y-6 md:space-y-8',
  sectionGapSmall: 'space-y-4 md:space-y-6',

  // Card spacing
  cardPadding: 'p-4 md:p-6',
  cardPaddingLarge: 'p-6 md:p-8',

  // Grid gaps
  gridGap: 'gap-4 md:gap-6',
  gridGapSmall: 'gap-3 md:gap-4',

  // Flex gaps
  flexGap: 'gap-2 md:gap-3',
  flexGapLarge: 'gap-4 md:gap-6',

  // Margin utilities
  marginBottom: 'mb-4 md:mb-6',
  marginBottomLarge: 'mb-6 md:mb-8',
  marginTop: 'mt-4 md:mt-6',
  marginTopLarge: 'mt-6 md:mt-8',
};

// Responsive spacing utilities
export const responsiveSpacing = {
  // Padding
  p: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
    '2xl': 'p-10',
  },

  // Margins
  m: {
    xs: 'm-2',
    sm: 'm-3',
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8',
  },

  // Gaps
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },

  // Space between
  space: {
    xs: 'space-y-2',
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },
};

// Touch-friendly spacing (minimum 44px touch targets)
export const touchSpacing = {
  minTouchTarget: 'min-h-[44px] min-w-[44px]',
  touchPadding: 'p-3', // 12px padding = 44px total with content
  touchMargin: 'm-1', // Compensate for padding if needed
};

// Animation spacing (for smooth transitions)
export const animationSpacing = {
  slideIn: 'translate-x-0 opacity-100',
  slideOut: '-translate-x-4 opacity-0',
  fadeIn: 'opacity-100',
  fadeOut: 'opacity-0',
};