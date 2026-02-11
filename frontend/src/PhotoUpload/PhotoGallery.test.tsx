import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PhotoGallery from './PhotoGallery';
import type { Photo } from '@/lib/backend';

const createTestPhoto = (overrides: Partial<Photo> = {}): Photo => ({
  id: '1',
  intervention_id: 'intervention-1',
  step_id: null,
  step_number: null,
  file_path: '/photo1.jpg',
  file_name: 'Photo 1',
  file_size: 0n,
  mime_type: 'image/jpeg',
  width: null,
  height: null,
  photo_type: 'before',
  photo_category: null,
  photo_angle: null,
  zone: null,
  title: null,
  description: null,
  notes: null,
  annotations: null,
  gps_location_lat: null,
  gps_location_lon: null,
  gps_location_accuracy: null,
  quality_score: null,
  blur_score: null,
  exposure_score: null,
  composition_score: null,
  is_required: false,
  is_approved: false,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  synced: true,
  storage_url: '/photo1.jpg',
  upload_retry_count: 0,
  upload_error: null,
  last_synced_at: null,
  captured_at: null,
  uploaded_at: new Date('2024-01-01T10:00:00Z').toISOString(),
  created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
  updated_at: new Date('2024-01-01T10:00:00Z').toISOString(),
  ...overrides,
});

const mockPhotos: Photo[] = [
  createTestPhoto(),
  createTestPhoto({
    id: '2',
    file_name: 'Photo 2',
    file_path: '/photo2.jpg',
    storage_url: '/photo2.jpg',
    photo_type: 'after',
    uploaded_at: new Date('2024-01-01T11:00:00Z').toISOString(),
    created_at: new Date('2024-01-01T11:00:00Z').toISOString(),
    updated_at: new Date('2024-01-01T11:00:00Z').toISOString(),
  }),
];

describe('PhotoGallery', () => {
  it('renders empty gallery when no photos', () => {
    render(<PhotoGallery photos={[]} />);

    expect(screen.getByText('Aucune photo disponible')).toBeInTheDocument();
  });

  it('renders a grid with view buttons for photos', () => {
    render(<PhotoGallery photos={mockPhotos} />);

    const viewButtons = screen.getAllByRole('button', { name: 'View photo' });
    expect(viewButtons).toHaveLength(2);
    expect(screen.getByText('before')).toBeInTheDocument();
    expect(screen.getByText('after')).toBeInTheDocument();
  });

  it('opens the photo modal when a photo is clicked', async () => {
    render(<PhotoGallery photos={mockPhotos} sortOrder="asc" />);

    const viewButtons = screen.getAllByRole('button', { name: 'View photo' });
    await userEvent.click(viewButtons[0]);

    expect(screen.getByText('Photo 1')).toBeInTheDocument();
  });

  it('calls onPhotoDownload and onPhotoDelete when provided', async () => {
    const onPhotoDownload = jest.fn();
    const onPhotoDelete = jest.fn();

    render(
      <PhotoGallery
        photos={mockPhotos}
        sortOrder="asc"
        onPhotoDownload={onPhotoDownload}
        onPhotoDelete={onPhotoDelete}
      />
    );

    const downloadButtons = screen.getAllByRole('button', { name: 'Download photo' });
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete photo' });

    await userEvent.click(downloadButtons[0]);
    await userEvent.click(deleteButtons[0]);

    expect(onPhotoDownload).toHaveBeenCalledWith(mockPhotos[0]);
    expect(onPhotoDelete).toHaveBeenCalledWith('1');
  });

  it('filters photos by type when filterByType is set', () => {
    render(<PhotoGallery photos={mockPhotos} filterByType="before" />);

    const viewButtons = screen.getAllByRole('button', { name: 'View photo' });
    expect(viewButtons).toHaveLength(1);
    expect(screen.getByText('before')).toBeInTheDocument();
    expect(screen.queryByText('after')).not.toBeInTheDocument();
  });
});
