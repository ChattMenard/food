/**
 * Offline Manager
 * Handles offline detection, loading states, and offline fallbacks
 */

interface LoadingState {
  isLoading: boolean;
  message: string;
  timestamp: number;
}

interface QueuedAction {
  type: string;
  data?: Record<string, unknown>;
  retryKey?: string;
  id: number;
  timestamp: number;
}


class OfflineManager {
  isOnline: boolean;
  loadingStates: Map<string, LoadingState>;
  offlineQueue: QueuedAction[];
  maxQueueSize: number;
  retryAttempts: Map<string, number>;
  maxRetries: number;

  constructor() {
    this.isOnline = navigator.onLine;
    this.loadingStates = new Map();
    this.offlineQueue = [];
    this.maxQueueSize = 100;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    
    this.setupEventListeners();
    this.setupPeriodicCheck();
  }

  setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleOnline();
    });
    
    window.addEventListener('offline', () => {
      this.handleOffline();
    });
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkConnection();
      }
    });
  }

  setupPeriodicCheck(): void {
    // Check connection every 30 seconds
    setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Try to fetch a small resource to verify connectivity
      await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      const wasOffline = !this.isOnline;
      this.isOnline = true;
      
      if (wasOffline) {
        this.handleOnline();
      }
      
      return true;
    } catch (_error) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      
      if (wasOnline) {
        this.handleOffline();
      }
      
      return false;
    }
  }

  handleOnline(): void {
    this.isOnline = true;
    this.showNotification('Back online!', 'success');
    this.processOfflineQueue();
    this.hideOfflineIndicator();
    this.enableInteractiveElements();
  }

  handleOffline(): void {
    this.isOnline = false;
    this.showNotification('You\'re offline. Some features may be limited.', 'warning');
    this.showOfflineIndicator();
    this.disableNonEssentialElements();
  }

  showNotification(message: string, type: string = 'info'): void {
    // Create or update notification element
    let notification = document.getElementById('offline-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'offline-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(notification);
    }
    
    // Set color based on type
    const colors: Record<string, string> = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (notification && notification.textContent === message) {
        notification.style.display = 'none';
      }
    }, 5000);
  }

  showOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: #ef4444;
        z-index: 10001;
        animation: pulse 2s infinite;
      `;
      
      // Add pulse animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(indicator);
    }
    
    indicator.style.display = 'block';
  }

  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  disableNonEssentialElements() {
    // Disable elements that require network connectivity
    const nonEssentialSelectors = [
      'button[data-requires-online="true"]',
      'form[data-requires-online="true"]',
      '.online-only'
    ];
    
    nonEssentialSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const interactiveElement = element as HTMLButtonElement | HTMLInputElement | HTMLFormElement;
        interactiveElement.disabled = true;
        interactiveElement.style.opacity = '0.5';
        interactiveElement.title = 'This feature requires an internet connection';
      });
    });
  }

  enableInteractiveElements() {
    // Re-enable all disabled elements
    const disabledElements = document.querySelectorAll('[disabled]');
    disabledElements.forEach(element => {
      const interactiveElement = element as HTMLButtonElement | HTMLInputElement | HTMLFormElement;
      if (element.hasAttribute('data-requires-online')) {
        interactiveElement.disabled = false;
        interactiveElement.style.opacity = '1';
        interactiveElement.title = '';
      }
    });
  }

  // Loading state management
  setLoadingState(key: string, isLoading: boolean, message: string = ''): void {
    this.loadingStates.set(key, { isLoading, message, timestamp: Date.now() });
    
    // Update UI elements with loading state
    const elements = document.querySelectorAll(`[data-loading="${key}"]`);
    elements.forEach(element => {
      const interactiveElement = element as HTMLButtonElement | HTMLInputElement;
      if (isLoading) {
        interactiveElement.classList.add('loading');
        interactiveElement.disabled = true;
        
        // Add loading spinner if not present
        if (!element.querySelector('.loading-spinner')) {
          const spinner = document.createElement('div');
          spinner.className = 'loading-spinner';
          spinner.style.cssText = `
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
          `;
          
          // Add spin animation
          if (!document.querySelector('#spin-animation')) {
            const style = document.createElement('style');
            style.id = 'spin-animation';
            style.textContent = `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `;
            document.head.appendChild(style);
          }
          
          element.insertBefore(spinner, element.firstChild);
        }
        
        if (message) {
          element.setAttribute('data-loading-message', message);
        }
      } else {
        interactiveElement.classList.remove('loading');
        interactiveElement.disabled = false;
        
        const spinner = interactiveElement.querySelector('.loading-spinner');
        if (spinner) {
          spinner.remove();
        }
        
        interactiveElement.removeAttribute('data-loading-message');
      }
    });
  }

  isLoading(key: string): boolean {
    const state = this.loadingStates.get(key);
    return state?.isLoading || false;
  }

  // Offline queue management
  queueAction(action: Omit<QueuedAction, 'id' | 'timestamp'>): Promise<{ queued: boolean; id?: number }> {
    if (this.isOnline) {
      // Execute immediately if online
      this.executeAction({ ...action, id: Date.now() + Math.random(), timestamp: Date.now() });
      return Promise.resolve({ queued: false });
    }
    
    // Queue for when back online
    if (this.offlineQueue.length >= this.maxQueueSize) {
      // Remove oldest action if queue is full
      this.offlineQueue.shift();
    }
    
    const queuedAction = {
      ...action,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    };
    
    this.offlineQueue.push(queuedAction);
    this.showNotification('Action queued for when you\'re back online', 'info');
    
    return Promise.resolve({ queued: true, id: queuedAction.id });
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    this.showNotification(`Processing ${this.offlineQueue.length} queued actions...`, 'info');
    
    const actions = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const action of actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error('Failed to execute queued action:', error);
        // Re-queue failed actions
        this.offlineQueue.push(action);
      }
    }
  }

  async executeAction(action: QueuedAction): Promise<Record<string, unknown> | { retry: boolean; attempts: number }> {
    const { type, data, retryKey } = action;
    
    try {
      let result;
      
      switch (type) {
        case 'ADD_ITEM':
          result = await this.executeAddItem(data || {});
          break;
        case 'UPDATE_ITEM':
          result = await this.executeUpdateItem(data || {});
          break;
        case 'DELETE_ITEM':
          result = await this.executeDeleteItem(data || {});
          break;
        case 'SYNC_DATA':
          result = await this.executeSyncData({});
          break;
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
      
      // Clear retry attempts on success
      if (retryKey) {
        this.retryAttempts.delete(retryKey);
      }
      
      return result;
    } catch (error) {
      // Handle retry logic
      if (retryKey) {
        const attempts = this.retryAttempts.get(retryKey) || 0;
        if (attempts < this.maxRetries) {
          this.retryAttempts.set(retryKey, attempts + 1);
          this.offlineQueue.push(action); // Re-queue for retry
          return { retry: true, attempts: attempts + 1 };
        }
      }
      
      throw error;
    }
  }

  async executeAddItem(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation depends on your data management system
    if ((window as any).dataManager && (window as any).dataManager.addItem) {
      return await (window as any).dataManager.addItem(data);
    }
    throw new Error('Data manager not available');
  }

  async executeUpdateItem(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    if ((window as any).dataManager && (window as any).dataManager.updateItem) {
      return await (window as any).dataManager.updateItem(data);
    }
    throw new Error('Data manager not available');
  }

  async executeDeleteItem(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    if ((window as any).dataManager && (window as any).dataManager.deleteItem) {
      return await (window as any).dataManager.deleteItem(data);
    }
    throw new Error('Data manager not available');
  }

  async executeSyncData(_data: Record<string, unknown>): Promise<Record<string, unknown>> {
    if ((window as any).dataManager && (window as any).dataManager.sync) {
      return await (window as any).dataManager.sync();
    }
    throw new Error('Data manager not available');
  }

  // Public API
  getConnectionStatus(): {
    isOnline: boolean;
    loadingStates: Record<string, LoadingState>;
    queuedActions: number;
    retryAttempts: Record<string, number>;
  } {
    return {
      isOnline: this.isOnline,
      loadingStates: Object.fromEntries(this.loadingStates),
      queuedActions: this.offlineQueue.length,
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }

  clearQueue(): void {
    this.offlineQueue = [];
    this.retryAttempts.clear();
  }

  // Initialize
  init(): void {
    // Make globally available
    (window as any).offlineManager = this;
    
    // Initial connection check
    this.checkConnection();
    
    console.log('Offline manager initialized');
  }
}

// Export singleton instance
const offlineManager = new OfflineManager();

// Export convenience functions
export const setLoading = (key: string, isLoading: boolean, message?: string): void => 
  offlineManager.setLoadingState(key, isLoading, message);

export const queueAction = (action: Omit<QueuedAction, 'id' | 'timestamp'>): Promise<{ queued: boolean; id?: number }> => 
  offlineManager.queueAction(action);

export const getConnectionStatus = (): {
  isOnline: boolean;
  loadingStates: Record<string, LoadingState>;
  queuedActions: number;
  retryAttempts: Record<string, number>;
} => 
  offlineManager.getConnectionStatus();

export default offlineManager;
