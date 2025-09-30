import { describe, it, expect } from 'vitest';
import { resizeImage } from './image';

describe('resizeImage', () => {
  it('should resize the image to the specified max size', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const options = {
      maxSize: 100,
      mime: 'image/jpeg',
      quality: 0.8,
    };

    const result = await resizeImage(dataUrl, options);

    expect(result.dataUrl).toBe('data:image/jpeg;quality=0.8;base64,mocked_data');
    expect(result.mime).toBe('image/jpeg');
  });
});