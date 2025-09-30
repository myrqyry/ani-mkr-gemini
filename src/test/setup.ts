import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock the Image global
Object.defineProperty(global, 'Image', {
  writable: true,
  value: class Image {
    onload: () => void = () => {};
    onerror: () => void = () => {};
    src: string = '';
    naturalWidth: number = 200;
    naturalHeight: number = 200;
    width: number = 200;
    height: number = 200;

    constructor() {
      setTimeout(() => {
        this.onload();
      }, 100);
    }
  },
});

// Mock canvas methods
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: () => ({
    drawImage: vi.fn(),
  }),
});

Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
  writable: true,
  value: (mime: string, quality: number) => `data:${mime};quality=${quality};base64,mocked_data`,
});


// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});