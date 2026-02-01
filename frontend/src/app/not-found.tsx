'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search, AlertTriangle } from 'lucide-react';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-border/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full mx-4"
      >
        {/* 404 Card */}
        <div className="bg-border/5 border border-border/20 rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-6">
              <AlertTriangle className="w-12 h-12 text-yellow-400" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">?</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              404
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
              Page introuvable
            </h2>
            <p className="text-base md:text-lg text-border-light mb-8 leading-relaxed">
              Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
              Vérifiez l&apos;URL ou retournez à une page connue.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
          >
            <Link href="/dashboard">
              <Button className="bg-accent hover:bg-accent/90 text-black font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-accent/25 transition-all duration-base hover:scale-105 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Tableau de bord
              </Button>
            </Link>

            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-border/60 text-border-light hover:bg-border/20 hover:text-foreground px-8 py-3 rounded-xl font-medium transition-all duration-base hover:scale-105 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Retour en arrière
            </Button>
          </motion.div>

          {/* Popular Pages */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="bg-background/50 rounded-xl p-6 border border-border/20"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">Pages populaires</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/tasks"
                className="p-3 bg-border/10 rounded-lg border border-border/30 hover:bg-border/20 hover:border-accent/50 transition-all duration-base text-center"
              >
                <div className="text-accent font-medium text-sm">Tâches</div>
              </Link>
              <Link
                href="/clients"
                className="p-3 bg-border/10 rounded-lg border border-border/30 hover:bg-border/20 hover:border-accent/50 transition-all duration-base text-center"
              >
                <div className="text-accent font-medium text-sm">Clients</div>
              </Link>
              <Link
                href="/dashboard"
                className="p-3 bg-border/10 rounded-lg border border-border/30 hover:bg-border/20 hover:border-accent/50 transition-all duration-base text-center"
              >
                <div className="text-accent font-medium text-sm">Calendrier</div>
              </Link>
              <Link
                href="/reports"
                className="p-3 bg-border/10 rounded-lg border border-border/30 hover:bg-border/20 hover:border-accent/50 transition-all duration-base text-center"
              >
                <div className="text-accent font-medium text-sm">Rapports</div>
              </Link>
            </div>
          </motion.div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="mt-8 pt-6 border-t border-border/20"
          >
            <div className="text-center">
              <p className="text-sm text-border-light mb-4">
                Besoin d&apos;aide ? Contactez notre support
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center text-xs">
                <div className="flex items-center gap-2 text-border-light">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>support@rpma-v2.com</span>
                </div>
                <div className="flex items-center gap-2 text-border-light">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Centre d&apos;aide</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Branding Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 text-border-light text-xs">
            <div className="w-6 h-6 bg-accent/20 rounded flex items-center justify-center">
              <span className="text-accent font-bold text-xs">R</span>
            </div>
            <span>RPMA V2 - Système de gestion PPF</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
