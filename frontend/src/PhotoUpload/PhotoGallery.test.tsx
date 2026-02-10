import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PhotoGallery from './PhotoGallery';

const mockPhotos = [
  {
    id: '1',
    file_name: 'Photo 1',
    file_path: '/photo1.jpg',
    storage_url: '/photo1.jpg',
    photo_type: 'before',
    uploaded_at: new Date('2024-01-01T10:00:00Z').getTime(),
    created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    approved_by: null,
  },
  {
    id: '2',
    file_name: 'Photo 2',
    file_path: '/photo2.jpg',
    storage_url: '/photo2.jpg',
    photo_type: 'after',
    uploaded_at: new Date('2024-01-01T11:00:00Z').getTime(),
    created_at: new Date('2024-01-01T11:00:00Z').toISOString(),
    approved_by: null,
  },
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
