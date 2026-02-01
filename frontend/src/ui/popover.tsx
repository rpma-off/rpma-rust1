import React from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from './dialog';

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open, onOpenChange }: PopoverProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}

export function PopoverTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <DialogTrigger asChild={asChild}>{children}</DialogTrigger>;
}

export function PopoverContent({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogContent className={className}>
      <DialogTitle className="sr-only">Filtres de données</DialogTitle>
      <DialogDescription className="sr-only">
        Utilisez ces filtres pour affiner les données statistiques affichées
      </DialogDescription>
      {children}
    </DialogContent>
  );
}
