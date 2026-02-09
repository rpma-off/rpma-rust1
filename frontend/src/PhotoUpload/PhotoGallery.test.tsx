//! Tests for Photo Gallery component
//! 
//! This component handles photo display and management with 0% coverage.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PhotoGallery from './PhotoGallery';

// Mock the Tauri API
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
}));

// Mock file reader API
global.FileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  result: null,
  onload: null,
  onerror: null,
}));

describe('PhotoGallery', () => {
  const mockPhotos = [
    {
      id: '1',
      path: '/photo1.jpg',
      caption: 'Photo 1',
      taken_at: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      path: '/photo2.jpg',
      caption: 'Photo 2',
      taken_at: '2024-01-01T11:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty gallery when no photos', async () => {
    render(<PhotoGallery photos={[]} />);
    
    await waitFor(() => {
      expect(screen.getByText(/No photos yet/i)).toBeInTheDocument();
    });
  });

  it('displays photos in grid layout', async () => {
    render(<PhotoGallery photos={mockPhotos} />);
    
    await waitFor(() => {
      expect(screen.getByAltText('Photo 1')).toBeInTheDocument();
      expect(screen.getByAltText('Photo 2')).toBeInTheDocument();
    });
  });

  it('shows photo captions', async () => {
    render(<PhotoGallery photos={mockPhotos} />);
    
    await waitFor(() => {
      expect(screen.getByText('Photo 1')).toBeInTheDocument();
      expect(screen.getByText('Photo 2')).toBeInTheDocument();
    });
  });

  it('opens photo viewer when photo is clicked', async () => {
    render(<PhotoGallery photos={mockPhotos} />);
    
    const photo = screen.getByAltText('Photo 1');
    await userEvent.click(photo);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('allows photo deletion with confirmation', async () => {
    const { invoke } = require('@tauri-apps/api');
    invoke.mockResolvedValue({ success: true });

    render(<PhotoGallery photos={mockPhotos} />);
    
    // Find delete button (might be hidden in menu)
    const photo = screen.getByAltText('Photo 1');
    fireEvent.mouseEnter(photo);
    
    await waitFor(() => {
      const deleteButton = screen.getByLabelText(/Delete photo/i);
      expect(deleteButton).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByLabelText(/Delete photo/i);
    await userEvent.click(deleteButton);
    
    // Check for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/Delete this photo/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await userEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('delete_photo', { photoId: '1' });
    });
  });

  it('uploads new photos via drag and drop', async () => {
    render(<PhotoGallery photos={mockPhotos} />);
    
    const dropZone = screen.getByTestId('photo-drop-zone');
    
    const mockFile = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    const dropEvent = new DragEvent('drop', {
      dataTransfer: {
        files: [mockFile],
        items: [],
        types: ['Files'],
      },
    });
    
    fireEvent.drop(dropZone, dropEvent);
    
    await waitFor(() => {
      expect(screen.getByText(/Uploading photo/i)).toBeInTheDocument();
    });
  });

  it('validates photo file types', async () => {
    render(<PhotoGallery photos={[]} />);
    
    const dropZone = screen.getByTestId('photo-drop-zone');
    
    const mockFile = new File(['document'], 'document.pdf', { type: 'application/pdf' });
    const dropEvent = new DragEvent('drop', {
      dataTransfer: {
        files: [mockFile],
        items: [],
        types: ['Files'],
      },
    });
    
    fireEvent.drop(dropZone, dropEvent);
    
    await waitFor(() => {
      expect(screen.getByText(/Please upload only image files/i)).toBeInTheDocument();
    });
  });

  it('limits photo size', async () => {
    render(<PhotoGallery photos={[]} />);
    
    const dropZone = screen.getByTestId('photo-drop-zone');
    
    // Create a large file (10MB)
    const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    });
    const dropEvent = new DragEvent('drop', {
      dataTransfer: {
        files: [largeFile],
        items: [],
        types: ['Files'],
      },
    });
    
    fireEvent.drop(dropZone, dropEvent);
    
    await waitFor(() => {
      expect(screen.getByText(/File size must be less than 5MB/i)).toBeInTheDocument();
    });
  });

  it('shows photo timestamps', async () => {
    render(<PhotoGallery photos={mockPhotos} />);
    
    await waitFor(() => {
      expect(screen.getByText(/2024-01-01/i)).toBeInTheDocument();
    expect(screen.getByText(/10:00/i)).toBeInTheDocument();
    });
  });

  it('allows photo caption editing', async () => {
    render(<PhotoGallery photos={mockPhotos} />);
    
    const photo = screen.getByAltText('Photo 1');
    fireEvent.mouseEnter(photo);
    
    await waitFor(() => {
      const editButton = screen.getByLabelText(/Edit caption/i);
      expect(editButton).toBeInTheDocument();
    });
    
    const editButton = screen.getByLabelText(/Edit caption/i);
    await userEvent.click(editButton);
    
    const captionInput = screen.getByDisplayValue('Photo 1');
    await userEvent.clear(captionInput);
    await userEvent.type(captionInput, 'Updated caption');
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Updated caption')).toBeInTheDocument();
    });
  });

  it('sorts photos by date', async () => {
    const unsortedPhotos = [
      {
        id: '1',
        path: '/photo1.jpg',
        caption: 'Photo 1',
        taken_at: '2024-01-02T10:00:00Z',
      },
      {
        id: '2',
        path: '/photo2.jpg',
        caption: 'Photo 2',
        taken_at: '2024-01-01T11:00:00Z',
      },
    ];
    
    render(<PhotoGallery photos={unsortedPhotos} />);
    
    await waitFor(() => {
      const photos = screen.getAllByRole('img');
      // Photo 2 should come first (earlier date)
      expect(photos[0]).toHaveAttribute('alt', 'Photo 2');
      expect(photos[1]).toHaveAttribute('alt', 'Photo 1');
    });
  });
});