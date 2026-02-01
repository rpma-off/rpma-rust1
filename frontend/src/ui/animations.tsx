import { motion, Variants, MotionProps } from 'framer-motion';
import { ReactNode } from 'react';

// Common animation variants
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

export const slideInFromTop: Variants = {
  initial: { opacity: 0, y: -30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 }
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

// Hover animations
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
};

export const hoverLift = {
  whileHover: { y: -2, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  transition: { type: "spring", stiffness: 300, damping: 30 }
};

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
};

export const spinAnimation = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear" as const
    }
  }
};

// Page transition animations
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeInOut" as const }
};

// Card animations
export const cardAnimation = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
  transition: { duration: 0.2, ease: "easeOut" as const }
};

// Button animations
export const buttonAnimation = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring", stiffness: 400, damping: 17 }
};

// Form field animations
export const formFieldAnimation = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.2 }
};

// Success/Error animations
export const successAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring", stiffness: 500, damping: 30 }
};

export const errorShake = {
  animate: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.5 }
  }
};

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
