import { resolveLocalImageUrl, shouldUseUnoptimizedImage } from '@/shared/utils/media';

describe('media utils', () => {
  it('returns remote URLs unchanged', () => {
    expect(resolveLocalImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    expect(resolveLocalImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('converts Windows file paths to asset URLs', () => {
    const result = resolveLocalImageUrl('C:\\Users\\test\\photo.png');
    // encodeURIComponent('C:/Users/test/photo.png')
    expect(result).toMatch(/asset:\/\/localhost\/C%3A%2FUsers%2Ftest%2Fphoto.png|https:\/\/asset\.localhost\/C%3A%2FUsers%2Ftest%2Fphoto\.png/);
  });

  it('converts file:// URLs to asset URLs', () => {
    const result = resolveLocalImageUrl('file:///C:/Users/test/photo%20name.png');
    // decodeURIComponent first, then replace backslash, then encodeURIComponent
    // 'C:/Users/test/photo name.png'
    expect(result).toMatch(/asset:\/\/localhost\/C%3A%2FUsers%2Ftest%2Fphoto%20name\.png|https:\/\/asset\.localhost\/C%3A%2FUsers%2Ftest%2Fphoto%20name\.png/);
  });

  it('returns a safe fallback instead of file:// when Tauri is unavailable or window is undefined', () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    
    const result = resolveLocalImageUrl('file:///C:/Users/test/photo.png');

    expect(result.startsWith('data:image/')).toBe(true);
    expect(result.startsWith('file://')).toBe(false);
    
    global.window = originalWindow;
  });

  it('marks asset and data URLs as unoptimized', () => {
    expect(shouldUseUnoptimizedImage('asset://C:/photo.png')).toBe(true);
    expect(shouldUseUnoptimizedImage('https://asset.localhost/_tauri/foo')).toBe(true);
    expect(shouldUseUnoptimizedImage('https://example.com/photo.png')).toBe(false);
  });
});

