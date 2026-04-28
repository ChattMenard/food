// @ts-check
/**
 * Analytics Manager
 * Handles user analytics and behavior tracking
 */

type AnalyticsEventParameters = Record<string, string | number | boolean | null | undefined | Record<string, unknown>>;

class AnalyticsManager {
  isProduction: boolean;
  analyticsId: string;
  isEnabled: boolean;
  eventQueue: AnalyticsEventParameters[];
  maxQueueSize: number;
  sessionStartTime: number;
  userId: string;
  sessionId: string;

  constructor() {
    this.isProduction = this.detectProductionEnvironment();
    this.analyticsId = this.getAnalyticsId();
    this.isEnabled = Boolean(this.analyticsId && this.isProduction);
    this.eventQueue = [];
    this.maxQueueSize = 100;
    this.sessionStartTime = Date.now();
    this.userId = this.getUserId();
    this.sessionId = this.getSessionId();
    
    this.setupAnalytics();
  }

  detectProductionEnvironment(): boolean {
    return (
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      window.location.hostname !== '0.0.0.0' &&
      !window.location.hostname.includes('dev') &&
      !window.location.hostname.includes('test') &&
      window.location.port === ''
    );
  }

  getAnalyticsId(): string {
    return (import.meta as any).env?.ANALYTICS_ID || 
           window?.ANALYTICS_ID || 
           '';
  }

  setupAnalytics(): void {
    if (!this.isEnabled) {
      console.log('Analytics disabled - not in production or no analytics ID');
      return;
    }

    // Initialize Google Analytics if available
    this.initializeGoogleAnalytics();
    
    // Setup event tracking
    this.setupEventTracking();
    
    // Setup page tracking
    this.setupPageTracking();
    
    // Setup performance tracking
    this.setupPerformanceTracking();
    
    // Setup user behavior tracking
    this.setupBehaviorTracking();
    
    // Start session
    this.trackSessionStart();
  }

