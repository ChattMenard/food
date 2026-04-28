/**
 * Analytics Manager
 * Handles user analytics and behavior tracking
 */

class AnalyticsManager {
  constructor() {
    this.isProduction = this.detectProductionEnvironment();
    this.analyticsId = this.getAnalyticsId();
    this.isEnabled = this.analyticsId && this.isProduction;
    this.eventQueue = [];
    this.maxQueueSize = 100;
    this.sessionStartTime = Date.now();
    this.userId = this.getUserId();
    this.sessionId = this.getSessionId();
    
    this.setupAnalytics();
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

  getAnalyticsId() {
    return import.meta.env?.ANALYTICS_ID || 
           window?.ANALYTICS_ID || 
           '';
  }

  setupAnalytics() {
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

  initializeGoogleAnalytics() {
    // Load Google Analytics script
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.analyticsId}`;
      document.head.appendChild(script);
      
      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      
      window.gtag('js', new Date());
      window.gtag('config', this.analyticsId, {
        user_id: this.userId,
        session_id: this.sessionId,
        send_page_view: false // We'll handle page views manually
      });
    }
  }

  setupEventTracking() {
    // Track button clicks
    document.addEventListener('click', (event) => {
      const target = event.target.closest('button, [role="button"], .btn, [onclick]');
      if (target) {
        this.trackEvent('button_click', {
          element_id: target.id || '',
          element_text: target.textContent?.trim() || '',
          element_class: target.className || '',
          page: this.getCurrentPage()
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target;
      this.trackEvent('form_submit', {
        form_id: form.id || '',
        form_class: form.className || '',
        page: this.getCurrentPage()
      });
    });

    // Track link clicks
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      if (target) {
        this.trackEvent('link_click', {
          link_url: target.href || '',
          link_text: target.textContent?.trim() || '',
          external: target.hostname !== window.location.hostname,
          page: this.getCurrentPage()
        });
      }
    });
  }

  setupPageTracking() {
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

  setupPerformanceTracking() {
    // Track page load performance
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigationEntries = performance.getEntriesByType('navigation');
          if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0];
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

  setupBehaviorTracking() {
    // Track user engagement
    this.setupEngagementTracking();
    
    // Track feature usage
    this.setupFeatureTracking();
    
    // Track error interactions
    this.setupErrorTracking();
    
    // Track search behavior
    this.setupSearchTracking();
  }

  setupEngagementTracking() {
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
        session_duration: Math.round((Date.now() - this.sessionStartTime) / 1000)
      });
    });
  }

  setupFeatureTracking() {
    // Track ingredient additions
    this.trackFeatureUsage('add_ingredient', () => {
      return document.querySelector('#new-ingredient')?.value?.trim() || '';
    });
    
    // Track meal planning
    this.trackFeatureUsage('meal_planning', () => {
      const mealCount = document.querySelectorAll('#meal-plan .list-item').length;
      return { meal_count: mealCount };
    });
    
    // Track AI suggestions
    this.trackFeatureUsage('ai_suggestions', () => {
      const suggestionCount = document.querySelectorAll('.ai-suggestions .list-item').length;
      return { suggestion_count: suggestionCount };
    });
    
    // Track recipe viewing
    this.trackFeatureUsage('recipe_view', () => {
      const modalTitle = document.querySelector('#recipe-modal-title')?.textContent?.trim() || '';
      return { recipe_name: modalTitle };
    });
  }

  trackFeatureUsage(featureName, getData) {
    const originalMethod = window[`track${featureName.charAt(0).toUpperCase() + featureName.slice(1)}`];
    
    window[`track${featureName.charAt(0).toUpperCase() + featureName.slice(1)}`] = () => {
      const data = getData ? getData() : {};
      this.trackEvent(`feature_${featureName}`, {
        ...data,
        page: this.getCurrentPage()
      });
      
      if (originalMethod) {
        return originalMethod();
      }
    };
  }

  setupErrorTracking() {
    // Track error boundary interactions
    const originalErrorBoundary = window.errorBoundary;
    if (originalErrorBoundary) {
      const originalHandleError = originalErrorBoundary.handleError;
      originalErrorBoundary.handleError = (error, context, details) => {
        this.trackEvent('error_boundary_interaction', {
          error_type: error?.name || 'unknown',
          context: context || 'unknown',
          page: this.getCurrentPage()
        });
        
        return originalHandleError.call(originalErrorBoundary, error, context, details);
      };
    }
  }

  setupSearchTracking() {
    // Track search/filter usage
    const searchInputs = document.querySelectorAll('input[type="search"], [placeholder*="search"], [placeholder*="filter"]');
    searchInputs.forEach(input => {
      let searchTimeout;
      
      input.addEventListener('input', (event) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const searchTerm = event.target.value?.trim();
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

  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? Math.round(firstPaint.startTime) : 0;
  }

  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : 0;
  }

  getCurrentPage() {
    // Get current page/path for SPA
    const path = window.location.pathname;
    const hash = window.location.hash;
    return path + (hash || '');
  }

  // Public tracking methods
  trackEvent(eventName, parameters = {}) {
    if (!this.isEnabled) return;
    
    const event = {
      event_name: eventName,
      parameters: {
        ...parameters,
        timestamp: Date.now(),
        user_id: this.userId,
        session_id: this.sessionId
      }
    };
    
    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, parameters);
    }
    
    // Queue for custom analytics
    this.queueEvent(event);
  }

  trackPageView() {
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

  trackSessionStart() {
    this.trackEvent('session_start', {
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer || '',
      landing_page: window.location.href
    });
  }

  trackUserInteraction(action, target, details = {}) {
    this.trackEvent('user_interaction', {
      action,
      target_id: target.id || '',
      target_class: target.className || '',
      target_tag: target.tagName || '',
      ...details
    });
  }

  trackFeatureUsage(featureName, usageData = {}) {
    this.trackEvent('feature_usage', {
      feature: featureName,
      ...usageData
    });
  }

  trackConversion(conversionType, value = 0, currency = 'USD') {
    this.trackEvent('conversion', {
      conversion_type: conversionType,
      value,
      currency
    });
  }

  // Event queue management
  queueEvent(event) {
    this.eventQueue.push(event);
    
    // Keep queue size manageable
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift();
    }
    
    // Send events in batch
    this.sendBatchEvents();
  }

  async sendBatchEvents() {
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
      console.warn('Failed to send analytics events:', error);
    }
  }

  // User management
  getUserId() {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Public API
  enable() {
    this.isEnabled = true;
    this.setupAnalytics();
  }

  disable() {
    this.isEnabled = false;
  }

  getAnalyticsData() {
    return {
      is_enabled: this.isEnabled,
      user_id: this.userId,
      session_id: this.sessionId,
      session_start_time: this.sessionStartTime,
      queued_events: this.eventQueue.length
    };
  }

  // Initialize
  init() {
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
export const trackEvent = (eventName, parameters) => 
  analyticsManager.trackEvent(eventName, parameters);

export const trackPageView = () => 
  analyticsManager.trackPageView();

export const trackFeatureUsage = (featureName, data) => 
  analyticsManager.trackFeatureUsage(featureName, data);

export const trackConversion = (type, value, currency) => 
  analyticsManager.trackConversion(type, value, currency);

export default analyticsManager;
