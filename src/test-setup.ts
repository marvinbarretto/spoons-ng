import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import 'zone.js';
import 'zone.js/testing';

// Initialize the Angular testing environment
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

// Configure test environment for better Angular compatibility
// Note: Component resource loading issues with Vitest+Angular will be addressed
// by focusing on service/store testing first, then component behavior testing

// Mock global objects that might be used in tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock HTMLCanvasElement and Canvas 2D Context for image format detection tests
const createMockCanvas = () => {
  const mockContext = {
    fillStyle: '#000000',
    fillRect: () => {}, // Mock implementation - no actual drawing
    getImageData: (sx: number, sy: number, sw: number, sh: number) => {
      // Return mock image data
      const data = new Uint8ClampedArray(sw * sh * 4);
      // Fill with test data (red pixels)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255; // Red
        data[i + 1] = 0; // Green
        data[i + 2] = 0; // Blue
        data[i + 3] = 255; // Alpha
      }
      return {
        data,
        width: sw,
        height: sh,
        colorSpace: 'srgb',
      };
    },
  };

  const mockCanvas = {
    width: 300,
    height: 150,
    getContext: (contextId: string, options?: any) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    },
    toDataURL: (type?: string, quality?: any) => {
      // Return different data URLs based on the requested type
      // This simulates successful format support detection
      switch (type) {
        case 'image/webp':
          return 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
        case 'image/jpeg':
          return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA';
        case 'image/png':
        default:
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
      }
    },
    toBlob: (callback: BlobCallback, type?: string, quality?: any) => {
      // Mock blob creation
      const blob = new Blob(['mock-image-data'], { type: type || 'image/png' });
      callback(blob);
    },
  };

  return mockCanvas;
};

// Mock document.createElement for canvas elements
const originalCreateElement = document.createElement.bind(document);
document.createElement = function (tagName: string, options?: any): any {
  if (tagName.toLowerCase() === 'canvas') {
    return createMockCanvas() as any;
  }
  return originalCreateElement(tagName, options);
};

// Also mock HTMLCanvasElement constructor for cases where it's accessed directly
Object.defineProperty(global, 'HTMLCanvasElement', {
  writable: true,
  value: function () {
    return createMockCanvas();
  },
});
