'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PPFWorkflowHeaderProps = {
  taskId: string;
  currentStepTitle?: string | null;
  onBack: (taskId: string) => void;
};

export function PPFWorkflowHeader({
  taskId,
  currentStepTitle,
  onBack,
}: PPFWorkflowHeaderProps) {
  return (
    <motion.header
      className="bg-white/95 backdrop-blur-sm border-b border-[hsl(var(--rpma-border))] shadow-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <motion.div
            className="flex items-center space-x-4"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Button
              onClick={() => onBack(taskId)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--rpma-surface))] transition-all duration-200 rounded-lg px-3 py-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform hover:-translate-x-1" />
              Retour à la tâche
            </Button>
            <div className="h-6 w-px bg-[hsl(var(--rpma-border))]" />
            <div className="flex items-center space-x-3">
              <motion.div
                className="p-2 bg-[hsl(var(--rpma-teal))]/10 rounded-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <Shield className="h-6 w-6 text-[hsl(var(--rpma-teal))]" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Workflow PPF</h1>
                <p className="text-xs text-muted-foreground">Installation professionnelle</p>
              </div>
            </div>
          </motion.div>

          {currentStepTitle && (
            <motion.div
              className="text-right"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="flex items-center space-x-2 mb-1 justify-end">
                <Sparkles className="h-4 w-4 text-[hsl(var(--rpma-teal))] animate-pulse" />
                <p className="text-sm font-medium text-muted-foreground">Étape actuelle</p>
              </div>
              <p className="text-lg font-bold text-foreground">{currentStepTitle}</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
