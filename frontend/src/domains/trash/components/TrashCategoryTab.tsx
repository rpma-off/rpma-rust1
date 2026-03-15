'use client';

import React from 'react';
import { useTrashList } from '@/domains/trash/api';
import type { EntityType } from '@/types/trash';
import { TrashItemRow } from './TrashItemRow';

interface Props {
  entityType: EntityType;
  isAdmin: boolean;
}

export function TrashCategoryTab({ entityType, isAdmin }: Props) {
  const { data: items, isLoading, error } = useTrashList(entityType);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Erreur lors du chargement de la corbeille.</div>;
  }

  if (!items || items.length === 0) {
    return (
      <div className="p-16 text-center border rounded-lg border-dashed mt-4">
        <p className="text-muted-foreground text-lg">Aucun élément supprimé</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md mt-4">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Nom</th>
            <th className="px-4 py-3 font-medium">Supprimé le</th>
            <th className="px-4 py-3 font-medium">Supprimé par</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <TrashItemRow key={item.id} item={item} isAdmin={isAdmin} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
