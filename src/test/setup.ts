import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// A map to store mock dimensions for different image data URLs
const mockImageDimensions: Record<string, { width: number; height: number }> = {
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==': { width: 1, height: 1 },
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEklEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=': { width: 2, height: 1 },
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=': { width: 1, height: 2 },
};

// Mock the Image global
Object.defineProperty(global, 'Image', {
  writable: true,
  value: class Image {
    onload: () => void = () => {};
    onerror: () => void = () => {};
    private _src: string = '';

    naturalWidth: number = 200;
    naturalHeight: number = 200;
    width: number = 200;
    height: number = 200;

    constructor() {
      // The onload needs to be async to simulate real image loading
      setTimeout(() => {
        this.onload();
      }, 50);
    }

    get src(): string {
        return this._src;
    }

    set src(value: string) {
        this._src = value;
        const dimensions = mockImageDimensions[value] || { width: 200, height: 200 };
        this.naturalWidth = dimensions.width;
        this.naturalHeight = dimensions.height;
        this.width = dimensions.width;
        this.height = dimensions.height;
        // Trigger onload when src is set, after a short delay
        setTimeout(() => this.onload(), 0);
    }
  },
});

// Mock canvas methods
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: () => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(40000), // Mock data for a 100x100 canvas
    })),
    putImageData: vi.fn(),
    clearRect: vi.fn(),
  }),
});

Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
  writable: true,
  value: (mime: string, quality: number) => `data:${mime};quality=${quality};base64,mocked_data`,
});


// Mock URL.createObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn((blob: Blob) => `blob:${blob.size}`),
});
Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});