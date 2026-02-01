'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { HeatMapPoint } from '@/lib/backend';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });

interface GeographicHeatMapProps {
  heatMapData: HeatMapPoint[];
  className?: string;
}

export function GeographicHeatMap({ heatMapData, className = '' }: GeographicHeatMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={`bg-gray-700/50 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-400">Chargement de la carte...</div>
      </div>
    );
  }

  // Calculate bounds from data points
  const bounds = heatMapData.length > 0 ? [
    [
      Math.min(...heatMapData.map(p => p.latitude)) - 0.01,
      Math.min(...heatMapData.map(p => p.longitude)) - 0.01
    ],
    [
      Math.max(...heatMapData.map(p => p.latitude)) + 0.01,
      Math.max(...heatMapData.map(p => p.longitude)) + 0.01
    ]
  ] : [
    [40.7128 - 0.1, -74.0060 - 0.1],
    [40.7128 + 0.1, -74.0060 + 0.1]
  ];

  // Calculate max intensity for color scaling
  const maxIntensity = Math.max(...heatMapData.map(p => p.intensity), 1);

  const getColor = (intensity: number) => {
    const ratio = intensity / maxIntensity;
    if (ratio > 0.8) return '#dc2626'; // red-600
    if (ratio > 0.6) return '#ea580c'; // orange-600
    if (ratio > 0.4) return '#ca8a04'; // yellow-600
    if (ratio > 0.2) return '#16a34a'; // green-600
    return '#2563eb'; // blue-600
  };

  const getRadius = (intensity: number) => {
    return Math.max(50, Math.min(200, (intensity / maxIntensity) * 150));
  };

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        bounds={bounds as [[number, number], [number, number]]}
        scrollWheelZoom={true}
        className="h-96 w-full rounded-lg"
        style={{ height: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {heatMapData.map((point, index) => (
          <Circle
            key={index}
            center={[point.latitude, point.longitude]}
            radius={getRadius(point.intensity)}
            pathOptions={{
              color: getColor(point.intensity),
              fillColor: getColor(point.intensity),
              fillOpacity: 0.6,
              weight: 2,
            }}
          />
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-900 mb-2">Intensité</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-blue-600"></div>
            <span className="text-xs text-gray-700">Faible</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-600"></div>
            <span className="text-xs text-gray-700">Modérée</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-yellow-600"></div>
            <span className="text-xs text-gray-700">Élevée</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span className="text-xs text-gray-700">Très élevée</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-xs text-gray-700">Maximale</span>
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-900">
          {heatMapData.length} points d&apos;intervention
        </div>
        <div className="text-xs text-gray-600">
          Intensité max: {maxIntensity}
        </div>
      </div>
    </div>
  );
}