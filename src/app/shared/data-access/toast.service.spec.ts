import { TestBed } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';
import { v4 as uuid } from 'uuid';

// Mock the uuid library
jest.mock('uuid');

describe('ToastService', () => {
  let service: ToastService;
  let mockUuid: jest.MockedFunction<typeof uuid>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService],
    });
    service = TestBed.inject(ToastService);
    mockUuid = uuid as jest.MockedFunction<typeof uuid>;

    // Reset toasts before each test
    service.clearAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Adding Toasts', () => {
    it('should add a success toast with correct properties', () => {
      mockUuid.mockReturnValue('test-id-1');
      service.success('Success message', 1000, false);
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(1);
      expect(toasts[0]).toEqual({
        id: 'test-id-1',
        message: 'Success message',
        type: 'success',
        sticky: false,
        timeout: 1000,
      });
    });

    it('should add an error toast with correct properties', () => {
      mockUuid.mockReturnValue('test-id-2');
      service.error('Error message', 2000, true);
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(1);
      expect(toasts[0]).toEqual({
        id: 'test-id-2',
        message: 'Error message',
        type: 'error',
        sticky: true,
        timeout: 2000,
      });
    });

    it('should add a warning toast with default sticky and custom timeout', () => {
      mockUuid.mockReturnValue('test-id-3');
      service.warning('Warning message', 1500);
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(1);
      expect(toasts[0]).toEqual({
        id: 'test-id-3',
        message: 'Warning message',
        type: 'warning',
        sticky: false,
        timeout: 1500,
      });
    });

    it('should add an info toast with default timeout and sticky', () => {
      mockUuid.mockReturnValue('test-id-4');
      service.info('Info message');
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(1);
      expect(toasts[0]).toEqual(
        expect.objectContaining({
          id: 'test-id-4',
          message: 'Info message',
          type: 'info',
          sticky: false,
          // Default timeout for info is 3000
          timeout: 3000,
        })
      );
    });

    it('should generate unique IDs for multiple toasts', () => {
      mockUuid.mockReturnValueOnce('id-1').mockReturnValueOnce('id-2');
      service.success('First toast');
      service.error('Second toast');
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(2);
      expect(toasts[0].id).toBe('id-1');
      expect(toasts[1].id).toBe('id-2');
    });

    it('should use default timeout if not provided (success)', () => {
      service.success('Success message');
      const toasts = service.toasts$$Readonly();
      expect(toasts[0].timeout).toBe(3000); // Default for success
    });

    it('should use default timeout if not provided (error)', () => {
      service.error('Error message');
      const toasts = service.toasts$$Readonly();
      expect(toasts[0].timeout).toBe(5000); // Default for error
    });

    it('should use default timeout if not provided (warning)', () => {
      service.warning('Warning message');
      const toasts = service.toasts$$Readonly();
      expect(toasts[0].timeout).toBe(4000); // Default for warning
    });

    it('should use default timeout if not provided (info)', () => {
      service.info('Info message');
      const toasts = service.toasts$$Readonly();
      expect(toasts[0].timeout).toBe(3000); // Default for info
    });


    it('should correctly set sticky property', () => {
      service.success('Sticky toast', 5000, true);
      service.error('Non-sticky toast', 5000, false);
      const toasts = service.toasts$$Readonly();
      expect(toasts[0].sticky).toBe(true);
      expect(toasts[1].sticky).toBe(false);
    });
  });

  describe('Dismissing Toasts', () => {
    beforeEach(() => {
      mockUuid.mockReturnValueOnce('id-dismiss-1').mockReturnValueOnce('id-dismiss-2');
      service.info('Toast 1');
      service.info('Toast 2');
    });

    it('should dismiss the correct toast by ID', () => {
      let toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(2);
      expect(toasts.find(t => t.id === 'id-dismiss-1')).toBeDefined();

      service.dismiss('id-dismiss-1');
      toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(1);
      expect(toasts.find(t => t.id === 'id-dismiss-1')).toBeUndefined();
      expect(toasts[0].id).toBe('id-dismiss-2');
    });

    it('should do nothing if ID to dismiss is not found', () => {
      let toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(2);

      service.dismiss('non-existent-id');
      toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(2); // No change
    });
  });

  describe('Clearing Toasts', () => {
    it('should remove all toasts when clearAll is called', () => {
      mockUuid.mockReturnValueOnce('id-clear-1').mockReturnValueOnce('id-clear-2');
      service.success('Toast A');
      service.error('Toast B');
      let toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(2);

      service.clearAll();
      toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(0);
    });

    it('should handle clearAll when there are no toasts', () => {
      let toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(0);

      service.clearAll();
      toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(0);
    });
  });

  describe('Signal Behavior', () => {
    it('toasts$ should emit updated list after adding a toast', () => {
      mockUuid.mockReturnValue('sig-id-1');
      service.success('Signal test');
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Signal test');
    });

    it('toasts$ should emit updated list after dismissing a toast', () => {
      mockUuid.mockReturnValueOnce('sig-id-2a').mockReturnValueOnce('sig-id-2b');
      service.info('Toast X');
      service.info('Toast Y');

      service.dismiss('sig-id-2a');
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(1);
      expect(toasts[0].id).toBe('sig-id-2b');
    });

    it('toasts$ should emit an empty list after clearAll', () => {
      mockUuid.mockReturnValue('sig-id-3');
      service.warning('Another toast');
      service.clearAll();
      const toasts = service.toasts$$Readonly();
      expect(toasts.length).toBe(0);
    });
  });

  // Note: Testing the actual setTimeout behavior for auto-dismissal
  // is more complex and often involves fakeAsync, tick, and potentially
  // spying on window.setTimeout. For this service, the primary responsibility
  // is managing the toasts array and signal. The auto-dismissal initiator
  // is tested by checking if the timeout property is set.
  // The component tests would be a better place to verify if the
  // dismiss call actually happens after a timeout.
});
