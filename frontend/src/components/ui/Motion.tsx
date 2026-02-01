'use client';

import React from 'react';
import { motion as FramerMotion, HTMLMotionProps } from 'framer-motion';

// Simple motion component that wraps framer-motion
export const Motion = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ children, ...props }, ref) => {
    return (
      <FramerMotion.div ref={ref} {...props}>
        {children}
      </FramerMotion.div>
    );
  }
);

Motion.displayName = 'Motion';

// Export the original framer-motion components
export { motion } from 'framer-motion';
export { AnimatePresence } from 'framer-motion';
export type { HTMLMotionProps, Variants, Transition } from 'framer-motion';