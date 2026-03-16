import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { compressImage } from '../utils/image-compression';
import { formatFileSize } from '@/lib/format';

describe('compressImage', () => {
  beforeEach(() => {
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      _src = '';
      get src() { return this._src; }
      set src(value) {
        this._src = value;
        if (this.onload) setTimeout(() => this.onload!(), 0);
      }
    } as unknown as typeof Image;
    
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
    
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.toBlob = jest.fn(function(this: HTMLCanvasElement, callback: BlobCallback) {
      callback(new Blob(['compressed'], { type: 'image/webp' }));
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;
  });

  afterEach(() => {
    delete (global as unknown as Record<string, unknown>).Image;
    jest.restoreAllMocks();
  });

  it('should compress image to target dimensions', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1000;

    const blob = new Blob(['x'.repeat(1024)], { type: 'image/jpeg' });
    const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });

    const compressed = await compressImage(file, { maxWidth: 1000 });

    expect(compressed.size).toBeLessThan(file.size);
  });

  it('should reduce file size with quality option', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;

    const blob = new Blob(['x'.repeat(1024)], { type: 'image/jpeg' });
    const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });

    const compressed = await compressImage(file, { quality: 0.5 });

    expect(compressed.size).toBeLessThan(file.size);
  });

  it('should output webp format by default', async () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });

    const compressed = await compressImage(file);

    expect(compressed.type).toBe('image/webp');
    expect(compressed.name).toContain('.webp');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 100)).toBe('100.0 KB');
  });

  it('should format MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB');
  });

  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });
});
