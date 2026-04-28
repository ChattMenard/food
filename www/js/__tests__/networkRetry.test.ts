// @ts-check
import {
  retryWithBackoff,
  fetchWithRetry,
  fetchJSONWithRetry,
  batchFetchWithRetry,
  checkOnlineStatus,
  OfflineRequestQueue,
  getOfflineQueue,
} from '../utils/networkRetry';

// Mock fetch and navigator
(global.fetch as jest.Mock) = jest.fn();
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window
(global.window as any) = {
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
      const shouldRetry = jest.fn().mockReturnValue(false);
      
      await expect(retryWithBackoff(fn, { shouldRetry })).rejects.toThrow('CustomError');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(new Error('CustomError'), 1);
    });

    it('retries retryable errors with exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('NetworkError'))
        .mockRejectedValueOnce(new Error('NetworkError'))
        .mockResolvedValue('success');
      
      const promise = retryWithBackoff(fn);
      
      // First attempt fails
      await jest.runAllTimers();
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Second attempt fails
      await jest.runAllTimers();
      expect(fn).toHaveBeenCalledTimes(2);
      
      // Third attempt succeeds
      await jest.runAllTimers();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('respects max retry limit', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('NetworkError'));
      
      const promise = retryWithBackoff(fn, { maxRetries: 3 });
      
      // Allow all retries to fail
      for (let i = 0; i < 4; i++) {
        await jest.runAllTimers();
      }
      
      await expect(promise).rejects.toThrow('NetworkError');
      expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('uses custom delay function', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('NetworkError'))
        .mockResolvedValue('success');
      
      const delayFn = jest.fn().mockReturnValue(100);
      const promise = retryWithBackoff(fn, { delayFn });
      
      await jest.runAllTimers();
      await jest.runAllTimers();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(delayFn).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('handles timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      
      const fn = jest.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue('success');
      
      const promise = retryWithBackoff(fn);
      
      await jest.runAllTimers();
      await jest.runAllTimers();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchWithRetry', () => {
    it('returns response on success', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ data: 'success' }) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const response = await fetchWithRetry('https://api.example.com/data');
      
      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', undefined);
    });

    it('retries network failures', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('NetworkError'))
        .mockResolvedValueOnce({ ok: true });
      
      const promise = fetchWithRetry('https://api.example.com/data');
      
      await jest.runAllTimers();
      await jest.runAllTimers();
      const response = await promise;
      
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('passes options to fetch', async () => {
      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const options = { method: 'POST', body: 'data' };
      await fetchWithRetry('https://api.example.com/data', options);
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', options);
    });

    it('does not retry 4xx responses', async () => {
      const mockResponse = { ok: false, status: 404 };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(fetchWithRetry('https://api.example.com/data')).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries 5xx responses', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true });
      
      const promise = fetchWithRetry('https://api.example.com/data');
      
      await jest.runAllTimers();
      await jest.runAllTimers();
      const response = await promise;
      
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchJSONWithRetry', () => {
    it('parses JSON response', async () => {
      const mockResponse = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({ data: 'success' }) 
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const data = await fetchJSONWithRetry('https://api.example.com/data');
      
      expect(data).toEqual({ data: 'success' });
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('handles JSON parsing errors', async () => {
      const mockResponse = { 
        ok: true, 
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')) 
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(fetchJSONWithRetry('https://api.example.com/data')).rejects.toThrow('Invalid JSON');
    });

    it('retries on JSON errors', async () => {
      const mockResponse1 = { 
        ok: true, 
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')) 
      };
      const mockResponse2 = { 
        ok: true, 
        json: jest.fn().mockResolvedValue({ data: 'success' }) 
      };
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);
      
      const promise = fetchJSONWithRetry('https://api.example.com/data');
      
      await jest.runAllTimers();
      await jest.runAllTimers();
      const data = await promise;
      
      expect(data).toEqual({ data: 'success' });
    });
  });

  describe('batchFetchWithRetry', () => {
    it('fetches multiple URLs concurrently', async () => {
      const mockResponse1 = { ok: true, json: jest.fn().mockResolvedValue({ id: 1 }) };
      const mockResponse2 = { ok: true, json: jest.fn().mockResolvedValue({ id: 2 }) };
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);
      
      const urls = ['https://api.example.com/1', 'https://api.example.com/2'];
      const results = await batchFetchWithRetry(urls);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toEqual({ id: 2 });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('handles partial failures', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: 1 }) };
      
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('NetworkError'))
        .mockResolvedValueOnce(mockResponse);
      
      const urls = ['https://api.example.com/1', 'https://api.example.com/2'];
      const promise = batchFetchWithRetry(urls);
      
      await jest.runAllTimers();
      await jest.runAllTimers();
      const results = await promise;
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toBeNull(); // Failed request
    });

    it('respects concurrency limit', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({}) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const urls = Array.from({ length: 10 }, (_, i) => `https://api.example.com/${i}`);
      
      await batchFetchWithRetry(urls, { concurrency: 3 });
      
      // Should have made all requests but with limited concurrency
      expect(global.fetch).toHaveBeenCalledTimes(10);
    });
  });

  describe('checkOnlineStatus', () => {
    it('returns true when online', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const isOnline = checkOnlineStatus();
      
      expect(isOnline).toBe(true);
    });

    it('returns false when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const isOnline = checkOnlineStatus();
      
      expect(isOnline).toBe(false);
    });

    it('can check with fetch test', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      const isOnline = await checkOnlineStatus({ testWithFetch: true });
      
      expect(isOnline).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('handles fetch test failure', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('NetworkError'));
      
      const isOnline = await checkOnlineStatus({ testWithFetch: true });
      
      expect(isOnline).toBe(false);
    });
  });

  describe('OfflineRequestQueue', () => {
    let queue: OfflineRequestQueue;

    beforeEach(() => {
      queue = new OfflineRequestQueue();
    });

    it('queues requests when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const request = { url: 'https://api.example.com/data', options: {} };
      queue.add(request);
      
      expect(queue.size()).toBe(1);
      expect(queue.isOffline()).toBe(true);
    });

    it('processes queue when coming online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const request = { url: 'https://api.example.com/data', options: {} };
      queue.add(request);
      
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await queue.process();
      
      expect(queue.size()).toBe(0);
      expect(global.fetch).toHaveBeenCalledWith(request.url, request.options);
    });

    it('handles queue processing errors', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const request = { url: 'https://api.example.com/data', options: {} };
      queue.add(request);
      
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('NetworkError'));
      
      await queue.process();
      
      // Request should remain in queue for retry
      expect(queue.size()).toBe(1);
    });

    it('limits queue size', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      // Add requests up to limit
      for (let i = 0; i < 105; i++) {
        queue.add({ url: `https://api.example.com/${i}`, options: {} });
      }
      
      expect(queue.size()).toBeLessThanOrEqual(100);
    });

    it('persists queue to localStorage', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const request = { url: 'https://api.example.com/data', options: {} };
      queue.add(request);
      
      const saved = localStorage.getItem('offline-request-queue');
      expect(saved).toBeDefined();
      
      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(request);
    });

    it('loads queue from localStorage', () => {
      const requests = [
        { url: 'https://api.example.com/1', options: {} },
        { url: 'https://api.example.com/2', options: {} }
      ];
      
      localStorage.setItem('offline-request-queue', JSON.stringify(requests));
      
      const newQueue = new OfflineRequestQueue();
      expect(newQueue.size()).toBe(2);
    });

    it('clears queue', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      queue.add({ url: 'https://api.example.com/data', options: {} });
      queue.add({ url: 'https://api.example.com/data2', options: {} });
      
      queue.clear();
      
      expect(queue.size()).toBe(0);
      expect(localStorage.getItem('offline-request-queue')).toBeNull();
    });
  });

  describe('getOfflineQueue', () => {
    it('returns singleton instance', () => {
      const queue1 = getOfflineQueue();
      const queue2 = getOfflineQueue();
      
      expect(queue1).toBe(queue2);
    });

    it('creates queue with default options', () => {
      const queue = getOfflineQueue();
      
      expect(queue).toBeInstanceOf(OfflineRequestQueue);
    });

    it('passes custom options', () => {
      const queue = getOfflineQueue({ maxSize: 50 });
      
      expect(queue).toBeInstanceOf(OfflineRequestQueue);
    });
  });

  describe('integration', () => {
    it('handles complete offline to online flow', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const queue = getOfflineQueue();
      const request = { url: 'https://api.example.com/data', options: { method: 'POST' } };
      queue.add(request);
      
      expect(queue.size()).toBe(1);
      
      // Come online
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ success: true }) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await queue.process();
      
      expect(queue.size()).toBe(0);
      expect(global.fetch).toHaveBeenCalledWith(request.url, request.options);
    });

    it('handles network status changes', () => {
      const queue = getOfflineQueue();
      
      // Mock online status change
      const onlineHandler = (queue as any).handleOnline;
      const offlineHandler = (queue as any).handleOffline;
      
      offlineHandler();
      expect(queue.isOffline()).toBe(true);
      
      onlineHandler();
      expect(queue.isOffline()).toBe(false);
    });
  });
});
