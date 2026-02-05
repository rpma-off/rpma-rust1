'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Eye, RefreshCw, BarChart3, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DataExplorer } from '@/app/reports/components/data-explorer/DataExplorer';



export default function DataExplorerPage() {
  return (
    <TooltipProvider>
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Enhanced Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-8"
          >
            <div className="rpma-shell p-6 md:p-8">
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-[hsl(var(--rpma-surface))] rounded-2xl border border-[hsl(var(--rpma-border))] shadow-[var(--rpma-shadow-soft)]"
                >
                  <Database className="h-8 w-8 md:h-10 md:w-10 text-[hsl(var(--rpma-teal))]" />
                </motion.div>

                <div className="space-y-3">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight"
                  >
                    Explorateur de Données
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                  >
                    Explorez, recherchez et analysez votre base de données PPF en temps réel.
                    Accédez à toutes vos données clients, tâches et interventions.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-2 md:gap-3"
                >
                  <Badge variant="secondary" className="px-3 py-1.5 bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
                    <Search className="h-3 w-3 mr-1.5" />
                    Recherche Avancée
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5 bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
                    <Eye className="h-3 w-3 mr-1.5" />
                    Vue Complète
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5 bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Temps Réel
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5 bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
                    <Shield className="h-3 w-3 mr-1.5" />
                    Sécurisé
                  </Badge>
                </motion.div>
              </div>
            </div>
          </motion.div>



          {/* Enhanced Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mb-8"
          >
            <div className="rpma-shell p-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">Actions rapides</h2>
                <p className="text-muted-foreground text-sm">Commencez à explorer vos données</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  size="lg"
                  className="font-semibold flex-1 sm:flex-none"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Commencer l&apos;Exploration
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border text-foreground hover:bg-[hsl(var(--rpma-surface))] flex-1 sm:flex-none"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Voir les Statistiques
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border text-foreground hover:bg-[hsl(var(--rpma-surface))] flex-1 sm:flex-none"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Actualiser
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Data Explorer Component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Card className="rpma-shell">
              <CardHeader className="border-b border-[hsl(var(--rpma-border))] bg-white">
                <CardTitle className="flex items-center justify-between text-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                      <Database className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">Base de Données PPF</h3>
                      <p className="text-muted-foreground text-sm">Exploration et analyse de vos données</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Temps Réel
                    </Badge>
                    <Badge variant="secondary" className="bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
                      <Shield className="h-3 w-3 mr-1" />
                      Sécurisé
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))] p-4">
                  <DataExplorer />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
