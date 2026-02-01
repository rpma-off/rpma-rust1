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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Enhanced Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-border/10 to-border/5 rounded-2xl p-6 md:p-8 border border-border/20">
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl border border-accent/30 shadow-lg"
                >
                  <Database className="h-8 w-8 md:h-10 md:w-10 text-accent" />
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
                    className="text-base md:text-lg text-border-light max-w-2xl mx-auto leading-relaxed"
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
                  <Badge variant="secondary" className="px-3 py-1.5 bg-accent/20 text-accent border-accent/30 hover:bg-accent/30">
                    <Search className="h-3 w-3 mr-1.5" />
                    Recherche Avancée
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                    <Eye className="h-3 w-3 mr-1.5" />
                    Vue Complète
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Temps Réel
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30">
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
            <div className="bg-border/5 rounded-xl p-6 border border-border/20">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">Actions rapides</h2>
                <p className="text-border-light text-sm">Commencez à explorer vos données</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-black font-semibold shadow-lg hover:shadow-accent/25 transition-all duration-200 hover:scale-105 flex-1 sm:flex-none"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Commencer l&apos;Exploration
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border/60 text-border-light hover:bg-border/20 hover:text-foreground hover:border-accent/50 transition-all duration-200 hover:scale-105 flex-1 sm:flex-none"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Voir les Statistiques
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border/60 text-border-light hover:bg-border/20 hover:text-foreground hover:border-accent/50 transition-all duration-200 hover:scale-105 flex-1 sm:flex-none"
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
            <Card className="shadow-2xl border-border/20 bg-border/5 backdrop-blur-sm">
              <CardHeader className="border-b border-border/20 bg-background/50">
                <CardTitle className="flex items-center justify-between text-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg border border-accent/30">
                      <Database className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">Base de Données PPF</h3>
                      <p className="text-border-light text-sm">Exploration et analyse de vos données</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Temps Réel
                    </Badge>
                    <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
                      <Shield className="h-3 w-3 mr-1" />
                      Sécurisé
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-background/30 rounded-lg border border-border/20 p-4">
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