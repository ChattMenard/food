// @ts-check
/**
 * Error Tracking Module
 * Integrates with Sentry for error monitoring and reporting
 */

// Placeholder for Sentry integration
// In production, replace with actual Sentry SDK
export class ErrorTracking {
  enabled: boolean;
  dsn: string;
  environment: string;
  release: string;
  user: any;

  constructor() {
    this.enabled = false;
    this.dsn = '';
    this.environment = 'development';
    this.release = '';
    this.user = null;
  }

  /**
   * Initialize error tracking
   * @param {Object} config - Configuration object
   */
  init(config: any = {}): void {
    this.dsn = config.dsn || '';
    this.environment = config.environment || 'development';
    this.release = config.release || '1.0.0';
    this.enabled = !!this.dsn;

    if (this.enabled) {
      // Initialize Sentry here
      // Sentry.init({
      //     dsn: this.dsn,
      //     environment: this.environment,
      //     release: this.release
      // });

      this.setupGlobalHandlers();
      console.log('[ErrorTracking] Initialized');
    } else {
      console.log('[ErrorTracking] Disabled (no DSN provided)');
    }
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureException(event.error);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason);
    });
  }

  /**
   * Capture an exception
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  captureException(error: Error, context: any = {}): void {
    if (!this.enabled) {
      console.error('[ErrorTracking]', error, context);
      return;
    }

    // Sentry.captureException(error, {
    //     extra: context,
    //     user: this.user
    // });

    console.error('[ErrorTracking] Captured exception:', error, context);
  }

  /**
   * Capture a message
   * @param {string} message - Message
   * @param {string} level - Log level
   * @param {Object} context - Additional context
   */
  captureMessage(message: string, level: string = 'info', context: any = {}): void {
    if (!this.enabled) {
      console.log(`[ErrorTracking] [${level}]`, message, context);
      return;
    }

    // Sentry.captureMessage(message, {
    //     level,
    //     extra: context,
    //     user: this.user
    // });

    console.log(`[ErrorTracking] [${level}]`, message, context);
  }

  /**
   * Set user context
   * @param {Object} user - User object
   */
  setUser(user: any): void {
    this.user = user;

    // Sentry.setUser(user);
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.user = null;

    // Sentry.setUser(null);
  }

  /**
   * Add breadcrumb
   * @param {Object} breadcrumb - Breadcrumb object
   */
  addBreadcrumb(_breadcrumb: any): void {
    if (!this.enabled) return;

    // Sentry.addBreadcrumb({
    //     ...breadcrumb,
    //     timestamp: Date.now()
    // });
  }

  /**
   * Set tag
   * @param {string} key - Tag key
   * @param {string} value - Tag value
   */
  setTag(_key: string, _value: string): void {
    if (!this.enabled) return;

    // Sentry.setTag(key, value);
  }

  /**
   * Set context
   * @param {string} key - Context key
   * @param {Object} value - Context value
   */
  setContext(_key: string, _value: any): void {
    if (!this.enabled) return;

    // Sentry.setContext(key, value);
  }

  /**
   * Wrap a function with error tracking
   * @param {Function} fn - Function to wrap
   * @param {string} name - Function name for tracking
   * @returns {Function} Wrapped function
   */
  wrap(fn: Function, name: string = 'anonymous'): Function {
    return (...args: any[]) => {
      this.addBreadcrumb({
        category: 'function',
        message: `Called ${name}`,
        level: 'info',
      });

      try {
        return fn(...args);
      } catch (error) {
        this.captureException(error as Error, { function: name });
        throw error;
      }
    };
  }

  /**
   * Wrap an async function with error tracking
   * @param {Function} fn - Async function to wrap
   * @param {string} name - Function name for tracking
   * @returns {Function} Wrapped async function
   */
  wrapAsync(fn: Function, name: string = 'anonymous'): Function {
    return async (...args: any[]) => {
      this.addBreadcrumb({
        category: 'function',
        message: `Called ${name}`,
        level: 'info',
      });

      try {
        return await fn(...args);
      } catch (error) {
        this.captureException(error as Error, { function: name });
        throw error;
      }
    };
  }
}

// Global error tracking instance
let globalErrorTracking: ErrorTracking | null = null;

/**
 * Get or create the global error tracking instance
 * @returns {ErrorTracking}
 */
export function getErrorTracking() {
  if (!globalErrorTracking) {
    globalErrorTracking = new ErrorTracking();
  }
  return globalErrorTracking;
}

/**
 * Initialize error tracking
 * @param {Object} config - Configuration
 */
export function initErrorTracking(config: any): void {
  const tracker = getErrorTracking();
  tracker.init(config);
}
