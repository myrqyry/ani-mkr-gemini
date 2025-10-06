import { describe, it, expect, vi, afterEach } from 'vitest';
import { resizeImage } from './image';

describe('resizeImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resize a square image to the specified max size', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='; // 1x1 pixel
    const options = {
      maxSize: 100,
      mime: 'image/jpeg',
      quality: 0.8,
    };

    const widthSetter = vi.spyOn(window.HTMLCanvasElement.prototype, 'width', 'set');
    const heightSetter = vi.spyOn(window.HTMLCanvasElement.prototype, 'height', 'set');

    const result = await resizeImage(dataUrl, options);

    expect(result.dataUrl).toBe('data:image/jpeg;quality=0.8;base64,mocked_data');
    expect(result.mime).toBe('image/jpeg');
    expect(widthSetter).toHaveBeenCalledWith(100);
    expect(heightSetter).toHaveBeenCalledWith(100);
  });

  it('should preserve aspect ratio for landscape image when squareCrop is false', async () => {
    // 2x1 pixel image
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEklEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const options = {
      maxSize: 200,
      squareCrop: false,
    };

    const widthSetter = vi.spyOn(window.HTMLCanvasElement.prototype, 'width', 'set');
    const heightSetter = vi.spyOn(window.HTMLCanvasElement.prototype, 'height', 'set');

    await resizeImage(dataUrl, options);

    // Aspect ratio is 2:1. Width should be maxSize, height should be half of that.
    expect(widthSetter).toHaveBeenCalledWith(200);
    expect(heightSetter).toHaveBeenCalledWith(100);
  });

  it('should preserve aspect ratio for portrait image when squareCrop is false', async () => {
    // 1x2 pixel image
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const options = {
      maxSize: 200,
      squareCrop: false,
    };

    const widthSetter = vi.spyOn(window.HTMLCanvasElement.prototype, 'width', 'set');
    const heightSetter = vi.spyOn(window.HTMLCanvasElement.prototype, 'height', 'set');

    await resizeImage(dataUrl, options);

    // Aspect ratio is 1:2. Height should be maxSize, width should be half of that.
    expect(widthSetter).toHaveBeenCalledWith(100);
    expect(heightSetter).toHaveBeenCalledWith(200);
  });
});