import DOMPurify from 'dompurify';

/**
 * HTML Sanitization Utility
 * Provides safe HTML rendering with XSS protection
 */

class Sanitizer {
  constructor() {
    // Default configuration for safe HTML
    this.defaultConfig = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'i', 'b',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'span', 'div',
        'a'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'class', 'id'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    };
  }

  /**
   * Sanitize HTML string to prevent XSS attacks
   * @param {string} dirty - Unsafe HTML string
   * @param {Object} config - Optional sanitization config
   * @returns {string} - Safe HTML string
   */
  sanitize(dirty, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return DOMPurify.sanitize(dirty, finalConfig);
  }

  /**
   * Sanitize text content (HTML tags stripped)
   * @param {string} dirty - Unsafe string
   * @returns {string} - Safe text content
   */
  sanitizeText(dirty) {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
  }

  /**
   * Create safe HTML element from string
   * @param {string} html - HTML string
   * @param {string} tagName - Target element tag
   * @returns {HTMLElement} - Safe DOM element
   */
  createElement(html, tagName = 'div') {
    const sanitized = this.sanitize(html);
    const element = document.createElement(tagName);
    element.innerHTML = sanitized;
    return element;
  }

  /**
   * Check if string contains potentially dangerous content
   * @param {string} input - Input string to check
   * @returns {boolean} - True if dangerous content detected
   */
  isDangerous(input) {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i,
      /<input/i,
      /<button/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize user input for display
   * @param {string} input - User input
   * @param {boolean} allowHtml - Whether to allow HTML tags
   * @returns {string} - Safe output
   */
  sanitizeUserInput(input, allowHtml = false) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    if (allowHtml) {
      return this.sanitize(input);
    } else {
      return this.sanitizeText(input);
    }
  }

  /**
   * Sanitize URL for safe use in href attributes
   * @param {string} url - URL to sanitize
   * @returns {string} - Safe URL
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return '#';
    }

    // Basic URL validation
    try {
      const parsed = new URL(url, window.location.origin);
      
      // Only allow safe protocols
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return '#';
      }

      return parsed.href;
    } catch {
      return '#';
    }
  }
}

// Export singleton instance
const sanitizer = new Sanitizer();

// Export convenience functions
export const sanitize = (dirty, config) => sanitizer.sanitize(dirty, config);
export const sanitizeText = (dirty) => sanitizer.sanitizeText(dirty);
export const createElement = (html, tagName) => sanitizer.createElement(html, tagName);
export const isDangerous = (input) => sanitizer.isDangerous(input);
export const sanitizeUserInput = (input, allowHtml) => sanitizer.sanitizeUserInput(input, allowHtml);
export const sanitizeUrl = (url) => sanitizer.sanitizeUrl(url);

export default sanitizer;
