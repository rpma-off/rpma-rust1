'use client';

import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useSyncStatus } from '@/domains/sync';
import { ipcClient } from '@/lib/ipc';

export function SyncIndicator() {
  const { status, refetch } = useSyncStatus(30000); // Every 30 seconds
  const [showDetails, setShowDetails] = useState(false);

  const handleSyncNow = async () => {
    try {
      await ipcClient.sync.syncNow();
      refetch(); // Refresh status
    } catch (error) {
      console.error('Manual sync failed:', error);
      refetch(); // Refresh status to show error
    }
  };

  const getStatusIcon = () => {
    if (status?.isRunning) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (!status?.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    if (status?.errors && status.errors.length > 0) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (status?.isRunning) return 'Synchronisation...';
    if (!status?.isOnline) return 'Hors ligne';
    if (status?.errors && status.errors.length > 0) return 'Erreur de sync';
    return 'Connecté';
  };

  const getStatusColor = () => {
    if (status?.isRunning) return 'text-blue-600';
    if (!status?.isOnline) return 'text-red-600';
    if (status?.errors && status.errors.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="relative">
      {/* Main indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          showDetails ? 'bg-gray-100' : 'hover:bg-gray-50'
        }`}
        title="Status de synchronisation"
      >
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {status?.pendingOperations && status.pendingOperations > 0 && (
          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
            {status.pendingOperations}
          </span>
        )}
      </button>

      {/* Details dropdown */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">Status de synchronisation</h3>
              <button
                onClick={handleSyncNow}
                disabled={status?.isRunning || !status?.isOnline}
                className="flex items-center gap-1 px-3 py-1 text-primary bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-3 w-3 ${status?.isRunning ? 'animate-spin' : ''}`} />
                Synchroniser
              </button>
            </div>

            {/* Last sync */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dernière sync:</span>
              <span className="text-sm text-foreground">
                {status?.lastSync
                  ? status.lastSync.toLocaleString('fr-FR')
                  : 'Jamais'
                }
              </span>
            </div>

            {/* Pending operations */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Opérations en attente:</span>
              <span className={`text-sm font-medium ${
                (status?.pendingOperations ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {status?.pendingOperations ?? 0}
              </span>
            </div>

            {/* Errors */}
            {status?.errors && status.errors.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 mb-1">Erreurs de synchronisation:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {status.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Success message */}
            {status?.isOnline && status?.errors && status.errors.length === 0 && !status.isRunning && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Synchronisation active</span>
              </div>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-muted-foreground">
                💡 Cliquez sur &quot;Synchroniser&quot; ou utilisez Ctrl+S pour forcer la sync
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
