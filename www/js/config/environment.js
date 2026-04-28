// @ts-check
/**
 * Environment Configuration
 * Centralized environment variable management for development and production
 */

class EnvironmentConfig {
  constructor() {
    this.isDevelopment = this.detectDevelopmentEnvironment();
    this.isProduction = !this.isDevelopment;
    this.config = this.loadConfig();
  }

  detectDevelopmentEnvironment() {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.hostname.includes('dev') ||
      window.location.hostname.includes('test') ||
      window.location.port !== ''
    );
  }

  loadConfig() {
    const baseConfig = {
      // Environment detection
      NODE_ENV: this.isDevelopment ? 'development' : 'production',
      IS_DEVELOPMENT: this.isDevelopment,
      IS_PRODUCTION: this.isProduction,
      
      // API Configuration
      API_BASE_URL: this.getApiBaseUrl(),
      CDN_BASE_URL: this.getCdnBaseUrl(),
      
      // AI Configuration
      AI_PROXY_URL: this.getAiProxyUrl(),
      AI_ENABLED: this.isAiEnabled(),
      
      // Feature Flags
      ENABLE_AI_FEATURES: this.getFeatureFlag('ENABLE_AI_FEATURES', true),
      ENABLE_ANALYTICS: this.getFeatureFlag('ENABLE_ANALYTICS', false),
      ENABLE_DEBUG_MODE: this.getFeatureFlag('ENABLE_DEBUG_MODE', this.isDevelopment),
      ENABLE_SERVICE_WORKER: this.getFeatureFlag('ENABLE_SERVICE_WORKER', this.isProduction),
      ENABLE_OFFLINE_SUPPORT: this.getFeatureFlag('ENABLE_OFFLINE_SUPPORT', this.isProduction),
      
      // Security
      CSP_CONFIG: this.getCspConfig(),
      
      // Performance
      CACHE_TTL: this.getNumber('CACHE_TTL', this.isDevelopment ? 0 : 3600),
      
      // Development defaults
      DEV_SERVER_PORT: this.getNumber('DEV_SERVER_PORT', 8080),
      DEV_SERVER_HOST: this.getString('DEV_SERVER_HOST', 'localhost'),
    };

    return baseConfig;
  }

  getString(key, defaultValue = '') {
    return import.meta.env?.[key] || 
           window?.[key] || 
           defaultValue;
  }

  getNumber(key, defaultValue = 0) {
    const value = this.getString(key);
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  getBoolean(key, defaultValue = false) {
    const value = this.getString(key);
    return value === 'true' || value === '1';
  }

  getFeatureFlag(key, defaultValue = false) {
    return this.getBoolean(key, defaultValue);
  }

  getApiBaseUrl() {
    if (this.isDevelopment) {
      return this.getString('API_BASE_URL', `http://${window.location.hostname}:8080/api`);
    }
    return this.getString('API_BASE_URL', 'https://pantry-ai.com/api');
  }

  getCdnBaseUrl() {
    if (this.isDevelopment) {
      return this.getString('CDN_BASE_URL', '');
    }
    return this.getString('CDN_BASE_URL', 'https://cdn.pantry-ai.com');
  }

  getAiProxyUrl() {
    const proxyUrl = this.getString('VITE_AI_PROXY_URL');
    
    if (this.isDevelopment) {
      return proxyUrl || 'http://localhost:3001/ai';
    }
    
    return proxyUrl || '';
  }

  isAiEnabled() {
    const proxyUrl = this.getAiProxyUrl();
    return !!proxyUrl && proxyUrl !== 'http://localhost:3001/ai';
  }

  getCspConfig() {
    return {
      'default-src': this.getString('CSP_DEFAULT_SRC', "'self'"),
      'script-src': this.getString('CSP_SCRIPT_SRC', "'self' 'unsafe-inline'"),
      'style-src': this.getString('CSP_STYLE_SRC', "'self' 'unsafe-inline'"),
      'img-src': this.getString('CSP_IMG_SRC', "'self' data: https:"),
      'connect-src': this.getString('CSP_CONNECT_SRC', "'self'"),
      'font-src': this.getString('CSP_FONT_SRC', "'self' https://fonts.gstatic.com"),
      'frame-src': this.getString('CSP_FRAME_SRC', "'none'"),
    };
  }

  // Convenience getters
  get apiBaseUrl() { return this.config.API_BASE_URL; }
  get aiProxyUrl() { return this.config.AI_PROXY_URL; }
  get isAiEnabled() { return this.config.AI_ENABLED; }
  get enableDebugMode() { return this.config.ENABLE_DEBUG_MODE; }
  get enableServiceWorker() { return this.config.ENABLE_SERVICE_WORKER; }
  get cacheTtl() { return this.config.CACHE_TTL; }
}

// Export singleton instance
const environmentConfig = new EnvironmentConfig();

// Export individual properties for convenience
export const {
  NODE_ENV,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  API_BASE_URL,
  CDN_BASE_URL,
  AI_PROXY_URL,
  AI_ENABLED,
  ENABLE_AI_FEATURES,
  ENABLE_ANALYTICS,
  ENABLE_DEBUG_MODE,
  ENABLE_SERVICE_WORKER,
  ENABLE_OFFLINE_SUPPORT,
  CSP_CONFIG,
  CACHE_TTL,
  DEV_SERVER_PORT,
  DEV_SERVER_HOST
} = environmentConfig.config;

export default environmentConfig;
