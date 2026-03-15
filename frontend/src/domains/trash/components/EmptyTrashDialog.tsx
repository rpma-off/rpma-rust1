'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
}

export function EmptyTrashDialog({ children, onConfirm, disabled }: Props) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vider la corbeille</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir vider la corbeille ? Cette action est irréversible et supprimera définitivement tous les éléments.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={disabled}>Annuler</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={disabled}>Vider définitivement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
