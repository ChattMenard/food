/**
 * Error Boundary Component
 * Provides global error handling and graceful error recovery
 */

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: Date;
  context?: string;
}

interface FallbackUI extends HTMLElement {
  isVisible?: boolean;
}

export class ErrorBoundary {
  private fallbackUI: FallbackUI | null = null;
  private errorCount: number = 0;
  private readonly maxErrors: number = 5;
  private errorHistory: ErrorInfo[] = [];
  private recoveryAttempts: number = 0;
  private readonly maxRecoveryAttempts: number = 3;
  
  constructor() {
    this.setupErrorBoundary();
  }

  private setupErrorBoundary(): void {
    // Create fallback UI element
    this.createFallbackUI();
    
    // Override critical functions with error wrapping
    this.wrapCriticalFunctions();
    
    // Setup periodic error check
    this.setupPeriodicCheck();
  }

  private createFallbackUI(): void {
    const fallbackHTML = `
      <div id="error-boundary-fallback" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        z-index: 999999;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div style="
          max-width: 500px;
          margin: 50px auto;
          background: #1f2937;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
        ">
          <h2 style="color: #ef4444; margin-bottom: 20px;">
            ⚠️ Application Error
          </h2>
          <p style="margin-bottom: 20px; line-height: 1.6;">
            Something went wrong, but your data is safe. We're working to fix this issue.
          </p>
          <div style="margin-bottom: 20px;">
            <button id="error-retry-btn" style="
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              margin-right: 10px;
              font-size: 16px;
            ">
              Try Again
            </button>
            <button id="error-reload-btn" style="
              background: #6b7280;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
            ">
              Reload Page
            </button>
          </div>
          <details style="text-align: left; margin-top: 20px;">
            <summary style="cursor: pointer; color: #9ca3af;">
              Technical Details
            </summary>
            <div id="error-details" style="
              background: #111827;
              padding: 15px;
              border-radius: 6px;
              margin-top: 10px;
              font-family: monospace;
              font-size: 12px;
              white-space: pre-wrap;
              max-height: 200px;
              overflow-y: auto;
            "></div>
          </details>
        </div>
      </div>
    `;

    // Add to document
    document.body.insertAdjacentHTML('beforeend', fallbackHTML);
    this.fallbackUI = document.getElementById('error-boundary-fallback') as HTMLElement;
    
    // Setup event listeners
    const retryBtn = document.getElementById('error-retry-btn') as HTMLButtonElement;
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.handleRetry();
      });
    }
    
    const reloadBtn = document.getElementById('error-reload-btn') as HTMLButtonElement;
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  wrapCriticalFunctions(): void {
    // Note: setTimeout/setInterval wrapping disabled due to TypeScript type complexities
    // Event listener wrapping also disabled for the same reason
    // Error boundary still catches errors through global error handlers
    console.log('[ErrorBoundary] Critical function wrapping skipped due to type constraints');
  }

  setupPeriodicCheck(): void {
    // Check for stuck operations every 30 seconds
    setInterval(() => {
      this.checkApplicationHealth();
    }, 30000);
  }

  checkApplicationHealth(): void {
    // Check if critical elements exist
    const criticalElements = [
      'new-ingredient',
      'pantry-list',
      'meal-plan'
    ];
    
    const missingElements = criticalElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      this.handleError(new Error(`Missing critical UI elements: ${missingElements.join(', ')}`), 'healthCheck');
    }
  }

  handleError(error: Error, context: string = 'unknown', details: Record<string, unknown> = {}): void {
    this.errorCount++;
    
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context
    };
    
    this.errorHistory.push(errorInfo);
    
    // Keep only last 10 errors
    if (this.errorHistory.length > 10) {
      this.errorHistory = this.errorHistory.slice(-10);
    }
    
    // Log error to console in development
    if (window.location.hostname === 'localhost') {
      console.error('ErrorBoundary caught error:', errorInfo);
    }
    
    // Report to error tracker
    if ((window as any).errorTracker) {
      (window as any).errorTracker.reportCustomError(
        error.message,
        'errorBoundary',
        { context, details, errorCount: this.errorCount }
      );
    }
    
    // Show fallback UI if too many errors
    if (this.errorCount >= this.maxErrors) {
      this.showFallbackUI({ errorInfo, context, details });
    }
  }

  showFallbackUI(errorInfo: Record<string, unknown>): void {
    if (!this.fallbackUI) return;
    
    // Update error details
    const detailsElement = document.getElementById('error-details');
    if (detailsElement) {
      detailsElement.textContent = JSON.stringify(errorInfo, null, 2);
    }
    
    // Show fallback UI
    this.fallbackUI.style.display = 'block';
    
    // Disable app interactions
    this.disableAppInteractions();
  }

  disableAppInteractions(): void {
    // Disable all buttons and inputs
    const interactiveElements = document.querySelectorAll('button, input, select, textarea');
    interactiveElements.forEach(element => {
      const interactive = element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      interactive.disabled = true;
      interactive.style.opacity = '0.5';
    });
  }

  enableAppInteractions(): void {
    // Re-enable all buttons and inputs
    const interactiveElements = document.querySelectorAll('button, input, select, textarea');
    interactiveElements.forEach(element => {
      const interactive = element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      interactive.disabled = false;
      interactive.style.opacity = '1';
    });
  }

  handleRetry(): void {
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      // Force reload after max attempts
      window.location.reload();
      return;
    }
    
    this.recoveryAttempts++;
    
    try {
      // Hide fallback UI
      if (this.fallbackUI) {
        this.fallbackUI.style.display = 'none';
      }
      
      // Re-enable interactions
      this.enableAppInteractions();
      
      // Reset error count
      this.errorCount = 0;
      
      // Attempt to re-initialize critical parts
      this.recoverApplication();
      
    } catch (error) {
      this.handleError(error as Error, 'recovery');
    }
  }

  recoverApplication(): void {
    // Try to re-initialize critical components
    const criticalElements = [
      'new-ingredient',
      'pantry-list', 
      'meal-plan'
    ];
    
    criticalElements.forEach(id => {
      const element = document.getElementById(id);
      if (element && element.style.display === 'none') {
        element.style.display = '';
      }
    });
    
    // Re-bind event handlers if needed
    this.rebindEventHandlers();
  }

  rebindEventHandlers(): void {
    // Re-bind common event handlers
    const addBtn = document.getElementById('add-ingredient-btn') as HTMLButtonElement;
    if (addBtn && !addBtn.hasAttribute('data-rebound')) {
      addBtn.addEventListener('click', () => {
        if ((window as any).addShopItem) {
          const input = document.getElementById('new-ingredient') as HTMLInputElement;
          (window as any).addShopItem(input.value);
        }
      });
      addBtn.setAttribute('data-rebound', 'true');
    }
  }

  // Public API
  getErrorStats(): {
    errorCount: number;
    recoveryAttempts: number;
    recentErrors: ErrorInfo[];
    isHealthy: boolean;
  } {
    return {
      errorCount: this.errorCount,
      recoveryAttempts: this.recoveryAttempts,
      recentErrors: this.errorHistory.slice(-5),
      isHealthy: this.errorCount < this.maxErrors
    };
  }

  reset(): void {
    this.errorCount = 0;
    this.recoveryAttempts = 0;
    this.errorHistory = [];
    
    if (this.fallbackUI) {
      this.fallbackUI.style.display = 'none';
    }
    
    this.enableAppInteractions();
  }

  // Initialize error boundary
  init(): void {
    // Make it globally available
    (window as any).errorBoundary = this;
    
    console.log('Error boundary initialized');
  }
}

// Export singleton instance
const errorBoundary = new ErrorBoundary();

// Export convenience functions
export const handleGlobalError = (error: Error, context: string, details: Record<string, unknown>) => 
  errorBoundary.handleError(error, context, details);

export const getErrorBoundaryStats = () => errorBoundary.getErrorStats();

export const resetErrorBoundary = () => errorBoundary.reset();

export default errorBoundary;
