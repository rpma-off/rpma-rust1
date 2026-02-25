'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock, ArrowRight } from 'lucide-react';

type Step = {
  id: string;
  status: string;
  title: string;
};

type PPFStepProgressProps = {
  steps: Step[];
  currentStepId?: string | null;
  canAdvanceToStep: (stepId: string) => boolean;
  onStepNavigate: (stepId: string) => void;
};

export function PPFStepProgress({
  steps,
  currentStepId,
  canAdvanceToStep,
  onStepNavigate,
}: PPFStepProgressProps) {
  const getStepIcon = (step: Step) => {
    if (step.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (step.id === currentStepId) {
      return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
    }
    return <Circle className="h-5 w-5 text-gray-500" />;
  };

  const getConnectorColor = (step: Step, nextStep?: Step) => {
    if (step.status === 'completed' && nextStep?.status === 'completed') return 'bg-green-500';
    if (step.status === 'completed') return 'bg-gradient-to-r from-green-500 to-blue-500';
    return 'bg-gray-500/30';
  };

  return (
    <motion.div
      className="bg-background/95 backdrop-blur-sm border-b border-border/30 shadow-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between relative">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.id === currentStepId;
            const isAvailable = canAdvanceToStep(step.id);
            const isAccessible = isCompleted || isCurrent || isAvailable;

            return (
              <React.Fragment key={step.id}>
                <motion.div
                  className="flex flex-col items-center group"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <motion.div
                    className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      isCompleted ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/25' :
                      isCurrent ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/10' :
                      'border-gray-500/50 bg-gray-500/10 hover:border-gray-400/70'
                    } ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    whileHover={isAccessible ? { scale: 1.05 } : undefined}
                    whileTap={isAccessible ? { scale: 0.95 } : undefined}
                    role="button"
                    tabIndex={isAccessible ? 0 : -1}
                    aria-disabled={!isAccessible}
                    aria-label={`Aller à l'étape ${index + 1}: ${step.title}`}
                    onClick={() => {
                      if (!isAccessible) return;
                      onStepNavigate(step.id);
                    }}
                    onKeyDown={(event) => {
                      if (!isAccessible) return;
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onStepNavigate(step.id);
                      }
                      if (event.key === ' ') {
                        event.preventDefault();
                      }
                    }}
                    onKeyUp={(event) => {
                      if (!isAccessible) return;
                      if (event.key === ' ') {
                        event.preventDefault();
                        onStepNavigate(step.id);
                      }
                    }}
                  >
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-blue-500/20"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    {getStepIcon(step)}

                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-blue-500 text-white' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {index + 1}
                    </span>
                  </motion.div>

                  <motion.span
                    className={`text-xs mt-3 font-semibold text-center max-w-20 leading-tight transition-colors duration-300 ${
                      isCompleted ? 'text-green-400' :
                      isCurrent ? 'text-blue-400' :
                      'text-gray-400 group-hover:text-gray-300'
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                  >
                    {step.title}
                  </motion.span>
                </motion.div>

                {index < steps.length - 1 && (
                  <motion.div
                    className="flex-1 mx-4 relative"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                    style={{ transformOrigin: 'left' }}
                  >
                    <div className={`h-0.5 rounded-full transition-all duration-500 ${getConnectorColor(step, steps[index + 1])}`} />

                    {isCurrent && (
                      <motion.div
                        className="absolute right-0 top-1/2 transform -translate-y-1/2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="h-3 w-3 text-blue-500" />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
