// @ts-check
import { ErrorTracking, getErrorTracking, initErrorTracking } from '../utils/errorTracking';

describe('ErrorTracking', () => {
  let tracker: ErrorTracking;

  beforeEach(() => {
    tracker = new ErrorTracking();
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with default values', () => {
      expect((tracker as any).enabled).toBe(false);
      expect((tracker as any).dsn).toBe('');
      expect((tracker as any).environment).toBe('development');
      expect((tracker as any).user).toBe(null);
    });
  });

  describe('init', () => {
    it('initializes with provided config', () => {
      const config = {
        dsn: 'test-dsn',
        environment: 'test',
        release: '1.0.0'
      };

      tracker.init(config);

      expect((tracker as any).dsn).toBe('test-dsn');
      expect((tracker as any).environment).toBe('test');
      expect((tracker as any).release).toBe('1.0.0');
      expect((tracker as any).enabled).toBe(true);
    });

    it('uses defaults when config not provided', () => {
      tracker.init();

      expect((tracker as any).dsn).toBe('');
      expect((tracker as any).environment).toBe('development');
      expect((tracker as any).release).toBe('1.0.0');
      expect((tracker as any).enabled).toBe(false);
    });

    it('sets up global error handlers when enabled', () => {
      const mockAddEventListener = jest.fn();
      (global as any).window = { addEventListener: mockAddEventListener };

      tracker.init({ dsn: 'test-dsn' });

      expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });
  });

  describe('captureException', () => {
    it('captures exception when enabled', () => {
      tracker.init({ dsn: 'test-dsn' });

      const error = new Error('Test error');
      const context = { userId: '123' };

      tracker.captureException(error, context);

      expect(console.error).toHaveBeenCalledWith('[ErrorTracking] Captured exception:', error, context);
    });

    it('logs to console when disabled', () => {
      const error = new Error('Test error');
      const context = { userId: '123' };

      tracker.captureException(error, context);

      expect(console.error).toHaveBeenCalledWith('[ErrorTracking]', error, context);
    });
  });

  describe('captureMessage', () => {
    it('captures message when enabled', () => {
      tracker.init({ dsn: 'test-dsn' });

      const message = 'Test message';
      const level = 'warning';
      const context = { component: 'test' };

      tracker.captureMessage(message, level, context);

      expect(console.log).toHaveBeenCalledWith('[ErrorTracking] [warning]', message, context);
    });

    it('uses default level when not provided', () => {
      tracker.init({ dsn: 'test-dsn' });

      tracker.captureMessage('Test message');

      expect(console.log).toHaveBeenCalledWith('[ErrorTracking] [info]', 'Test message', {});
    });

    it('logs to console when disabled', () => {
      tracker.captureMessage('Test message', 'error');

      expect(console.log).toHaveBeenCalledWith('[ErrorTracking] [error]', 'Test message', {});
    });
  });

  describe('setUser', () => {
    it('sets user context', () => {
      const user = { id: '123', email: 'test@example.com' };

      tracker.setUser(user);

      expect((tracker as any).user).toEqual(user);
    });

    it('clears user when null provided', () => {
      tracker.setUser({ id: '123' });
      tracker.setUser(null);

      expect((tracker as any).user).toBe(null);
    });
  });

  describe('clearUser', () => {
    it('clears user context', () => {
      tracker.setUser({ id: '123' });
      tracker.clearUser();

      expect((tracker as any).user).toBe(null);
    });
  });

  describe('addBreadcrumb', () => {
    it('adds breadcrumb when enabled', () => {
      tracker.init({ dsn: 'test-dsn' });

      const breadcrumb = {
        message: 'Test breadcrumb',
        category: 'test',
        level: 'info'
      };

      // Should not throw error
      expect(() => tracker.addBreadcrumb(breadcrumb)).not.toThrow();
    });

    it('does nothing when disabled', () => {
      const breadcrumb = {
        message: 'Test breadcrumb',
        category: 'test',
        level: 'info'
      };

      // Should not throw error
      expect(() => tracker.addBreadcrumb(breadcrumb)).not.toThrow();
    });
  });

  describe('setContext', () => {
    it('sets context when enabled', () => {
      tracker.init({ dsn: 'test-dsn' });

      const context = { feature: 'meal-planning' };

      // Should not throw error
      expect(() => tracker.setContext('app', context)).not.toThrow();
    });

    it('does nothing when disabled', () => {
      const context = { feature: 'meal-planning' };

      // Should not throw error
      expect(() => tracker.setContext('app', context)).not.toThrow();
    });
  });

  describe('setTag', () => {
    it('sets tag when enabled', () => {
      tracker.init({ dsn: 'test-dsn' });

      // Should not throw error
      expect(() => tracker.setTag('environment', 'test')).not.toThrow();
    });

    it('does nothing when disabled', () => {
      // Should not throw error
      expect(() => tracker.setTag('environment', 'test')).not.toThrow();
    });
  });

  describe('wrap', () => {
    it('wraps function with error tracking', () => {
      const fn = jest.fn().mockReturnValue('success');
      const wrapped = tracker.wrap(fn, 'test-function');

      const result = wrapped('arg1', 'arg2');

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('success');
    });

    it('captures errors from wrapped function', () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockImplementation(() => {
        throw error;
      });

      const wrapped = tracker.wrap(fn, 'test-function');

      expect(() => wrapped()).toThrow('Test error');
      expect(console.error).toHaveBeenCalledWith('[ErrorTracking]', error, { function: 'test-function' });
    });
  });

  describe('wrapAsync', () => {
    it('wraps async function with error tracking', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrapped = tracker.wrapAsync(fn, 'test-async-function');

      const result = await wrapped('arg1', 'arg2');

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('success');
    });

    it('captures errors from wrapped async function', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      const wrapped = tracker.wrapAsync(fn, 'test-async-function');

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalledWith('[ErrorTracking]', error, { function: 'test-async-function' });
    });
  });

  describe('global functions', () => {
    it('initErrorTracking initializes global instance', () => {
      const config = { dsn: 'global-dsn', environment: 'test' };

      initErrorTracking(config);

      const instance = getErrorTracking();
      expect((instance as any).dsn).toBe('global-dsn');
      expect((instance as any).environment).toBe('test');
    });

    it('getErrorTracking returns singleton instance', () => {
      const instance1 = getErrorTracking();
      const instance2 = getErrorTracking();

      expect(instance1).toBe(instance2);
    });
  });

  describe('setupGlobalHandlers', () => {
    it('captures unhandled errors', () => {
      const mockAddEventListener = jest.fn();
      (global as any).window = { addEventListener: mockAddEventListener };

      tracker.init({ dsn: 'test-dsn' });

      // Get the error handler
      const errorHandler = mockAddEventListener.mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe('function');
    });

    it('captures unhandled promise rejections', () => {
      const mockAddEventListener = jest.fn();
      (global as any).window = { addEventListener: mockAddEventListener };

      tracker.init({ dsn: 'test-dsn' });

      // Get the rejection handler
      const rejectionHandler = mockAddEventListener.mock.calls.find(
        (call: any) => call[0] === 'unhandledrejection'
      )?.[1];

      expect(rejectionHandler).toBeDefined();
      expect(typeof rejectionHandler).toBe('function');
    });
  });
});
