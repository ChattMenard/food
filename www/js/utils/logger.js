/**
 * Logger utility for environment-based logging
 * Provides different log levels based on environment
 */

class Logger {
  constructor() {
    this.isDevelopment = this.isDevelopmentEnvironment();
    this.isProduction = !this.isDevelopment;
  }

  isDevelopmentEnvironment() {
    // Use environment configuration for consistent detection
    return import.meta.env?.MODE === 'development' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '0.0.0.0' ||
           window.location.hostname.includes('dev') ||
           window.location.hostname.includes('test') ||
           window.location.port !== '';
  }

  log(...args) {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  error(...args) {
    // Always log errors, even in production
    console.error(...args);
  }

  warn(...args) {
    // Always log warnings, even in production
    console.warn(...args);
  }

  info(...args) {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  debug(...args) {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  // Group operations
  group(label) {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  // Performance logging (always enabled for monitoring)
  time(label) {
    console.time(label);
  }

  timeEnd(label) {
    console.timeEnd(label);
  }

  // Table logging (development only)
  table(data) {
    if (this.isDevelopment) {
      console.table(data);
    }
  }
}

// Export singleton instance
const logger = new Logger();

// For backward compatibility, export individual methods
export const log = (...args) => logger.log(...args);
export const error = (...args) => logger.error(...args);
export const warn = (...args) => logger.warn(...args);
export const info = (...args) => logger.info(...args);
export const debug = (...args) => logger.debug(...args);
export const group = (label) => logger.group(label);
export const groupEnd = () => logger.groupEnd();
export const time = (label) => logger.time(label);
export const timeEnd = (label) => logger.timeEnd(label);
export const table = (data) => logger.table(data);

export default logger;
