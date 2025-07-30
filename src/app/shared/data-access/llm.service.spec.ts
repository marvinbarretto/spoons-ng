import { TestBed } from '@angular/core/testing';
import { LLMService } from './llm.service';

// Mock Google Generative AI
const mockGenerateContent = jest.fn();
const mockModel = {
  generateContent: mockGenerateContent,
};
const mockGenAI = {
  getGenerativeModel: jest.fn().mockReturnValue(mockModel),
};

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => mockGenAI),
}));

// Mock canvas and image operations since they're not available in test environment
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn().mockReturnValue({
    drawImage: jest.fn(),
  }),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: jest.fn().mockReturnValue('data:image/jpeg;base64,optimized-image-data'),
});

// Mock Image constructor to immediately trigger onload
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  width: number = 512;
  height: number = 384;

  constructor() {
    // Immediately trigger onload in next tick to simulate successful image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LLMService],
    });
    service = TestBed.inject(LLMService);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isCarpet', () => {
    it('should return true when LLM detects carpet', async () => {
      // Mock successful carpet detection
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Is Carpet: Yes\nConfidence: 85%\nReasoning: Clear carpet pattern visible',
        },
      });

      const result = await service.isCarpet('data:image/jpeg;base64,fake-image-data');

      expect(result).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should return false when LLM does not detect carpet', async () => {
      // Mock no carpet detection
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Is Carpet: No\nConfidence: 90%\nReasoning: Hard floor surface detected',
        },
      });

      const result = await service.isCarpet('data:image/jpeg;base64,fake-image-data');

      expect(result).toBe(false);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should return false when LLM call fails', async () => {
      // Mock LLM failure
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await service.isCarpet('data:image/jpeg;base64,fake-image-data');

      expect(result).toBe(false);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should return false when detectCarpet returns unsuccessful response', async () => {
      // Mock unsuccessful response
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      const result = await service.isCarpet('data:image/jpeg;base64,fake-image-data');

      expect(result).toBe(false);
    });
  });

  describe('detectCarpet', () => {
    it('should return successful carpet detection result', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            'Is Carpet: Yes\nConfidence: 85%\nReasoning: Textile pattern visible\nVisual Elements: Red, geometric pattern',
        },
      });

      const result = await service.detectCarpet('data:image/jpeg;base64,fake-image-data');

      expect(result.success).toBe(true);
      expect(result.data.isCarpet).toBe(true);
      expect(result.data.confidence).toBe(85);
      expect(result.data.reasoning).toContain('Textile pattern visible');
    });

    it('should handle malformed LLM response gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Some random response without proper format',
        },
      });

      const result = await service.detectCarpet('data:image/jpeg;base64,fake-image-data');

      expect(result.success).toBe(true);
      expect(result.data.confidence).toBe(50); // fallback confidence
    });

    it('should return error result when LLM fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Rate Limit'));

      const result = await service.detectCarpet('data:image/jpeg;base64,fake-image-data');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Rate Limit');
      expect(result.data.isCarpet).toBe(false);
    });
  });

  describe('signal states', () => {
    it('should track processing state during LLM calls', async () => {
      let processingState: boolean;

      // Set up a slow mock to test processing state
      mockGenerateContent.mockImplementation(async () => {
        processingState = service.isProcessing();
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          response: {
            text: () => 'Is Carpet: Yes\nConfidence: 80%',
          },
        };
      });

      const promise = service.isCarpet('data:image/jpeg;base64,fake-image-data');

      // Should be processing during the call
      await promise;
      expect(processingState).toBe(true);

      // Should not be processing after completion
      expect(service.isProcessing()).toBe(false);
    });

    it('should increment request count on successful calls', async () => {
      const initialCount = service.requestCount();

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Is Carpet: Yes\nConfidence: 80%',
        },
      });

      await service.detectCarpet('data:image/jpeg;base64,fake-image-data');

      expect(service.requestCount()).toBe(initialCount + 1);
    });
  });
});
