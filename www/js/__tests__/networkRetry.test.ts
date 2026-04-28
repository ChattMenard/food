// @ts-check
import {
  retryWithBackoff,
  fetchWithRetry,
  fetchJSONWithRetry,
  batchFetchWithRetry,
  checkOnlineStatus,
  OfflineRequestQueue,
  getOfflineQueue,
} from '../utils/networkRetry.js;

// Mock fetch and navigator
global.fetch = jest.fn();
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window
global.window = {
  addEventListener: jest.fn(),
};

describe('networkRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('retryWithBackoff', () => {
    it('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('ValidationError'));
      await expect(retryWithBackoff(fn)).rejects.toThrow('ValidationError');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('respects custom shouldRetry function', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('CustomError'));
      const shouldRetry = jest.fn(() => false);
      await expect(retryWithBackoff(fn, { shouldRetry })).rejects.toThrow(
        'CustomError'
      );
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalled();
    });
  });

  describe('fetchWithRetry', () => {
    it('fetches successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const result = await fetchWithRetry('https://example.com');
      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('throws on non-OK response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchWithRetry('https://example.com')).rejects.toThrow(
        'HTTP 404'
      );
    });
  });

  describe('fetchJSONWithRetry', () => {
    it('returns parsed JSON', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await fetchJSONWithRetry('https://example.com');
      expect(result).toEqual({ data: 'test' });
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('batchFetchWithRetry', () => {
    it('fetches multiple URLs successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const results = await batchFetchWithRetry([
        'https://example.com/1',
        'https://example.com/2',
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('handles mixed success and failure', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
        })
        .mockRejectedValueOnce(new Error('NetworkError'));

      const results = await batchFetchWithRetry([
        'https://example.com/1',
        'https://example.com/2',
      ]);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('includes URL in results', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const results = await batchFetchWithRetry(['https://example.com/1']);
      expect(results[0].url).toBe('https://example.com/1');
    });
  });

  describe('checkOnlineStatus', () => {
    it('returns true when online and fetch succeeds', async () => {
      global.navigator.onLine = true;
      global.fetch.mockResolvedValue({ ok: true });

      const result = await checkOnlineStatus(1);
      expect(result).toBe(true);
    });

    it('returns false when offline', async () => {
      global.navigator.onLine = false;

      const result = await checkOnlineStatus(1);
      expect(result).toBe(false);
    });
  });

  describe('OfflineRequestQueue', () => {
    let queue;

    beforeEach(() => {
      localStorage.clear();
      queue = new OfflineRequestQueue();
      jest.clearAllMocks();
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe('constructor', () => {
      it('initializes with empty queue', () => {
        expect(queue.queue).toEqual([]);
        expect(queue.isProcessing).toBe(false);
      });

      it('loads queue from localStorage', () => {
        const savedQueue = [
          { url: 'https://example.com', timestamp: Date.now(), attempts: 0 },
        ];
        localStorage.setItem('main-offline-queue', JSON.stringify(savedQueue));

        const newQueue = new OfflineRequestQueue();
        expect(newQueue.queue).toEqual(savedQueue);
      });
    });

    describe('add', () => {
      it('adds request to queue', () => {
        queue.add({ url: 'https://example.com', options: {} });
        expect(queue.queue).toHaveLength(1);
        expect(queue.queue[0].url).toBe('https://example.com');
      });

      it('adds timestamp to request', () => {
        queue.add({ url: 'https://example.com' });
        expect(queue.queue[0].timestamp).toBeDefined();
      });

      it('saves queue to localStorage', () => {
        queue.add({ url: 'https://example.com' });
        const saved = localStorage.getItem('main-offline-queue');
        expect(saved).toBeTruthy();
      });
    });

    describe('processQueue', () => {
      it('does not process when offline', async () => {
        global.navigator.onLine = false;
        queue.add({ url: 'https://example.com' });
        await queue.processQueue();
        expect(queue.queue).toHaveLength(1);
      });

      it('does not process when already processing', async () => {
        queue.isProcessing = true;
        queue.add({ url: 'https://example.com' });
        await queue.processQueue();
        expect(queue.queue).toHaveLength(1);
      });

      it('removes successful requests from queue', async () => {
        global.navigator.onLine = true;
        global.fetch.mockResolvedValue({ ok: true });
        queue.add({ url: 'https://example.com' });

        await queue.processQueue();
        expect(queue.queue).toHaveLength(0);
      });

      it('keeps failed requests in queue', async () => {
        global.navigator.onLine = true;
        global.fetch.mockRejectedValue(new Error('NetworkError'));
        queue.add({ url: 'https://example.com' });

        await queue.processQueue();
        expect(queue.queue).toHaveLength(1);
        expect(queue.queue[0].attempts).toBe(1);
      });

      it('removes requests after max attempts', async () => {
        global.navigator.onLine = true;
        global.fetch.mockRejectedValue(new Error('NetworkError'));
        queue.queue = [
          {
            url: 'https://example.com',
            options: {},
            timestamp: Date.now(),
            attempts: 5,
          },
        ];

        await queue.processQueue();
        expect(queue.queue).toHaveLength(0);
      });
    });

    describe('clear', () => {
      it('clears queue', () => {
        queue.add({ url: 'https://example.com' });
        queue.clear();
        expect(queue.queue).toEqual([]);
      });

      it('saves to localStorage', () => {
        queue.add({ url: 'https://example.com' });
        queue.clear();
        const saved = localStorage.getItem('main-offline-queue');
        expect(saved).toBe('[]');
      });
    });

    describe('size', () => {
      it('returns queue size', () => {
        queue.add({ url: 'https://example.com' });
        queue.add({ url: 'https://example.com/2' });
        expect(queue.size()).toBe(2);
      });
    });
  });

  describe('getOfflineQueue', () => {
    it('returns singleton instance', () => {
      const instance1 = getOfflineQueue();
      const instance2 = getOfflineQueue();
      expect(instance1).toBe(instance2);
    });
  });
});
