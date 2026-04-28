// @ts-check
/**
 * Error Tracking and Monitoring System
 * Handles error collection, reporting, and monitoring
 */

/**
 * @typedef {Object} BaseErrorPayload
 * @property {string} type
 * @property {string} [message]
 * @property {string} [filename]
 * @property {number} [lineno]
 * @property {number} [colno]
 * @property {string} [stack]
 * @property {string} [element]
 * @property {string} [source]
 * @property {any} [reason]
 * @property {Record<string, unknown>} [details]
 * @property {boolean} [manual]
 */

/**
 * @typedef {BaseErrorPayload & {
 *   timestamp?: string;
 *   userAgent?: string;
 *   url?: string;
 *   userId?: string;
 *   sessionId?: string;
 *   environment?: string;
 * }} TrackedError
 */

class ErrorTracker {
  constructor() {
    /** @type {TrackedError[]} */
    this.errors = [];
    /** @type {number} */
    this.maxErrors = 100; // Maximum errors to keep in memory
    /** @type {boolean} */
    this.isProduction = this.detectProductionEnvironment();
    /** @type {string} */
    this.sentryDsn = this.getSentryDsn();
    /** @type {string} */
    this.analyticsId = this.getAnalyticsId();
    
    // Setup error handlers
    this.setupErrorHandlers();
  }

  /**
   * @returns {boolean}
   */
  detectProductionEnvironment() {
    return (
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      window.location.hostname !== '0.0.0.0' &&
      !window.location.hostname.includes('dev') &&
      !window.location.hostname.includes('test') &&
      window.location.port === ''
    );
  }

  /**
   * @returns {string}
   */
  getSentryDsn() {
    return import.meta.env?.SENTRY_DSN ||
           window?.SENTRY_DSN ||
           '';
  }

  /**
   * @returns {string}
   */
  getAnalyticsId() {
    return import.meta.env?.ANALYTICS_ID ||
           window?.ANALYTICS_ID ||
           '';
  }

  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', /** @param {ErrorEvent} event */ (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', /** @param {PromiseRejectionEvent} event */ (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        reason: event.reason
      });
    });

    // Resource loading errors
    window.addEventListener('error', /** @param {Event} event */ (event) => {
      const target = event.target;
      if (!target || target === window) {
        return;
      }

      const element = target instanceof HTMLElement ? target.tagName : undefined;
      let source = '';

      if ('src' in target && typeof target.src === 'string') {
        source = target.src;
      } else if ('href' in target && typeof target.href === 'string') {
        source = target.href;
      }

      if (source) {
        this.handleError({
          type: 'resource',
          message: `Failed to load resource: ${source}`,
          element,
          source
        });
      }
    }, true);
  }

  /**
   * @param {BaseErrorPayload} error
   */
  handleError(error) {
    // Add timestamp and user context
    const enrichedError = {
      ...error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      environment: this.isProduction ? 'production' : 'development'
    };

    // Store error locally
    this.storeError(enrichedError);

    // Report to external services
    if (this.isProduction) {
      this.reportError(enrichedError);
    }

    // Log to console in development
    if (!this.isProduction) {
      console.error('Error tracked:', enrichedError);
    }
  }

  /**
   * @param {TrackedError} error
   */
  storeError(error) {
    this.errors.push(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.errors));
    } catch (_error) {
      // Ignore localStorage errors
    }
  }

  /**
   * @param {TrackedError} error
   */
  reportError(error) {
    // Report to Sentry if configured
    if (this.sentryDsn && window.Sentry) {
      try {
        window.Sentry.captureException(error);
      } catch (_error) {
        console.warn('Failed to report error to Sentry:', _error);
      }
    }

    // Report to analytics if configured
    if (this.analyticsId && window.gtag) {
      try {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          custom_map: {
            error_type: error.type,
            error_url: error.url
          }
        });
      } catch (_error) {
        console.warn('Failed to report error to analytics:', _error);
      }
    }

    // Custom error reporting endpoint
    this.reportToCustomEndpoint(error);
  }

  /**
   * @param {TrackedError} error
   */
  reportToCustomEndpoint(error) {
    // Send to custom error reporting endpoint
    const endpoint = '/api/errors';
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(error)
    }).catch(() => {
      // Ignore network errors for error reporting
    });
  }

  /**
   * @returns {string}
   */
  getUserId() {
    // Get user ID from storage or generate one
    let userId = localStorage.getItem('user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('user_id', userId);
    }
    return userId;
  }

  /**
   * @returns {string}
   */
  getSessionId() {
    // Get session ID from sessionStorage or generate one
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  // Get error statistics
  /**
   * @returns {{ total: number; byType: Record<string, number>; recent: TrackedError[]; last24h: TrackedError[] }}
   */
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: /** @type {Record<string, number>} */ ({}),
      recent: this.errors.slice(-10),
      last24h: this.errors.filter((error) => {
        if (!error.timestamp) {
          return false;
        }
        const errorTime = new Date(error.timestamp);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return errorTime > dayAgo;
      })
    };

    // Count errors by type
    this.errors.forEach((error) => {
      const typeKey = error.type || 'unknown';
      stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;
    });

    return stats;
  }

  // Clear error logs
  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('error_logs');
    } catch (_error) {
      // Ignore localStorage errors
    }
  }

  // Export error logs for debugging
  exportErrors() {
    const exportData = {
      timestamp: new Date().toISOString(),
      environment: this.isProduction ? 'production' : 'development',
      stats: this.getErrorStats(),
      errors: this.errors
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Initialize error tracking
  init() {
    // Load existing errors from localStorage
    try {
      const stored = localStorage.getItem('error_logs');
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch (_error) {
      // Ignore localStorage errors
    }

    // Setup periodic cleanup
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000); // Clean up every hour

    console.log('Error tracking initialized');
  }

  cleanupOldErrors() {
    // Remove errors older than 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.errors = this.errors.filter(error => {
      if (!error.timestamp) {
        return false;
      }
      const errorTime = new Date(error.timestamp);
      return errorTime > weekAgo;
    });

    // Update localStorage
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.errors));
    } catch (_error) {
      // Ignore localStorage errors
    }
  }

  // Manual error reporting
  /**
   * @param {string} message
   * @param {string} [type]
   * @param {Record<string, unknown>} [details]
   */
  reportCustomError(message, type = 'custom', details = {}) {
    this.handleError({
      type,
      message,
      details,
      manual: true
    });
  }
}

// Export singleton instance
const errorTracker = new ErrorTracker();

// Export convenience functions
/**
 * @param {string} message
 * @param {string} type
 * @param {Record<string, unknown>} details
 */
export const reportError = (message, type, details) =>
  errorTracker.reportCustomError(message, type, details);

export const getErrorStats = () => errorTracker.getErrorStats();

export const clearErrors = () => errorTracker.clearErrors();

export const exportErrors = () => errorTracker.exportErrors();

export default errorTracker;
