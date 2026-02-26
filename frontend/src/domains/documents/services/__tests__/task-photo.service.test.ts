import { taskPhotoService } from '@/domains/documents/services/task-photo.service';

describe('TaskPhotoService mapPhotoResponse', () => {
  it('prefers raw url over file_path for display url', () => {
    const mapped = (taskPhotoService as unknown as { mapPhotoResponse: (raw: Record<string, unknown>) => Record<string, unknown> })
      .mapPhotoResponse({
        id: '1',
        task_id: 'task-1',
        file_path: 'C:\\photos\\local.png',
        url: 'https://asset.localhost/local.png',
      });

    expect(mapped.url).toBe('https://asset.localhost/local.png');
    expect(mapped.file_path).toBe('C:\\photos\\local.png');
  });

  it('falls back to file_path when url is absent', () => {
    const mapped = (taskPhotoService as unknown as { mapPhotoResponse: (raw: Record<string, unknown>) => Record<string, unknown> })
      .mapPhotoResponse({
        id: '1',
        task_id: 'task-1',
        file_path: 'C:\\photos\\local.png',
      });

    expect(mapped.url).toBe('C:\\photos\\local.png');
    expect(mapped.file_path).toBe('C:\\photos\\local.png');
  });
});