  initializeGoogleAnalytics(): void {
    // Load Google Analytics script
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.analyticsId}`;
      document.head.appendChild(script);
      
      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        (window.dataLayer as any[]).push(arguments);
      };
      
      window.gtag('js', new Date());
      window.gtag('config', this.analyticsId, {
        user_id: this.userId,
        session_id: this.sessionId,
        send_page_view: false // We'll handle page views manually
      });
    }
  }

  setupPageTracking(): void {
    // Track initial page view
    this.trackPageView();
    
    // Track hash changes (SPA navigation)
    window.addEventListener('hashchange', () => {
      this.trackPageView();
    });
    
    // Track popstate (browser navigation)
    window.addEventListener('popstate', () => {
      this.trackPageView();
    });
  }

  setupPerformanceTracking(): void {
    // Track page load performance
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigationEntries = performance.getEntriesByType('navigation');
          if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
            this.trackEvent('page_performance', {
              load_time: Math.round(navEntry.loadEventEnd - navEntry.loadEventStart),
              dom_content_loaded: Math.round(navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart),
              first_paint: this.getFirstPaint(),
              first_contentful_paint: this.getFirstContentfulPaint(),
              page: this.getCurrentPage()
            });
          }
        }, 0);
      });
    }
  }

  setupBehaviorTracking(): void {
    // Track user engagement
    this.setupEngagementTracking();
    
    // Track error interactions
    this.setupErrorTracking();
    
    // Track search behavior
    this.setupSearchTracking();
  }

  setupEngagementTracking(): void {
    let lastActivity = Date.now();
    let totalTime = 0;
    let engagementInterval;
    
    const updateActivity = () => {
      lastActivity = Date.now();
    };
    
    // Track user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity);
    });
    
    // Calculate engagement time
    engagementInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity < 30000) { // Active within 30 seconds
        totalTime += 30000; // Add 30 seconds
      }
    }, 30000);
    
    // Track session end
    window.addEventListener('beforeunload', () => {
      clearInterval(engagementInterval);
      this.trackEvent('session_engagement', {
        total_time: Math.round(totalTime / 1000), // in seconds
        session_duration: Math.round((Date.now() - this.sessionStartTime) / 1000),
      });
    });
  }

  setupEventTracking(): void {
    // Track button clicks
    document.addEventListener('click', (event) => {
      const target = (event.target as Element | null)?.closest(
        'button, [role="button"], .btn, [onclick]'
      );
      if (!target) return;

      this.trackEvent('button_click', {
        element_id: target.id || '',
        element_text: target.textContent?.trim() || '',
        element_class: (target as HTMLElement).className || '',
        page: this.getCurrentPage(),
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackEvent('form_submit', {
        form_id: form?.id || '',
        form_class: form?.className || '',
        page: this.getCurrentPage(),
      });
    });

    // Track link clicks
    document.addEventListener('click', (event) => {
      const link = (event.target as Element | null)?.closest('a');
      if (!link) return;

      this.trackEvent('link_click', {
        link_url: (link as HTMLAnchorElement).href || '',
        link_text: link.textContent?.trim() || '',
        external: (link as HTMLAnchorElement).hostname !== window.location.hostname,
        page: this.getCurrentPage(),
      });
    });
  }

  setupErrorTracking(): void {
    const originalErrorBoundary = (window as any).errorBoundary;
    if (originalErrorBoundary && typeof originalErrorBoundary.handleError === 'function') {
      const originalHandleError = originalErrorBoundary.handleError;
      originalErrorBoundary.handleError = (error: Error, context: string, details: AnalyticsEventParameters) => {
        this.trackEvent('error_boundary_interaction', {
          error_type: error?.name || 'unknown',
          context: context || 'unknown',
          page: this.getCurrentPage(),
        });

        return originalHandleError.call(originalErrorBoundary, error, context, details);
      };
    }
  }

  setupSearchTracking(): void {
    // Track search/filter usage
    const searchInputs = document.querySelectorAll('input[type="search"], [placeholder*="search"], [placeholder*="filter"]');
    searchInputs.forEach(input => {
      let searchTimeout: number | undefined;
      
      input.addEventListener('input', (event: Event) => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          const target = event.target as HTMLInputElement;
          const searchTerm = target.value?.trim();
          if (searchTerm && searchTerm.length > 2) {
            this.trackEvent('search', {
              search_term: searchTerm,
              input_id: input.id || '',
              page: this.getCurrentPage()
            });
          }
        }, 1000); // Wait 1 second after typing stops
      });
    });
  }

  getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? Math.round(firstPaint.startTime) : 0;
  }

  getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : 0;
  }

  getCurrentPage(): string {
    // Get current page/path for SPA
    const path = window.location.pathname;
    const hash = window.location.hash;
    return path + (hash || '');
  }

  // Public tracking methods
  trackEvent(eventName: string, parameters: AnalyticsEventParameters = {}): void {
    if (!this.isEnabled) return;
    
    const event: AnalyticsEventParameters = {
      ...parameters,
      timestamp: Date.now(),
      user_id: this.userId,
      session_id: this.sessionId
    };
    
    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, parameters);
    }
    
    // Queue for custom analytics
    this.queueEvent(event);
  }

  trackPageView(): void {
    if (!this.isEnabled) return;
    
    const pageData = {
      page_location: window.location.href,
      page_path: this.getCurrentPage(),
      page_title: document.title
    };
    
    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('config', this.analyticsId, {
        page_path: pageData.page_path,
        page_title: pageData.page_title
      });
    }
    
    // Custom page tracking
    this.trackEvent('page_view', pageData);
  }

  trackSessionStart(): void {
    this.trackEvent('session_start', {
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer || '',
      landing_page: window.location.href
    });
  }

  trackUserInteraction(
    action: string,
    target: Element,
    details: AnalyticsEventParameters = {}
  ): void {
    this.trackEvent('user_interaction', {
      action,
      target_id: target.id || '',
      target_class: target.className || '',
      target_tag: target.tagName || '',
      ...details
    });
  }

  trackFeatureUsage(featureName: string, usageData: AnalyticsEventParameters = {}): void {
    this.trackEvent('feature_usage', {
      feature: featureName,
      ...usageData
    });
  }

  trackConversion(conversionType: string, value = 0, currency = 'USD'): void {
    this.trackEvent('conversion', {
      conversion_type: conversionType,
      value,
      currency
    });
  }

  // Event queue management
  queueEvent(event: AnalyticsEventParameters): void {
    this.eventQueue.push(event);
    
    // Keep queue size manageable
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift();
    }
    
    // Send events in batch
    this.sendBatchEvents();
  }

  async sendBatchEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // Send to custom analytics endpoint
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: eventsToSend,
          user_id: this.userId,
          session_id: this.sessionId
        })
      });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToSend);
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Failed to send analytics events:', message);
    }
  }

  // User management
  getUserId(): string {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Public API
  enable(): void {
    this.isEnabled = true;
    this.setupAnalytics();
  }

  disable(): void {
    this.isEnabled = false;
  }

  getAnalyticsData(): {
    is_enabled: boolean;
    user_id: string;
    session_id: string;
    session_start_time: number;
    queued_events: number;
  } {
    return {
      is_enabled: this.isEnabled,
      user_id: this.userId,
      session_id: this.sessionId,
      session_start_time: this.sessionStartTime,
      queued_events: this.eventQueue.length
    };
  }

  // Initialize
  init(): void {
    // Make globally available
    window.analyticsManager = this;
    
    console.log('Analytics manager initialized', {
      enabled: this.isEnabled,
      production: this.isProduction
    });
  }
}

// Export singleton instance
const analyticsManager = new AnalyticsManager();

// Export convenience functions
export const trackEvent = (
  eventName: string,
  parameters: AnalyticsEventParameters = {}
): void => analyticsManager.trackEvent(eventName, parameters);

export const trackPageView = (): void => analyticsManager.trackPageView();

export const trackFeatureUsage = (
  featureName: string,
  data: AnalyticsEventParameters = {}
): void => analyticsManager.trackFeatureUsage(featureName, data);

export const trackConversion = (
  type: string,
  value: number,
  currency: string
): void => analyticsManager.trackConversion(type, value, currency);

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    ANALYTICS_ID?: string;
    analyticsManager?: AnalyticsManager;
  }
}

export default analyticsManager;
