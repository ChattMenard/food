// @ts-check
import {
  ErrorTracking,
  getErrorTracking,
  initErrorTracking,
} from '../utils/errorTracking';

describe('ErrorTracking', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ErrorTracking();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with default values', () => {
      expect(tracker.enabled).toBe(false);
      expect(tracker.dsn).toBe('');
      expect(tracker.environment).toBe('development');
      expect(tracker.release).toBe('');
      expect(tracker.user).toBe(null);
    });
  });

  describe('init', () => {
    it('initializes with config', () => {
      tracker.init({
        dsn: 'test-dsn',
        environment: 'production',
        release: '2.0.0',
      });
      expect(tracker.dsn).toBe('test-dsn');
      expect(tracker.environment).toBe('production');
      expect(tracker.release).toBe('2.0.0');
      expect(tracker.enabled).toBe(true);
    });

    it('remains disabled without DSN', () => {
      tracker.init({});
      expect(tracker.enabled).toBe(false);
    });
  });

  describe('captureException', () => {
    it('logs error when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      tracker.captureException(error, { context: 'test' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('does not throw when disabled', () => {
      const error = new Error('Test error');
      expect(() => tracker.captureException(error)).not.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('logs message when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      tracker.captureMessage('Test message', 'warning', { context: 'test' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('uses default level of info', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      tracker.captureMessage('Test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setUser', () => {
    it('sets user context', () => {
      const user = { id: 'user123', email: 'test@example.com' };
      tracker.setUser(user);
      expect(tracker.user).toEqual(user);
    });
  });

  describe('clearUser', () => {
    it('clears user context', () => {
      tracker.user = { id: 'user123' };
      tracker.clearUser();
      expect(tracker.user).toBe(null);
    });
  });

  describe('addBreadcrumb', () => {
    it('does nothing when disabled', () => {
      expect(() => tracker.addBreadcrumb({ message: 'test' })).not.toThrow();
    });
  });

  describe('setTag', () => {
    it('does nothing when disabled', () => {
      expect(() => tracker.setTag('key', 'value')).not.toThrow();
    });
  });

  describe('setContext', () => {
    it('does nothing when disabled', () => {
      expect(() => tracker.setContext('key', { value: 'test' })).not.toThrow();
    });
  });

  describe('wrap', () => {
    it('wraps function with error tracking', () => {
      const fn = jest.fn(() => 'result');
      const wrapped = tracker.wrap(fn, 'testFunction');
      const result = wrapped();
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    it('captures errors from wrapped function', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const fn = jest.fn(() => {
        throw new Error('Test error');
      });
      const wrapped = tracker.wrap(fn, 'testFunction');
      expect(() => wrapped()).toThrow('Test error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('uses anonymous as default name', () => {
      const fn = jest.fn(() => 'result');
      const wrapped = tracker.wrap(fn);
      wrapped();
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('wrapAsync', () => {
    it('wraps async function with error tracking', async () => {
      const fn = jest.fn(async () => 'result');
      const wrapped = tracker.wrapAsync(fn, 'testFunction');
      const result = await wrapped();
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    it('captures errors from wrapped async function', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const fn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const wrapped = tracker.wrapAsync(fn, 'testFunction');
      await expect(wrapped()).rejects.toThrow('Test error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('uses anonymous as default name', async () => {
      const fn = jest.fn(async () => 'result');
      const wrapped = tracker.wrapAsync(fn);
      await wrapped();
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('getErrorTracking', () => {
    it('returns singleton instance', () => {
      const instance1 = getErrorTracking();
      const instance2 = getErrorTracking();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initErrorTracking', () => {
    it('initializes global error tracking', () => {
      initErrorTracking({ dsn: 'test-dsn' });
      const tracker = getErrorTracking();
      expect(tracker.dsn).toBe('test-dsn');
    });
  });
});
