import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { PpfPhotoGrid } from './PpfPhotoGrid';

const uploadPhotosMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('@/domains/documents', () => ({
  usePhotoUpload: () => ({
    uploadPhotos: uploadPhotosMock,
    isOnline: true,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

jest.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (value: string) => value,
}));

describe('PpfPhotoGrid upload errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a user-friendly message when upload permission is denied', async () => {
    uploadPhotosMock.mockRejectedValueOnce(new Error('permission denied'));

    const { container } = render(
      <PpfPhotoGrid
        taskId="task-1"
        interventionId="int-1"
        stepId="inspection"
        photos={[]}
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Accès aux photos refusé. Vérifiez les permissions de l'application puis réessayez."
      );
    });
  });

  it('falls back to a generic friendly message for unknown errors', async () => {
    uploadPhotosMock.mockRejectedValueOnce(new Error('unexpected'));

    const { container } = render(
      <PpfPhotoGrid
        taskId="task-1"
        interventionId="int-1"
        stepId="inspection"
        photos={[]}
        onChange={jest.fn()}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Impossible de téléverser les photos pour le moment. Veuillez réessayer.'
      );
    });
  });
});
