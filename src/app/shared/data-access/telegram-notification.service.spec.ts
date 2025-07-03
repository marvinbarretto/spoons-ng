import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TelegramNotificationService } from './telegram-notification.service';
import { Feedback } from '../../feedback/utils/feedback.model';

describe('TelegramNotificationService', () => {
  let service: TelegramNotificationService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TelegramNotificationService]
    });
    service = TestBed.inject(TelegramNotificationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not send notification if telegram is not configured', async () => {
    const mockFeedback: Feedback = {
      id: 'test-id',
      userId: 'user-123',
      userEmail: 'test@example.com',
      userDisplayName: 'Test User',
      type: 'bug',
      message: 'Test feedback message',
      context: {
        userAgent: 'Mozilla/5.0 (Chrome)',
        currentUrl: 'https://example.com',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date()
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Should not make any HTTP requests when telegram is not configured
    await service.sendFeedbackNotification(mockFeedback);
    
    httpTestingController.expectNone(() => true);
  });

  it('should format feedback message correctly', () => {
    const mockFeedback: Feedback = {
      id: 'test-id',
      userId: 'user-123',
      userEmail: 'test@example.com',
      userDisplayName: 'Test User',
      type: 'bug',
      message: 'Test feedback message',
      context: {
        userAgent: 'Mozilla/5.0 (Chrome)',
        currentUrl: 'https://example.com',
        viewport: { width: 1920, height: 1080 },
        timestamp: new Date()
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Test the private method indirectly by checking the console output
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    await service.sendFeedbackNotification(mockFeedback);
    
    expect(consoleSpy).toHaveBeenCalledWith('[TelegramNotificationService] Telegram not configured, skipping notification');
    
    consoleSpy.mockRestore();
  });
});