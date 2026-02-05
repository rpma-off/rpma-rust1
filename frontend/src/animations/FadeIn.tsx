'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
  direction = 'up',
  distance = 20,
}: FadeInProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: distance, opacity: 0 };
      case 'down':
        return { y: -distance, opacity: 0 };
      case 'left':
        return { x: distance, opacity: 0 };
      case 'right':
        return { x: -distance, opacity: 0 };
      case 'none':
      default:
        return { opacity: 0 };
    }
  };

  const getFinalPosition = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { y: 0, opacity: 1 };
      case 'left':
      case 'right':
        return { x: 0, opacity: 1 };
      case 'none':
      default:
        return { opacity: 1 };
    }
  };

  return (
    <motion.div
      initial={getInitialPosition()}
      animate={getFinalPosition()}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // Smooth easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredFadeIn({
  children,
  staggerDelay = 0.1,
  initialDelay = 0,
  className = '',
}: {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn delay={initialDelay + index * staggerDelay} key={index}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}
