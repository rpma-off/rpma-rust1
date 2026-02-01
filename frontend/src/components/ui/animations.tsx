"use client"

import * as React from "react"
import { motion, HTMLMotionProps, Variants, MotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

// Enhanced animation variants from old-react
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
}

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
}

export const slideInFromTop: Variants = {
  initial: { opacity: 0, y: -30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 }
}

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
}

// Hover animations
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
}

export const hoverLift = {
  whileHover: { y: -2, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  transition: { type: "spring", stiffness: 300, damping: 30 }
}

// Loading animations
export const pulseAnimation = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
}

export const spinAnimation = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear" as const
    }
  }
}

// Page transition animations
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeInOut" as const }
}

// Card animations
export const cardAnimation = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
  transition: { duration: 0.2, ease: "easeOut" as const }
}

// Button animations
export const buttonAnimation = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring", stiffness: 400, damping: 17 }
}

// Form field animations
export const formFieldAnimation = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.2 }
}

// Success/Error animations
export const successAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring", stiffness: 500, damping: 30 }
}

export const errorShake = {
  animate: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.5 }
  }
}

// Legacy variants for backward compatibility
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
}

export const slideInVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
}

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } }
}

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

// Animated components
interface AnimatedCardProps extends MotionProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedCard = ({ children, className, ...props }: AnimatedCardProps) => (
  <motion.div
    className={className}
    variants={cardAnimation}
    initial="initial"
    animate="animate"
    exit="exit"
    whileHover="hover"
    {...props}
  >
    {children}
  </motion.div>
);

interface AnimatedButtonProps extends MotionProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedButton = ({ children, className, ...props }: AnimatedButtonProps) => (
  <motion.button
    className={className}
    variants={buttonAnimation}
    whileHover="whileHover"
    whileTap="whileTap"
    {...props}
  >
    {children}
  </motion.button>
);

interface AnimatedInputProps extends MotionProps {
  className?: string;
}

export const AnimatedInput = ({ className, ...props }: AnimatedInputProps) => (
  <motion.input
    className={className}
    variants={formFieldAnimation}
    initial="initial"
    animate="animate"
    {...props}
  />
);

export const LoadingSpinner = ({ size = "h-6 w-6", className = "" }: { size?: string; className?: string }) => (
  <motion.div
    className={`${size} border-2 border-gray-300 border-t-blue-600 rounded-full ${className}`}
    variants={spinAnimation}
    animate="animate"
  />
);

export const PulseLoader = ({ className = "" }: { className?: string }) => (
  <motion.div
    className={`h-4 bg-gray-300 rounded ${className}`}
    variants={pulseAnimation}
    animate="animate"
  />
);

// Animated wrapper components
interface AnimatedProps extends HTMLMotionProps<"div"> {
  animation?: "fadeIn" | "slideIn" | "slideUp" | "scaleIn"
  delay?: number
  duration?: number
  className?: string
}

export const Animated = React.forwardRef<HTMLDivElement, AnimatedProps>(
  ({ animation = "fadeIn", delay = 0, duration = 0.3, className, children, ...props }, ref) => {
    const variants = React.useMemo(() => {
      switch (animation) {
        case "fadeIn":
          return fadeInVariants
        case "slideIn":
          return slideInVariants
        case "slideUp":
          return slideUpVariants
        case "scaleIn":
          return scaleInVariants
        default:
          return fadeInVariants
      }
    }, [animation])

    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={{ delay, duration }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Animated.displayName = "Animated"

// Staggered animation container
interface StaggeredProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number
  className?: string
}

export const Staggered = React.forwardRef<HTMLDivElement, StaggeredProps>(
  ({ staggerDelay = 0.1, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: staggerDelay
            }
          }
        }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Staggered.displayName = "Staggered"

// Animated list item
interface AnimatedListItemProps extends HTMLMotionProps<"li"> {
  index?: number
  className?: string
}

export const AnimatedListItem = React.forwardRef<HTMLLIElement, AnimatedListItemProps>(
  ({ index = 0, className, children, ...props }, ref) => {
    return (
      <motion.li
        ref={ref}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.li>
    )
  }
)

AnimatedListItem.displayName = "AnimatedListItem"

// Page transition wrapper
interface PageTransitionProps extends HTMLMotionProps<"div"> {
  className?: string
}

export const PageTransition = React.forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

PageTransition.displayName = "PageTransition"

// Loading skeleton animation
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const SkeletonPulse = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("animate-pulse rounded-md bg-muted", className)}
        {...props}
      />
    )
  }
)

SkeletonPulse.displayName = "SkeletonPulse"

// Hover animation wrapper
interface HoverAnimatedProps extends HTMLMotionProps<"div"> {
  scale?: number
  className?: string
}

export const HoverAnimated = React.forwardRef<HTMLDivElement, HoverAnimatedProps>(
  ({ scale = 1.05, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ scale }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

HoverAnimated.displayName = "HoverAnimated"

