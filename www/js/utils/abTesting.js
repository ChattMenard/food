/**
 * A/B Testing Framework
 * Simple A/B testing implementation for feature flags and experiments
 */

export class ABTesting {
  constructor() {
    this.experiments = new Map();
    this.userVariants = new Map();
    this.userId = this.getUserId();
  }

  /**
   * Get user ID for consistent variant assignment
   * @returns {string} User ID
   */
  getUserId() {
    let userId = localStorage.getItem('ab-testing-user-id');

    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('ab-testing-user-id', userId);
    }

    return userId;
  }

  /**
   * Register an experiment
   * @param {string} name - Experiment name
   * @param {Array} variants - Variant options
   * @param {Object} config - Experiment configuration
   */
  registerExperiment(name, variants, config = {}) {
    this.experiments.set(name, {
      variants,
      weights: config.weights || variants.map(() => 1),
      enabled: config.enabled !== false,
      startDate: config.startDate,
      endDate: config.endDate,
    });
  }

  /**
   * Get variant for a user
   * @param {string} experimentName - Experiment name
   * @returns {string|null} Variant name
   */
  getVariant(experimentName) {
    const experiment = this.experiments.get(experimentName);

    if (!experiment || !experiment.enabled) {
      return null;
    }

    // Check date range
    if (experiment.startDate && new Date() < new Date(experiment.startDate)) {
      return null;
    }

    if (experiment.endDate && new Date() > new Date(experiment.endDate)) {
      return null;
    }

    // Return cached variant if exists
    if (this.userVariants.has(experimentName)) {
      return this.userVariants.get(experimentName);
    }

    // Assign variant based on user ID
    const variant = this.assignVariant(experimentName, experiment);
    this.userVariants.set(experimentName, variant);

    return variant;
  }

  /**
   * Assign variant to user
   * @param {string} experimentName - Experiment name
   * @param {Object} experiment - Experiment config
   * @returns {string} Assigned variant
   */
  assignVariant(experimentName, experiment) {
    const hash = this.hashString(this.userId + experimentName);
    const totalWeight = experiment.weights.reduce((a, b) => a + b, 0);
    let normalizedHash = hash % totalWeight;

    for (let i = 0; i < experiment.variants.length; i++) {
      normalizedHash -= experiment.weights[i];
      if (normalizedHash < 0) {
        return experiment.variants[i];
      }
    }

    return experiment.variants[0];
  }

  /**
   * Hash a string to a number
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Check if user is in variant
   * @param {string} experimentName - Experiment name
   * @param {string} variant - Variant name
   * @returns {boolean}
   */
  isInVariant(experimentName, variant) {
    return this.getVariant(experimentName) === variant;
  }

  /**
   * Track experiment exposure
   * @param {string} experimentName - Experiment name
   * @param {string} variant - Variant name
   */
  trackExposure(experimentName, variant) {
    // Send to analytics
    if (window.analytics) {
      window.analytics.track('experiment_exposure', {
        experiment: experimentName,
        variant,
      });
    }
  }

  /**
   * Track experiment conversion
   * @param {string} experimentName - Experiment name
   * @param {string} variant - Variant name
   * @param {string} goal - Conversion goal
   */
  trackConversion(experimentName, variant, goal) {
    if (window.analytics) {
      window.analytics.track('experiment_conversion', {
        experiment: experimentName,
        variant,
        goal,
      });
    }
  }

  /**
   * Reset user variants
   */
  resetVariants() {
    this.userVariants.clear();
  }
}

// Global A/B testing instance
let globalABTesting = null;

/**
 * Get or create the global A/B testing instance
 * @returns {ABTesting}
 */
export function getABTesting() {
  if (!globalABTesting) {
    globalABTesting = new ABTesting();

    // Register common experiments
    globalABTesting.registerExperiment(
      'recipe-sorting',
      ['default', 'match-ratio-first'],
      {
        enabled: true,
      }
    );

    globalABTesting.registerExperiment(
      'meal-suggestions',
      ['default', 'ai-enhanced'],
      {
        enabled: true,
      }
    );

    globalABTesting.registerExperiment(
      'ui-density',
      ['comfortable', 'compact'],
      {
        enabled: false,
      }
    );
  }

  return globalABTesting;
}

/**
 * Helper to check if feature is enabled
 * @param {string} featureName - Feature name
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
  const abTesting = getABTesting();
  const variant = abTesting.getVariant(featureName);
  return variant !== null && variant !== 'control';
}
