'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Clock, AlertCircle, Shield, Sparkles } from 'lucide-react';
import { usePPFWorkflow } from '@/contexts/PPFWorkflowContext';
import { getPPFStepPath } from '@/lib/ppf-workflow';
import { useTranslation } from '@/hooks/useTranslation';

export default function PPFWorkflowPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { taskId, currentStep, steps, canAdvanceToStep } = usePPFWorkflow();

  // Automatically navigate to the current step if it exists
  useEffect(() => {
    if (currentStep && currentStep.id) {
      router.replace(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(currentStep.id)}`);
    }
  }, [currentStep, router, taskId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'available':
        return <ArrowRight className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500/20 bg-green-500/5';
      case 'current':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'available':
        return 'border-yellow-500/20 bg-yellow-500/5';
      default:
        return 'border-gray-500/20 bg-gray-500/5';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
          {t('interventions.title')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t('common.loading')}
        </p>
      </motion.div>

      {/* Steps Grid */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto"
        variants={containerVariants}
      >
        {steps.map((step, index) => {
          const status =
            step.status === 'completed'
              ? 'completed'
              : step.id === currentStep?.id
                ? 'current'
                : canAdvanceToStep(step.id)
                  ? 'available'
                  : 'locked';
          const isAccessible = status !== 'locked';

          return (
            <motion.div
              key={step.id}
              variants={cardVariants}
              whileHover={isAccessible ? { scale: 1.02 } : {}}
              whileTap={isAccessible ? { scale: 0.98 } : {}}
            >
              <Card
                className={`group relative overflow-hidden transition-all duration-300 ${
                  getStatusColor(status)
                } ${
                  isAccessible
                    ? 'hover:shadow-[var(--rpma-shadow-soft)] cursor-pointer border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-teal))]'
                    : 'opacity-60 cursor-not-allowed'
                } backdrop-blur-sm`}
                onClick={() =>
                  isAccessible &&
                  router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(step.id)}`)
                }
              >
                {/* Step Number Badge */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-background/80 rounded-full flex items-center justify-center text-sm font-bold text-foreground border border-border">
                  {index + 1}
                </div>

                {/* Background Gradient Effect */}
                <div className="absolute inset-0 bg-[hsl(var(--rpma-surface))] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardHeader className="relative z-10 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <CardTitle className="text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors duration-300">
                      {step.title}
                    </CardTitle>
                    <div className={`p-2 rounded-full transition-all duration-300 ${
                      status === 'completed' ? 'bg-green-500/20' :
                      status === 'current' ? 'bg-blue-500/20' :
                      status === 'available' ? 'bg-yellow-500/20' :
                      'bg-gray-500/20'
                    }`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>
                  <CardDescription className="text-muted-foreground text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative z-10 pt-0">
                  <Button
                    disabled={!isAccessible}
                    className={`w-full h-12 text-base font-medium transition-all duration-300 ${
                      status === 'current'
                        ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-accent/25'
                        : 'hover:bg-muted border-border hover:border-primary/50'
                    }`}
                    variant={status === 'current' ? 'default' : 'outline'}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>
                        {status === 'completed' ? t('common.view') :
                         status === 'current' ? t('common.next') :
                         status === 'available' ? t('interventions.startIntervention') : 'Verrouillé'}
                      </span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Progress Summary */}
      <motion.div
        className="text-center pt-8 border-t border-[hsl(var(--rpma-border))]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <p className="text-muted-foreground text-sm">
          {t('interventions.steps')}
        </p>
      </motion.div>
    </motion.div>
  );
}
