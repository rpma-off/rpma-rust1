'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ClientCard } from '@/domains/clients';
import { ClientCardErrorBoundary } from '@/error-boundaries/ClientCardErrorBoundary';
import type { Client, ClientWithTasks } from '@/lib/backend';

interface VirtualizedClientListProps {
  clients: ClientWithTasks[];
  onView?: (client: Client | ClientWithTasks) => void;
  onEdit?: (client: Client | ClientWithTasks) => void;
  onDelete?: (client: Client | ClientWithTasks) => void;
  onCreateTask?: (client: Client | ClientWithTasks) => void;
  itemHeight?: number;
  containerHeight?: number;
}

export function VirtualizedClientList({
  clients,
  onView,
  onEdit,
  onDelete,
  onCreateTask,
  itemHeight = 280, // Approximate height of a client card
  containerHeight = 800
}: VirtualizedClientListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Only virtualize if we have more than 50 clients
  if (clients.length <= 50) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <ClientCardErrorBoundary key={client.id} clientId={client.id}>
            <ClientCard
              client={client}
              tasks={client.tasks || []}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateTask={onCreateTask}
            />
          </ClientCardErrorBoundary>
        ))}
      </div>
    );
  }

  // Calculate visible range
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 2, // Add buffer
    clients.length
  );

  const visibleClients = clients.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: clients.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleClients.map((client) => (
              <ClientCardErrorBoundary key={client.id} clientId={client.id}>
                <ClientCard
                  client={client}
                  tasks={client.tasks || []}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateTask={onCreateTask}
                />
              </ClientCardErrorBoundary>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}