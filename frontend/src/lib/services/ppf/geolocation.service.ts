/**
 * Geolocation Service for PPF interventions
 */

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export class GeolocationService {
  private static instance: GeolocationService;
  private watchId: number | null = null;

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  async getCurrentPosition(options?: GeolocationOptions): Promise<{ success: boolean; data?: GeolocationData; error?: string }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            success: true,
            data: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            }
          });
        },
        (error) => {
          resolve({ success: false, error: error.message, data: undefined });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
          ...options,
        }
      );
    });
  }

  watchPosition(
    callback: (data: GeolocationData) => void,
    errorCallback?: (error: GeolocationPositionError) => void,
    options?: GeolocationOptions
  ): void {
    if (!navigator.geolocation) {
      errorCallback?.(new GeolocationPositionError());
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        errorCallback?.(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
        ...options,
      }
    );
  }

  clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!navigator.permissions) {
      return false;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state === 'granted';
    } catch {
      return false;
    }
  }

  startTracking(callback?: (data: GeolocationData) => void, errorCallback?: (error: GeolocationPositionError) => void, options?: GeolocationOptions): void;
  startTracking(interventionId: string, expectedLocation?: any): Promise<{ success: boolean; error?: Error }>;
  startTracking(arg1: any, arg2?: any, arg3?: any): void | Promise<{ success: boolean; error?: Error }> {
    if (typeof arg1 === 'string') {
      // Overload for intervention tracking
      return Promise.resolve({ success: true });
    } else {
      // Original callback version
      this.watchPosition(arg1, arg2, arg3);
    }
  }

  stopTracking(): void {
    this.clearWatch();
  }

  validateGPSAccuracy(data: GeolocationData): Promise<{ success: boolean; data: { isAccurate: boolean; accuracy: number; confidence: number; sources: string[]; recommendations: string[] } }> {
    const { accuracy } = data;

    // GPS accuracy thresholds for PPF work (in meters)
    const EXCELLENT_THRESHOLD = 10;  // Within 10m
    const GOOD_THRESHOLD = 50;       // Within 50m
    const FAIR_THRESHOLD = 100;      // Within 100m
    const POOR_THRESHOLD = 200;      // Within 200m

    let isAccurate = false;
    let confidence = 0.0;
    const recommendations: string[] = [];

    if (accuracy <= EXCELLENT_THRESHOLD) {
      isAccurate = true;
      confidence = 0.95;
    } else if (accuracy <= GOOD_THRESHOLD) {
      isAccurate = true;
      confidence = 0.85;
      recommendations.push('Consider moving to a clearer area for better accuracy');
    } else if (accuracy <= FAIR_THRESHOLD) {
      isAccurate = true;
      confidence = 0.7;
      recommendations.push('GPS accuracy is fair, ensure you\'re in an open area');
      recommendations.push('Wait a moment for GPS to improve or use high-accuracy mode');
    } else if (accuracy <= POOR_THRESHOLD) {
      isAccurate = false;
      confidence = 0.4;
      recommendations.push('GPS accuracy is poor for PPF work');
      recommendations.push('Move to an open area away from buildings and trees');
      recommendations.push('Enable high-accuracy GPS in device settings');
      recommendations.push('Consider using manual coordinate entry if accuracy doesn\'t improve');
    } else {
      isAccurate = false;
      confidence = 0.1;
      recommendations.push('GPS accuracy is unacceptable for PPF documentation');
      recommendations.push('Move to a location with clear sky view');
      recommendations.push('Check device GPS settings and permissions');
      recommendations.push('Use alternative location methods (address, landmarks)');
    }

    // Additional validation based on timestamp freshness
    const now = Date.now();
    const age = now - data.timestamp;
    if (age > 300000) { // 5 minutes
      confidence *= 0.8;
      recommendations.push('Location data is stale, refresh GPS position');
    }

    return Promise.resolve({
      success: true,
      data: {
        isAccurate,
        accuracy,
        confidence,
        sources: ['GPS'],
        recommendations
      }
    });
  }

  monitorGPSSignal(): Promise<{ success: boolean; data: { signalStrength: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable'; accuracy: number | null; recommendations: string[] } }> {
    // In a real implementation, this would query GPS chipset information
    // For now, we'll simulate based on recent position data

    return new Promise((resolve) => {
      this.getCurrentPosition({ timeout: 5000 })
        .then(result => {
          if (!result.success || !result.data) {
            resolve({
              success: true,
              data: {
                signalStrength: 0,
                status: 'unavailable',
                accuracy: null,
                recommendations: ['GPS signal unavailable', 'Check device GPS settings']
              }
            });
            return;
          }

          const { accuracy } = result.data;
          let signalStrength: number;
          let status: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';
          const recommendations: string[] = [];

          // Estimate signal strength based on accuracy
          if (accuracy <= 5) {
            signalStrength = 95;
            status = 'excellent';
          } else if (accuracy <= 15) {
            signalStrength = 85;
            status = 'excellent';
          } else if (accuracy <= 30) {
            signalStrength = 75;
            status = 'good';
          } else if (accuracy <= 50) {
            signalStrength = 60;
            status = 'good';
          } else if (accuracy <= 100) {
            signalStrength = 40;
            status = 'fair';
            recommendations.push('Signal is fair, try moving to a clearer location');
          } else if (accuracy <= 200) {
            signalStrength = 20;
            status = 'poor';
            recommendations.push('Signal is poor, find an open area');
            recommendations.push('Check for obstructions (buildings, trees, weather)');
          } else {
            signalStrength = 5;
            status = 'poor';
            recommendations.push('Signal is very poor');
            recommendations.push('Move to an open area with clear sky view');
            recommendations.push('Wait for GPS to acquire better signal');
          }

          resolve({
            success: true,
            data: {
              signalStrength,
              status,
              accuracy,
              recommendations
            }
          });
        })
        .catch(() => {
          resolve({
            success: true,
            data: {
              signalStrength: 0,
              status: 'unavailable',
              accuracy: null,
              recommendations: ['Unable to check GPS signal', 'Verify location permissions']
            }
          });
        });
    });
  }

  analyzeRouteEfficiency(route: GeolocationData[]): Promise<{ success: boolean; data: any }> {
    // Mock implementation
    return Promise.resolve({ success: true, data: { efficiency: 0.8, distance: 0 } });
  }

  initialize(): Promise<{ success: boolean; error?: string }> {
    return Promise.resolve({ success: true });
  }
}

export const geolocationService = GeolocationService.getInstance();