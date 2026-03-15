'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { DeletedItem } from '@/types/trash';
import { useRestoreEntity, useHardDeleteEntity } from '@/domains/trash/api';
import { RotateCcw, Trash2 } from 'lucide-react';

interface Props {
  item: DeletedItem;
  isAdmin: boolean;
}

export function TrashItemRow({ item, isAdmin }: Props) {
  const restoreMutation = useRestoreEntity();
  const deleteMutation = useHardDeleteEntity();

  const handleRestore = () => {
    restoreMutation.mutate({ entityType: item.entity_type, id: item.id });
  };

  const handleHardDelete = () => {
    if (confirm("Supprimer définitivement cet élément ?")) {
      deleteMutation.mutate({ entityType: item.entity_type, id: item.id });
    }
  };

  const isPending = restoreMutation.isPending || deleteMutation.isPending;

  return (
    <tr className={isPending ? "opacity-50" : ""}>
      <td className="px-4 py-3 font-medium">{item.display_name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {new Date(item.deleted_at).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{item.deleted_by_name || 'Inconnu'}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRestore} 
            disabled={isPending}
            title="Restaurer"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restaurer
          </Button>
          {isAdmin && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleHardDelete} 
              disabled={isPending}
              title="Supprimer définitivement"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
