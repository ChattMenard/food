// @ts-check
import { SyncProcessor } from '../../data/syncProcessor';

jest.mock('../../data/mutationQueue', () => ({
  getPending: jest.fn().mockResolvedValue([]),
  markSynced: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
  incrementRetry: jest.fn().mockResolvedValue(1)
}));

import { getPending, markSynced, markFailed, incrementRetry } from '../../data/mutationQueue';

describe('SyncProcessor', () => {
  let processor: SyncProcessor;

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
      expect(processor.isProcessingData).toBe(false);
      expect(processor.isOnlineData).toBe(true);
      expect(processor.handlersData).toBeInstanceOf(Map);
      expect(processor.intervalIdData).not.toBeNull();
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
      expect(processor.intervalIdData).not.toBeNull();
    });
  });

  describe('registerHandler', () => {
    it('registers a handler for mutation type', () => {
      processor = new SyncProcessor();
      const handler = jest.fn().mockResolvedValue({ success: true });
      
      processor.registerHandler('ADD_ITEM', handler);
      
      expect(processor.handlersData.has('ADD_ITEM')).toBe(true);
      expect(processor.handlersData.get('ADD_ITEM')).toBe(handler);
    });

    it('overwrites existing handler', () => {
      processor = new SyncProcessor();
      const handler1 = jest.fn().mockResolvedValue({ success: true });
      const handler2 = jest.fn().mockResolvedValue({ success: true });
      
      processor.registerHandler('ADD_ITEM', handler1);
      processor.registerHandler('ADD_ITEM', handler2);
      
      expect(processor.handlersData.get('ADD_ITEM')).toBe(handler2);
    });
  });

  describe('processMutations', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('processes pending mutations when online', async () => {
      const mockMutations = [
        { id: '1', type: 'ADD_ITEM', payload: { id: 1 } },
        { id: '2', type: 'UPDATE_ITEM', payload: { id: 2 } }
      ];
      (getPending as jest.Mock).mockResolvedValue(mockMutations);
      
      const handler = jest.fn().mockResolvedValue({ success: true });
      processor.registerHandler('ADD_ITEM', handler);
      processor.registerHandler('UPDATE_ITEM', handler);
      
      await processor.processMutations();
      
      expect(handler).toHaveBeenCalledTimes(2);
      expect(markSynced).toHaveBeenCalledWith('1');
      expect(markSynced).toHaveBeenCalledWith('2');
    });

    it('does not process when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      processor = new SyncProcessor();
      
      await processor.processMutations();
      
      expect(getPending).not.toHaveBeenCalled();
    });

    it('does not process when already processing', async () => {
      processor = new SyncProcessor();
      (processor as any).isProcessingData = true;
      
      await processor.processMutations();
      
      expect(getPending).not.toHaveBeenCalled();
    });

    it('handles failed mutations', async () => {
      const mockMutations = [
        { id: '1', type: 'ADD_ITEM', payload: { id: 1 } }
      ];
      (getPending as jest.Mock).mockResolvedValue(mockMutations);
      
      const handler = jest.fn().mockResolvedValue({ success: false, error: 'Network error' });
      processor.registerHandler('ADD_ITEM', handler);
      
      await processor.processMutations();
      
      expect(markFailed).toHaveBeenCalledWith('1', 'Network error');
    });

    it('increments retry count on handler errors', async () => {
      const mockMutations = [
        { id: '1', type: 'ADD_ITEM', payload: { id: 1 } }
      ];
      (getPending as jest.Mock).mockResolvedValue(mockMutations);
      
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
      processor.registerHandler('ADD_ITEM', handler);
      
      await processor.processMutations();
      
      expect(incrementRetry).toHaveBeenCalledWith('1');
    });

    it('skips mutations without handlers', async () => {
      const mockMutations = [
        { id: '1', type: 'UNKNOWN_TYPE', payload: { id: 1 } }
      ];
      (getPending as jest.Mock).mockResolvedValue(mockMutations);
      
      await processor.processMutations();
      
      expect(markFailed).toHaveBeenCalledWith('1', 'No handler for mutation type: UNKNOWN_TYPE');
    });
  });

  describe('start', () => {
    it('starts periodic sync', () => {
      processor = new SyncProcessor();
      processor.stop();
      
      processor.start();
      
      expect(processor.intervalIdData).not.toBeNull();
    });

    it('does not start multiple intervals', () => {
      processor = new SyncProcessor();
      const originalInterval = processor.intervalIdData;
      
      processor.start();
      
      expect(processor.intervalIdData).toBe(originalInterval);
    });
  });

  describe('stop', () => {
    it('stops periodic sync', () => {
      processor = new SyncProcessor();
      
      processor.stop();
      
      expect(processor.intervalIdData).toBeNull();
    });

    it('handles stopping when not running', () => {
      processor = new SyncProcessor();
      processor.stop();
      
      expect(() => processor.stop()).not.toThrow();
    });
  });

  describe('online/offline handling', () => {
    beforeEach(() => {
      processor = new SyncProcessor();
    });

    it('sets online status when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const onlineHandler = (processor as any).handleOnline;
      onlineHandler();
      
      expect(processor.isOnlineData).toBe(true);
    });

    it('sets offline status when offline event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const offlineHandler = (processor as any).handleOffline;
      offlineHandler();
      
      expect(processor.isOnlineData).toBe(false);
    });

    it('triggers sync when coming online', () => {
      processor = new SyncProcessor();
      const processSpy = jest.spyOn(processor, 'processMutations');
      
      const onlineHandler = (processor as any).handleOnline;
      onlineHandler();
      
      expect(processSpy).toHaveBeenCalled();
    });
  });

  describe('periodic sync', () => {
    it('processes mutations periodically', async () => {
      processor = new SyncProcessor();
      const processSpy = jest.spyOn(processor, 'processMutations');
      
      jest.advanceTimersByTime(30000); // 30 seconds
      
      expect(processSpy).toHaveBeenCalled();
    });

    it('continues processing after errors', async () => {
      processor = new SyncProcessor();
      (getPending as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      jest.advanceTimersByTime(30000);
      
      // Should not throw and continue processing
      expect(() => jest.advanceTimersByTime(30000)).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('returns current status', () => {
      processor = new SyncProcessor();
      
      const status = processor.getStatus();
      
      expect(status.isProcessing).toBe(false);
      expect(status.isOnline).toBe(true);
      expect(status.handlerCount).toBe(0);
      expect(status.isPeriodicSyncActive).toBe(true);
    });

    it('reflects current state', () => {
      processor = new SyncProcessor();
      (processor as any).isProcessingData = true;
      processor.registerHandler('TEST', jest.fn());
      
      const status = processor.getStatus();
      
      expect(status.isProcessing).toBe(true);
      expect(status.handlerCount).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('cleans up resources', () => {
      processor = new SyncProcessor();
      
      processor.cleanup();
      
      expect(processor.intervalIdData).toBeNull();
      expect(processor.handlersData.size).toBe(0);
    });

    it('removes event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      processor = new SyncProcessor();
      
      processor.cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});
