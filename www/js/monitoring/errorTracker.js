// @ts-check
/**
 * Error Tracking and Monitoring System
 * Handles error collection, reporting, and monitoring
 */

class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Maximum errors to keep in memory
    this.isProduction = this.detectProductionEnvironment();
    this.sentryDsn = this.getSentryDsn();
    this.analyticsId = this.getAnalyticsId();
    
    // Setup error handlers
    this.setupErrorHandlers();
  }

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

  getSentryDsn() {
    return import.meta.env?.SENTRY_DSN || 
           window?.SENTRY_DSN || 
           '';
  }

  getAnalyticsId() {
    return import.meta.env?.ANALYTICS_ID || 
           window?.ANALYTICS_ID || 
           '';
  }

  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
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
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        reason: event.reason
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          type: 'resource',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          source: event.target.src || event.target.href
        });
      }
    }, true);
  }

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

  storeError(error) {
    this.errors.push(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.errors));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  reportError(error) {
    // Report to Sentry if configured
    if (this.sentryDsn && window.Sentry) {
      try {
        window.Sentry.captureException(error);
      } catch (e) {
        console.warn('Failed to report error to Sentry:', e);
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
      } catch (e) {
        console.warn('Failed to report error to analytics:', e);
      }
    }

    // Custom error reporting endpoint
    this.reportToCustomEndpoint(error);
  }

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

  getUserId() {
    // Get user ID from storage or generate one
    let userId = localStorage.getItem('user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('user_id', userId);
    }
    return userId;
  }

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
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      recent: this.errors.slice(-10),
      last24h: this.errors.filter(error => {
        const errorTime = new Date(error.timestamp);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return errorTime > dayAgo;
      })
    };

    // Count errors by type
    this.errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }

  // Clear error logs
  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('error_logs');
    } catch (e) {
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
    } catch (e) {
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
      const errorTime = new Date(error.timestamp);
      return errorTime > weekAgo;
    });

    // Update localStorage
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.errors));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Manual error reporting
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
export const reportError = (message, type, details) => 
  errorTracker.reportCustomError(message, type, details);

export const getErrorStats = () => errorTracker.getErrorStats();

export const clearErrors = () => errorTracker.clearErrors();

export const exportErrors = () => errorTracker.exportErrors();

export default errorTracker;
