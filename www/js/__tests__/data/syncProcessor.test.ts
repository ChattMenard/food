// @ts-check
import { SyncProcessor } from '../../data/syncProcessor';

jest.mock('../../data/mutationQueue', () => ({
  getPending: jest.fn().mockResolvedValue([]),
  markSynced: jest.fn().mockResolvedValue(),
  markFailed: jest.fn().mockResolvedValue(),
  incrementRetry: jest.fn().mockImplementation(() => Promise.resolve(1))
}));

import { getPending, markSynced, markFailed, incrementRetry } from '../../data/mutationQueue';

describe('SyncProcessor', () => {
  let processor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('initializes with correct state', () => {
      processor = new SyncProcessor();
      expect(processor.isProcessing).toBe(false);
      expect(processor.isOnline).toBe(true);
      expect(processor.handlers).toBeInstanceOf(Map);
      expect(processor.intervalId).not.toBeNull();
    });

    it('sets up online/offline listeners', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      processor = new SyncProcessor();
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('starts periodic sync', () => {
      processor = new SyncProcessor();
      expect(processor.intervalId).not.toBeNull();
    });
  });

  describe('registerHandler', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('registers a handler for mutation type', () => {
      const handler = jest.fn().mockImplementation(() => Promise.resolve({ success: true }));
      processor.registerHandler('ADD_ITEM', handler);
      expect(processor.handlers.get('ADD_ITEM')).toBe(handler);
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('returns current sync status', () => {
      const status = processor.getStatus();
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isProcessing');
      expect(status).toHaveProperty('registeredHandlers');
      expect(status).toHaveProperty('intervalActive');
    });

    it('shows interval is active', () => {
      const status = processor.getStatus();
      expect(status.intervalActive).toBe(true);
    });
  });

  describe('stopPeriodicSync', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('clears interval', () => {
      processor.stopPeriodicSync();
      expect(processor.intervalId).toBeNull();
    });

    it('does nothing if interval already cleared', () => {
      processor.stopPeriodicSync();
      expect(() => processor.stopPeriodicSync()).not.toThrow();
    });
  });

  describe('processPending', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('does not process if already processing', async () => {
      processor.isProcessing = true;
      await processor.processPending();
      expect(getPending).not.toHaveBeenCalled();
    });

    it('does not process if offline', async () => {
      processor.isOnline = false;
      await processor.processPending();
      expect(getPending).not.toHaveBeenCalled();
    });

    it('processes pending mutations when online and not processing', async () => {
      getPending.mockResolvedValue([{ id: '1', type: 'ADD_ITEM', payload: {} }]);
      const handler = jest.fn().mockImplementation(() => Promise.resolve({ success: true }));
      processor.registerHandler('ADD_ITEM', handler);
      
      await processor.processPending();
      expect(getPending).toHaveBeenCalled();
    });

    it('returns early if no pending mutations', async () => {
      getPending.mockResolvedValue([]);
      await processor.processPending();
      expect(getPending).toHaveBeenCalled();
    });

    it('sets isProcessing flag', async () => {
      getPending.mockResolvedValue([]);
      await processor.processPending();
      expect(processor.isProcessing).toBe(false);
    });
  });

  describe('processMutation', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('marks failed if max retries exceeded', async () => {
      const mutation = { id: '1', type: 'ADD_ITEM', payload: {}, retryCount: 5 };
      await processor.processMutation(mutation);
      expect(markFailed).toHaveBeenCalledWith('1', 'Max retries exceeded');
    });

    it('marks failed if no handler registered', async () => {
      const mutation = { id: '1', type: 'UNKNOWN_TYPE', payload: {} };
      await processor.processMutation(mutation);
      expect(markFailed).toHaveBeenCalledWith('1', 'No handler for type: UNKNOWN_TYPE');
    });

    it('executes handler and marks synced on success', async () => {
      const handler = jest.fn().mockImplementation(() => Promise.resolve({ success: true }));
      processor.registerHandler('ADD_ITEM', handler);
      const mutation = { id: '1', type: 'ADD_ITEM', payload: { name: 'test' }, entityId: 'pantry:test' };
      
      await processor.processMutation(mutation);
      expect(handler).toHaveBeenCalledWith(mutation);
      expect(markSynced).toHaveBeenCalledWith('1');
    });

    it('increments retry count on handler failure', async () => {
      const handler = jest.fn().mockImplementation(() => Promise.resolve({ success: false, error: 'Handler error' }));
      processor.registerHandler('ADD_ITEM', handler);
      const mutation = { id: '1', type: 'ADD_ITEM', payload: {} };
      
      await processor.processMutation(mutation);
      expect(incrementRetry).toHaveBeenCalledWith('1');
    });

    it('marks failed after increment if max retries reached', async () => {
      incrementRetry.mockResolvedValue(5);
      const handler = jest.fn().mockImplementation(() => Promise.resolve({ success: false, error: 'Handler error' }));
      processor.registerHandler('ADD_ITEM', handler);
      const mutation = { id: '1', type: 'ADD_ITEM', payload: {} };
      
      await processor.processMutation(mutation);
      expect(markFailed).toHaveBeenCalled();
    });

    it('sleeps before retry if retryCount > 0', async () => {
      const handler = jest.fn().mockImplementation(() => Promise.resolve({ success: true }));
      processor.registerHandler('ADD_ITEM', handler);
      const mutation = { id: '1', type: 'ADD_ITEM', payload: {}, retryCount: 1 };
      
      const sleepSpy = jest.spyOn(processor, 'sleep').mockResolvedValue();
      await processor.processMutation(mutation);
      expect(sleepSpy).toHaveBeenCalled();
      sleepSpy.mockRestore();
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('resolves after specified delay', async () => {
      jest.useFakeTimers();
      const promise = processor.sleep(1000);
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });
  });

  describe('forceSync', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('triggers processPending', async () => {
      getPending.mockResolvedValue([]);
      const processSpy = jest.spyOn(processor, 'processPending');
      await processor.forceSync();
      expect(processSpy).toHaveBeenCalled();
    });
  });

  describe('setupListeners', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('sets isOnline to true on online event', () => {
      processor.isOnline = false;
      window.dispatchEvent(new Event('online'));
      expect(processor.isOnline).toBe(true);
    });

    it('sets isOnline to false on offline event', () => {
      processor.isOnline = true;
      window.dispatchEvent(new Event('offline'));
      expect(processor.isOnline).toBe(false);
    });
  });

  describe('startPeriodicSync', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
      processor.stopPeriodicSync();
    });

    it('sets interval ID', () => {
      processor.startPeriodicSync();
      expect(processor.intervalId).not.toBeNull();
    });

    it('triggers processPending on interval when online', async () => {
      const handler = jest.fn().mockImplementation(() => Promise.resolve({ success: true }));
      processor.registerHandler('ADD_ITEM', handler);
      getPending.mockResolvedValue([{ id: '1', type: 'ADD_ITEM', payload: {} }]);
      
      processor.startPeriodicSync();
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      
      expect(getPending).toHaveBeenCalled();
    });

    it('does not trigger when offline', async () => {
      processor.isOnline = false;
      getPending.mockResolvedValue([]);
      
      processor.startPeriodicSync();
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      
      expect(getPending).not.toHaveBeenCalled();
    });
  });
});
