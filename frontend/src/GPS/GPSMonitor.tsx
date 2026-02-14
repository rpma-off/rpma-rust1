/**
 * GPS Monitor Component for PPF Workflow
 * Real-time GPS monitoring with accuracy validation and route analytics
 * @version 1.0
 * @date 2025-01-20
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Satellite, AlertTriangle, Clock, Map } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GeolocationService } from '@/lib/services/ppf/geolocation.service';

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

interface GPSAccuracy {
  isAccurate: boolean;
  accuracy: number;
  confidence: number;
  sources: string[];
  recommendations: string[];
}

interface GPSSignalStrength {
  signalStrength: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';
  accuracy: number | null;
  recommendations: string[];
}

interface RouteAnalytics {
  totalDistance: number;
  totalTime: number;
  averageSpeed: number;
  efficiency: number;
  optimizationSuggestions: string[];
  routeQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface GPSMonitorProps {
  interventionId: string;
  expectedLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  onLocationUpdate?: (location: GPSLocation) => void;
  isOnline?: boolean;
}

export const GPSMonitor: React.FC<GPSMonitorProps> = ({
  interventionId,
  expectedLocation,
  onLocationUpdate,
  isOnline = true
}) => {
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [accuracy, setAccuracy] = useState<GPSAccuracy | null>(null);
  const [signalStrength, setSignalStrength] = useState<GPSSignalStrength | null>(null);
  const [routeAnalytics, setRouteAnalytics] = useState<RouteAnalytics | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const geolocationService = GeolocationService.getInstance();

  const startTracking = useCallback(async () => {
    try {
      // Convert expectedLocation to GeographicLocation format
      const expectedLocationFormatted = expectedLocation ? {
        latitude: expectedLocation.latitude,
        longitude: expectedLocation.longitude,
        accuracy: 10, // Default accuracy
        timestamp: new Date().toISOString(),
        is_validated: false
      } : undefined;

      const trackingResult = await geolocationService.startTracking(
        interventionId,
        expectedLocationFormatted
      );

      if (trackingResult.success) {
        setIsTracking(true);
      } else {
        setError(trackingResult.error?.message || 'Failed to start GPS tracking');
      }
    } catch (err) {
      console.error('GPS tracking start error:', err);
      setError('Failed to start GPS tracking');
    }
  }, [geolocationService, interventionId, expectedLocation]);

  const stopTracking = useCallback(async () => {
    try {
      if (isTracking) {
        await geolocationService.stopTracking();
        setIsTracking(false);
      }
    } catch (err) {
      console.error('GPS tracking stop error:', err);
    }
  }, [isTracking, geolocationService]);

  const updateGPSData = useCallback(async () => {
    try {
      // Get current position
      const positionResult = await geolocationService.getCurrentPosition();
      if (positionResult.success && positionResult.data) {
        const gpsLocation: GPSLocation = {
          latitude: positionResult.data.latitude,
          longitude: positionResult.data.longitude,
          accuracy: positionResult.data.accuracy || 0,
          timestamp: positionResult.data.timestamp ? new Date(positionResult.data.timestamp).getTime() : Date.now()
        };
        setCurrentLocation(gpsLocation);
        setLastUpdate(new Date());
        onLocationUpdate?.(gpsLocation);

        // Validate GPS accuracy
        if (gpsLocation.accuracy && gpsLocation.accuracy > 0) {
          const accuracyResult = await geolocationService.validateGPSAccuracy({
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            accuracy: gpsLocation.accuracy,
            timestamp: gpsLocation.timestamp || Date.now()
          });
          if (accuracyResult.success && accuracyResult.data) {
            setAccuracy(accuracyResult.data);
          }
        }

        // Monitor signal strength
        const signalResult = await geolocationService.monitorGPSSignal();
        if (signalResult.success && signalResult.data) {
          setSignalStrength(signalResult.data);
        }

        // Update route analytics periodically
        if (isTracking && Math.random() < 0.1) { // 10% chance every update
          const analyticsResult = await geolocationService.analyzeRouteEfficiency([]);
          if (analyticsResult.success && analyticsResult.data) {
            setRouteAnalytics(analyticsResult.data);
          }
        }
      }

    } catch (err) {
      console.error('GPS data update error:', err);
      setError('Failed to update GPS data');
    }
  }, [geolocationService, isTracking, onLocationUpdate]);

  const initializeGPS = useCallback(async () => {
    try {
      setError(null);

      // Initialize geolocation service
      const initResult = await geolocationService.initialize();
      if (!initResult.success) {
        setError(initResult.error || 'GPS initialization failed');
        return;
      }

      // Start tracking if we have an intervention
      if (interventionId) {
        await startTracking();
      }

      // Initial data update
      await updateGPSData();

    } catch (err) {
      console.error('GPS initialization error:', err);
      setError('Failed to initialize GPS monitoring');
    }
  }, [geolocationService, interventionId, startTracking, updateGPSData]);

  // Initialize GPS monitoring
  useEffect(() => {
    initializeGPS();
    return () => {
      stopTracking();
    };
  }, [initializeGPS, stopTracking]);

  // Periodic updates
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(async () => {
      await updateGPSData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isTracking, updateGPSData]);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 10) return 'text-green-600';
    if (accuracy <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignalColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      default: return 'text-red-600';
    }
  };

  const getRouteQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Main GPS Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            GPS Monitoring
            {isTracking && <Badge variant="secondary">Active</Badge>}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Location */}
          {currentLocation && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">Current Location</div>
                <div className="text-xs text-gray-600">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </div>
                {lastUpdate && (
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Updated {Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GPS Accuracy */}
          {accuracy && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">GPS Accuracy</span>
                <Badge variant={accuracy.isAccurate ? "default" : "destructive"}>
                  {accuracy.isAccurate ? 'Good' : 'Poor'}
                </Badge>
              </div>
              <div className={`text-sm ${getAccuracyColor(accuracy.accuracy)}`}>
                ±{Math.round(accuracy.accuracy)}m
              </div>
              <Progress value={Math.min(100, 100 - (accuracy.accuracy / 2))} className="h-2" />

              {accuracy.recommendations.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="text-xs space-y-1">
                      {accuracy.recommendations.map((rec: string, index: number) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Signal Strength */}
          {signalStrength && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Signal Strength</span>
                <div className="flex items-center gap-2">
                  <Satellite className="w-4 h-4" />
                  <span className={`text-sm font-medium ${getSignalColor(signalStrength.status)}`}>
                    {signalStrength.status}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                GPS Signal • Accuracy: {signalStrength.accuracy ? `${signalStrength.accuracy.toFixed(1)}m` : 'N/A'}
              </div>
              <Progress value={signalStrength.signalStrength} className="h-2" />
            </div>
          )}

          {/* Route Analytics */}
          {routeAnalytics && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Route Analytics</span>
                <Badge className={getRouteQualityColor(routeAnalytics.routeQuality)}>
                  {routeAnalytics.routeQuality}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-600">Distance</div>
                  <div className="font-medium">{(routeAnalytics.totalDistance / 1000).toFixed(1)} km</div>
                </div>
                <div>
                  <div className="text-gray-600">Avg Speed</div>
                  <div className="font-medium">{routeAnalytics.averageSpeed.toFixed(1)} km/h</div>
                </div>
              </div>
              <Progress value={routeAnalytics.efficiency * 100} className="h-2" />

              {routeAnalytics.optimizationSuggestions.length > 0 && (
                <Alert>
                  <Map className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="text-xs space-y-1">
                      {routeAnalytics.optimizationSuggestions.map((suggestion: string, index: number) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isTracking ? (
              <Button onClick={startTracking} className="flex-1">
                <Navigation className="w-4 h-4 mr-2" />
                Start Tracking
              </Button>
            ) : (
              <Button onClick={stopTracking} variant="outline" className="flex-1">
                Stop Tracking
              </Button>
            )}

            <Button onClick={updateGPSData} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          {/* Offline Indicator */}
          {!isOnline && (
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Offline mode - GPS data will be cached
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};