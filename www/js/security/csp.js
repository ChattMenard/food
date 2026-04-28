/**
 * Content Security Policy Manager
 * Handles CSP header implementation and management
 */

class CSPManager {
  constructor() {
    this.cspConfig = this.getCSPConfig();
    this.isProduction = this.detectProductionEnvironment();
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

  getCSPConfig() {
    // Get CSP configuration from environment or use defaults
    const envConfig = window.CSP_CONFIG || {};
    
    return {
      'default-src': envConfig['default-src'] || "'self'",
      'script-src': envConfig['script-src'] || "'self' 'unsafe-inline'",
      'style-src': envConfig['style-src'] || "'self' 'unsafe-inline'",
      'img-src': envConfig['img-src'] || "'self' data: https:",
      'connect-src': envConfig['connect-src'] || "'self'",
      'font-src': envConfig['font-src'] || "'self' https://fonts.gstatic.com",
      'frame-src': envConfig['frame-src'] || "'none'",
      'object-src': envConfig['object-src'] || "'none'",
      'media-src': envConfig['media-src'] || "'self'",
      'manifest-src': envConfig['manifest-src'] || "'self'",
      'worker-src': envConfig['worker-src'] || "'self'",
      'child-src': envConfig['child-src'] || "'none'",
      'form-action': envConfig['form-action'] || "'self'",
      'frame-ancestors': envConfig['frame-ancestors'] || "'none'",
      'base-uri': envConfig['base-uri'] || "'self'",
      'upgrade-insecure-requests': envConfig['upgrade-insecure-requests'] || ''
    };
  }

  generateCSPHeader() {
    const directives = [];
    
    for (const [directive, value] of Object.entries(this.cspConfig)) {
      if (value && value !== "'none'" && value !== '') {
        directives.push(`${directive} ${value}`);
      }
    }
    
    return directives.join('; ');
  }

  applyCSPMetaTag() {
    if (!this.isProduction) {
      console.log('CSP: Skipping CSP in development environment');
      return;
    }

    // Remove existing CSP meta tags
    this.removeExistingCSPTags();
    
    // Create and add new CSP meta tag
    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'Content-Security-Policy';
    metaTag.content = this.generateCSPHeader();
    
    // Add to head
    const head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
      head.appendChild(metaTag);
      console.log('CSP: Content Security Policy applied');
    }
  }

  removeExistingCSPTags() {
    const existingTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    existingTags.forEach(tag => tag.remove());
  }

  validateCSP() {
    const violations = [];
    
    // Check for potential CSP violations
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src && !this.isAllowedByCSP('script-src', script.src)) {
        violations.push(`Script not allowed by CSP: ${script.src}`);
      }
    });
    
    const styles = document.querySelectorAll('link[rel="stylesheet"]');
    styles.forEach(style => {
      if (style.href && !this.isAllowedByCSP('style-src', style.href)) {
        violations.push(`Stylesheet not allowed by CSP: ${style.href}`);
      }
    });
    
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !this.isAllowedByCSP('img-src', img.src)) {
        violations.push(`Image not allowed by CSP: ${img.src}`);
      }
    });
    
    return violations;
  }

  isAllowedByCSP(directive, url) {
    const policy = this.cspConfig[directive];
    if (!policy) return false;
    
    // Check for 'self'
    if (policy.includes("'self'")) {
      const origin = window.location.origin;
      if (url.startsWith(origin)) return true;
    }
    
    // Check for data URLs
    if (policy.includes('data:') && url.startsWith('data:')) {
      return true;
    }
    
    // Check for https
    if (policy.includes('https:') && url.startsWith('https:')) {
      return true;
    }
    
    // Check for specific domains
    const domains = policy.match(/https:\/\/[^'\s]+/g) || [];
    for (const domain of domains) {
      if (url.startsWith(domain)) {
        return true;
      }
    }
    
    return false;
  }

  // Monitor for CSP violations
  setupCSPViolationReporting() {
    if (!window.ReportingObserver) return;
    
    const observer = new ReportingObserver((reports) => {
      reports.forEach(report => {
        console.warn('CSP Violation:', report.body);
        // You could send this to an error tracking service
      });
    }, { types: ['csp-violation'] });
    
    observer.observe();
  }

  // Initialize CSP
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.applyCSPMetaTag();
        this.setupCSPViolationReporting();
      });
    } else {
      this.applyCSPMetaTag();
      this.setupCSPViolationReporting();
    }
  }
}

// Export singleton instance
const cspManager = new CSPManager();

// Export convenience functions
export const applyCSP = () => cspManager.applyCSPMetaTag();
export const validateCSP = () => cspManager.validateCSP();
export const getCSPHeader = () => cspManager.generateCSPHeader();

export default cspManager;
