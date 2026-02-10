//! Tests for Signature Capture component
//! 
//! Critical component for digital signatures with 0% coverage.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SignatureCapture from './SignatureCapture';

// Mock the Tauri API
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
}));

// Mock canvas API
const mockCanvas = {
  getContext: jest.fn(() => ({
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: mockCanvas.toDataURL,
});

describe('SignatureCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders signature canvas', () => {
    render(<SignatureCapture />);
    
    expect(screen.getByTestId('signature-canvas')).toBeInTheDocument();
    expect(screen.getByText(/Sign here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('allows drawing signature', async () => {
    render(<SignatureCapture />);
    
    const canvas = screen.getByTestId('signature-canvas');
    
    // Simulate mouse down
    fireEvent.mouseDown(canvas, {
      clientX: 10,
      clientY: 10,
    });
    
    // Simulate mouse move
    fireEvent.mouseMove(canvas, {
      clientX: 20,
      clientY: 20,
    });
    
    // Simulate mouse up
    fireEvent.mouseUp(canvas);
    
    await waitFor(() => {
      expect(mockCanvas.getContext().beginPath).toHaveBeenCalled();
      expect(mockCanvas.getContext().moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockCanvas.getContext().lineTo).toHaveBeenCalledWith(20, 20);
      expect(mockCanvas.getContext().stroke).toHaveBeenCalled();
    });
  });

  it('supports touch devices', async () => {
    render(<SignatureCapture />);
    
    const canvas = screen.getByTestId('signature-canvas');
    
    // Simulate touch start
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 10, clientY: 10 }],
    });
    
    // Simulate touch move
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 20, clientY: 20 }],
    });
    
    // Simulate touch end
    fireEvent.touchEnd(canvas);
    
    await waitFor(() => {
      expect(mockCanvas.getContext().beginPath).toHaveBeenCalled();
      expect(mockCanvas.getContext().moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockCanvas.getContext().lineTo).toHaveBeenCalledWith(20, 20);
    });
  });

  it('clears signature', async () => {
    render(<SignatureCapture />);
    
    const canvas = screen.getByTestId('signature-canvas');
    const clearButton = screen.getByRole('button', { name: /Clear/i });
    
    // Draw something first
    fireEvent.mouseDown(canvas);
    fireEvent.mouseUp(canvas);
    
    // Clear it
    await userEvent.click(clearButton);
    
    await waitFor(() => {
      expect(mockCanvas.getContext().clearRect).toHaveBeenCalled();
    });
  });

  it('saves signature with required fields', async () => {
    const { invoke } = require('@tauri-apps/api');
    invoke.mockResolvedValue({ success: true });

    render(<SignatureCapture 
      documentId="doc123"
      technicianId="tech123"
    />);
    
    // Draw a signature
    const canvas = screen.getByTestId('signature-canvas');
    fireEvent.mouseDown(canvas);
    fireEvent.mouseUp(canvas);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('save_signature', {
        documentId: 'doc123',
        technicianId: 'tech123',
        signatureData: 'data:image/png;base64,mock',
        timestamp: expect.any(String),
      });
    });
  });

  it('validates signature before saving', async () => {
    render(<SignatureCapture />);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Please provide a signature/i)).toBeInTheDocument();
      expect(screen.getByText(/Signature is required/i)).toBeInTheDocument();
    });
  });

  it('shows timestamp when saved', async () => {
    const { invoke } = require('@tauri-apps/api');
    invoke.mockResolvedValue({ 
      success: true,
      timestamp: '2024-01-01T10:00:00Z',
    });

    render(<SignatureCapture />);
    
    // Draw and save
    const canvas = screen.getByTestId('signature-canvas');
    fireEvent.mouseDown(canvas);
    fireEvent.mouseUp(canvas);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Signed on: Jan 1, 2024 at 10:00/i)).toBeInTheDocument();
    });
  });

  it('handles save errors gracefully', async () => {
    const { invoke } = require('@tauri-apps/api');
    invoke.mockRejectedValue(new Error('Save failed'));

    render(<SignatureCapture />);
    
    const canvas = screen.getByTestId('signature-canvas');
    fireEvent.mouseDown(canvas);
    fireEvent.mouseUp(canvas);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to save signature/i)).toBeInTheDocument();
      expect(screen.getByText(/Please try again/i)).toBeInTheDocument();
    });
  });

  it('adjusts canvas size responsively', async () => {
    render(<SignatureCapture />);
    
    const canvas = screen.getByTestId('signature-canvas');
    
    // Simulate window resize
    window.innerWidth = 800;
    window.innerHeight = 600;
    fireEvent(window, new Event('resize'));
    
    await waitFor(() => {
      expect(canvas.style.width).toBe('700px'); // Should adjust to container
      expect(canvas.style.height).toBe('200px');
    });
  });

  it('prevents saving without document ID', async () => {
    render(<SignatureCapture />);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Document ID is required/i)).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog before clearing', async () => {
    render(<SignatureCapture />);
    
    // Draw something first
    const canvas = screen.getByTestId('signature-canvas');
    fireEvent.mouseDown(canvas);
    fireEvent.mouseUp(canvas);
    
    const clearButton = screen.getByRole('button', { name: /Clear/i });
    await userEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Clear signature/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to clear the signature/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  it('supports pen pressure sensitivity', async () => {
    render(<SignatureCapture />);
    
    const canvas = screen.getByTestId('signature-canvas');
    
    // Simulate pressure-sensitive pen
    fireEvent.pointerDown(canvas, {
      clientX: 10,
      clientY: 10,
      pressure: 0.5,
    });
    
    fireEvent.pointerMove(canvas, {
      clientX: 20,
      clientY: 20,
      pressure: 0.8,
    });
    
    fireEvent.pointerUp(canvas);
    
    await waitFor(() => {
      // Check if pressure was used in stroke calculation
      expect(mockCanvas.getContext().lineWidth).toBeDefined();
      expect(mockCanvas.getContext().globalAlpha).toBeDefined();
    });
  });

  it('generates unique signature IDs', async () => {
    const { invoke } = require('@tauri-apps/api');
    invoke.mockResolvedValue({ success: true });

    render(<SignatureCapture documentId="doc123" />);
    
    // Save signature
    const canvas = screen.getByTestId('signature-canvas');
    fireEvent.mouseDown(canvas);
    fireEvent.mouseUp(canvas);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      const saveCall = invoke.mock.calls.find(call => call[0] === 'save_signature');
      const signatureData = saveCall[1];
      
      // Check for unique ID generation
      expect(signatureData.signatureId).toMatch(/^sig_/);
      expect(signatureData.signatureId).toHaveLength(20); // Should be reasonably unique
    });
  });
});