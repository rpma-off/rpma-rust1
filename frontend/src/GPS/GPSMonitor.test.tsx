//! Tests for GPS Monitor component
//! 
//! This is a critical component for GPS functionality that currently has 0% coverage.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GPSMonitor from './GPSMonitor';

// Mock the Tauri API
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
}));

// Mock the geolocation API
const mockGeolocation = {
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('GPSMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders GPS status initially', async () => {
    render(<GPSMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/GPS Status/i)).toBeInTheDocument();
    });
  });

  it('shows searching state when GPS is initializing', async () => {
    mockGeolocation.watchPosition.mockImplementation((success) => {
      // Simulate delay
      setTimeout(() => success({
        coords: {
          latitude: 48.8566,
          longitude: 2.3522,
          accuracy: 10,
        },
      }), 1000);
    });

    render(<GPSMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/Searching for GPS/i)).toBeInTheDocument();
    });
  });

  it('displays coordinates when GPS position is found', async () => {
    const mockPosition = {
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
      },
    };

    mockGeolocation.watchPosition.mockImplementation((success) => {
      success(mockPosition);
      return 1; // Return watch ID
    });

    render(<GPSMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/48.8566/i)).toBeInTheDocument();
      expect(screen.getByText(/2.3522/i)).toBeInTheDocument();
    });
  });

  it('shows error when GPS is unavailable', async () => {
    mockGeolocation.watchPosition.mockImplementation((_, error) => {
      error(new Error('GPS unavailable'));
      return 1;
    });

    render(<GPSMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/GPS unavailable/i)).toBeInTheDocument();
    });
  });

  it('allows manual coordinate entry', async () => {
    render(<GPSMonitor />);
    
    // Find and click manual entry button
    const manualButton = screen.getByText(/Manual Entry/i);
    await userEvent.click(manualButton);
    
    // Check for input fields
    const latInput = screen.getByLabelText(/Latitude/i);
    const lngInput = screen.getByLabelText(/Longitude/i);
    
    await userEvent.type(latInput, '48.8566');
    await userEvent.type(lngInput, '2.3522');
    
    // Check save button
    const saveButton = screen.getByText(/Save/i);
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/48.8566/i)).toBeInTheDocument();
      expect(screen.getByText(/2.3522/i)).toBeInTheDocument();
    });
  });

  it('saves GPS coordinates to Tauri backend', async () => {
    const { invoke } = require('@tauri-apps/api');
    invoke.mockResolvedValue({ success: true });

    const mockPosition = {
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
      },
    };

    mockGeolocation.watchPosition.mockImplementation((success) => {
      success(mockPosition);
      return 1;
    });

    render(<GPSMonitor />);
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('save_gps_coordinates', {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
      });
    });
  });

  it('validates manual coordinates before saving', async () => {
    render(<GPSMonitor />);
    
    const manualButton = screen.getByText(/Manual Entry/i);
    await userEvent.click(manualButton);
    
    const latInput = screen.getByLabelText(/Latitude/i);
    const lngInput = screen.getByLabelText(/Longitude/i);
    
    // Try invalid coordinates
    await userEvent.type(latInput, '91'); // Invalid latitude
    await userEvent.type(lngInput, '181'); // Invalid longitude
    
    const saveButton = screen.getByText(/Save/i);
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid coordinates/i)).toBeInTheDocument();
    });
  });

  it('tracks GPS accuracy', async () => {
    const mockPosition = {
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
      },
    };

    mockGeolocation.watchPosition.mockImplementation((success) => {
      success(mockPosition);
      return 1;
    });

    render(<GPSMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/Accuracy: 10m/i)).toBeInTheDocument();
    });
  });
});