// src/domains/interventions/components/GPS/DesktopGPS.tsx
import { useState, useEffect } from 'react';
import { MapPin, Navigation, Crosshair, RefreshCw } from 'lucide-react';
import { gps } from '@/lib/utils/gps';
import { shellOps } from '@/lib/utils/desktop';
import type { Coordinates } from '@/lib/utils/gps';

interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function DesktopGPS() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const position: Coordinates = await gps.getCurrentPosition();
      setCoordinates(position);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur GPS');
    } finally {
      setIsLoading(false);
    }
  };

  const openInMaps = async () => {
    if (!coordinates) return;

    try {
      const url = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
      await shellOps.open(url);
    } catch (err) {
      console.error('Failed to open maps:', err);
    }
  };

  const refreshLocation = () => {
    getCurrentPosition();
  };

  // Auto-refresh location every 30 seconds if coordinates exist
  useEffect(() => {
    if (!coordinates) return;

    const interval = setInterval(() => {
      getCurrentPosition();
    }, 30000);

    return () => clearInterval(interval);
  }, [coordinates]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={getCurrentPosition}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Crosshair size={16} />
          {isLoading ? 'Localisation...' : 'Obtenir position'}
        </button>

        {coordinates && (
          <>
            <button
              onClick={openInMaps}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              <Navigation size={16} />
              Ouvrir dans Maps
            </button>

            <button
              onClick={refreshLocation}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </>
        )}
      </div>

      {coordinates && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border/20 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={18} className="text-blue-500" />
            <span className="font-medium text-foreground">Position actuelle</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-border">Latitude:</span>
              <span className="ml-2 font-mono text-foreground">{coordinates.latitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-border">Longitude:</span>
              <span className="ml-2 font-mono text-foreground">{coordinates.longitude.toFixed(6)}</span>
            </div>
            {coordinates.accuracy && (
              <div className="col-span-2">
                <span className="text-border">Précision:</span>
                <span className="ml-2 font-mono text-foreground">±{coordinates.accuracy.toFixed(0)}m</span>
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-border">
            Dernière mise à jour: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}