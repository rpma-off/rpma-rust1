'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Clock, AlertCircle, Shield, Sparkles } from 'lucide-react';
import { usePPFWorkflow } from '@/contexts/PPFWorkflowContext';

const stepConfigs = [
  {
    id: 'inspection',
    title: 'Inspection',
    description: 'Document pre-existing damage and vehicle condition',
    path: 'steps/inspection'
  },
  {
    id: 'preparation',
    title: 'Preparation',
    description: 'Surface preparation and environment setup',
    path: 'steps/preparation'
  },
  {
    id: 'installation',
    title: 'Installation',
    description: 'PPF application and zone tracking',
    path: 'steps/installation'
  },
  {
    id: 'finalization',
    title: 'Finalization',
    description: 'Quality control and customer sign-off',
    path: 'steps/finalization'
  }
];

export default function PPFWorkflowPage() {
  const router = useRouter();
  const { taskId, currentStep, steps, canAdvanceToStep } = usePPFWorkflow();

  // Automatically navigate to the current step if it exists
  useEffect(() => {
    if (currentStep && currentStep.id) {
      const stepConfig = stepConfigs.find(config => config.id === currentStep.id);
      if (stepConfig) {
        router.replace(`/tasks/${taskId}/workflow/ppf/${stepConfig.path}`);
      }
    }
  }, [currentStep, router, taskId]);

  const getStepStatus = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return 'locked';

    if (step.status === 'completed') return 'completed';
    if (step.id === currentStep?.id) return 'current';
    if (canAdvanceToStep(stepId)) return 'available';

    return 'locked';
  };

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
          <div className="p-3 bg-accent/10 rounded-full">
            <Shield className="h-8 w-8 text-accent" />
          </div>
          <Sparkles className="h-6 w-6 text-accent animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-border-light bg-clip-text text-transparent mb-3">
          PPF Installation Workflow
        </h1>
        <p className="text-lg text-border-light max-w-2xl mx-auto leading-relaxed">
          Guided process for professional PPF application with precision and quality control
        </p>
      </motion.div>

      {/* Steps Grid */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto"
        variants={containerVariants}
      >
        {stepConfigs.map((stepConfig, index) => {
          const status = getStepStatus(stepConfig.id);
          const isAccessible = status !== 'locked';

          return (
            <motion.div
              key={stepConfig.id}
              variants={cardVariants}
              whileHover={isAccessible ? { scale: 1.02 } : {}}
              whileTap={isAccessible ? { scale: 0.98 } : {}}
            >
              <Card
                className={`group relative overflow-hidden transition-all duration-300 ${
                  getStatusColor(status)
                } ${
                  isAccessible
                    ? 'hover:shadow-2xl hover:shadow-accent/10 cursor-pointer border-accent/20 hover:border-accent/40'
                    : 'opacity-60 cursor-not-allowed'
                } backdrop-blur-sm`}
                onClick={() => isAccessible && router.push(`/tasks/${taskId}/workflow/ppf/${stepConfig.path}`)}
              >
                {/* Step Number Badge */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-background/80 rounded-full flex items-center justify-center text-sm font-bold text-foreground border border-border">
                  {index + 1}
                </div>

                {/* Background Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardHeader className="relative z-10 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <CardTitle className="text-xl md:text-2xl text-foreground group-hover:text-accent transition-colors duration-300">
                      {stepConfig.title}
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
                  <CardDescription className="text-border-light text-base leading-relaxed">
                    {stepConfig.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative z-10 pt-0">
                  <Button
                    disabled={!isAccessible}
                    className={`w-full h-12 text-base font-medium transition-all duration-300 ${
                      status === 'current'
                        ? 'bg-accent hover:bg-accent/90 shadow-lg shadow-accent/25'
                        : 'hover:bg-muted border-border hover:border-accent/50'
                    }`}
                    variant={status === 'current' ? 'default' : 'outline'}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>
                        {status === 'completed' ? 'Review' :
                         status === 'current' ? 'Continue' :
                         status === 'available' ? 'Start' : 'Locked'}
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
        className="text-center pt-8 border-t border-border/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <p className="text-border-light text-sm">
          Complete each step in order for optimal PPF installation results
        </p>
      </motion.div>
    </motion.div>
  );
}