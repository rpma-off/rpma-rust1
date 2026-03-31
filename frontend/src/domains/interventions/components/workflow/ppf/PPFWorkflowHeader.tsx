'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePPFWorkflow } from '../../../api/PPFWorkflowProvider';

export function PPFWorkflowHeader() {
  const router = useRouter();
  const { taskId, currentStep } = usePPFWorkflow();

  return (
    <motion.header
      className="border-b border-[hsl(var(--rpma-border))] bg-white/95 shadow-sm backdrop-blur-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <motion.div
            className="flex items-center space-x-4"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Button
              onClick={() => router.push(`/tasks/${taskId}`)}
              variant="ghost"
              size="sm"
              className="rounded-lg px-3 py-2 text-muted-foreground transition-all duration-200 hover:bg-[hsl(var(--rpma-surface))] hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform hover:-translate-x-1" />
              Retour à la tâche
            </Button>
            <div className="h-6 w-px bg-[hsl(var(--rpma-border))]" />
            <div className="flex items-center space-x-3">
              <motion.div
                className="rounded-lg bg-[hsl(var(--rpma-teal))]/10 p-2"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <Shield className="h-6 w-6 text-[hsl(var(--rpma-teal))]" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Parcours PPF</h1>
                <p className="text-xs text-muted-foreground">Installation professionnelle</p>
              </div>
            </div>
          </motion.div>

          {currentStep?.title && (
            <motion.div
              className="text-right"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="mb-1 flex items-center justify-end space-x-2">
                <Sparkles className="h-4 w-4 animate-pulse text-[hsl(var(--rpma-teal))]" />
                <p className="text-sm font-medium text-muted-foreground">Étape actuelle</p>
              </div>
              <p className="text-lg font-bold text-foreground">{currentStep.title}</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
