/**
 * Logger utility for environment-based logging
 * Provides different log levels based on environment
 */

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = this.isDevelopmentEnvironment();
    this.isProduction = !this.isDevelopment;
  }

  private isDevelopmentEnvironment(): boolean {
    // Use environment configuration for consistent detection
    return (import.meta as any).env?.MODE === 'development' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '0.0.0.0' ||
           window.location.hostname.includes('dev') ||
           window.location.hostname.includes('test') ||
           window.location.port !== '';
  }

  log(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  error(...args: any[]): void {
    // Always log errors, even in production
    console.error(...args);
  }

  warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }
}

// Export a singleton instance
export const log = new Logger();
export default log;
