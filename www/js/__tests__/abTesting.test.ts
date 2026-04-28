// @ts-check
import {
  ABTesting,
  getABTesting,
  isFeatureEnabled,
} from '../utils/abTesting';

// Extend Window interface for analytics
declare global {
  interface Window {
    analytics?: {
      track: jest.Mock;
    };
  }
}

describe('abTesting', () => {
  let abTesting: ABTesting;

  beforeEach(() => {
    window.analytics = { track: jest.fn() };
    abTesting = new ABTesting();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with empty experiments', () => {
      expect(abTesting.experimentsData).toBeInstanceOf(Map);
      expect(abTesting.experimentsData.size).toBe(0);
    });

    it('initializes with empty user variants', () => {
      expect(abTesting.userVariantsData).toBeInstanceOf(Map);
      expect(abTesting.userVariantsData.size).toBe(0);
    });

    it('generates user ID', () => {
      expect(abTesting.userIdData).toBeTruthy();
      expect(typeof abTesting.userIdData).toBe('string');
    });
  });

  describe('getUserId', () => {
    it('returns user ID', () => {
      const userId = abTesting.getUserId();
      expect(userId).toBeTruthy();
      expect(typeof userId).toBe('string');
    });
  });

  describe('registerExperiment', () => {
    it('registers experiment with variants', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B']);
      expect(abTesting.experimentsData.has('test-exp')).toBe(true);
      const experiment = abTesting.experimentsData.get('test-exp');
      expect(experiment.variants).toEqual(['A', 'B']);
    });

    it('sets default weights', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B']);
      const experiment = abTesting.experimentsData.get('test-exp');
      expect(experiment.weights).toEqual([1, 1]);
    });

    it('sets custom weights', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B'], { weights: [2, 1] });
      const experiment = abTesting.experimentsData.get('test-exp');
      expect(experiment.weights).toEqual([2, 1]);
    });

    it('sets enabled by default', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B']);
      const experiment = abTesting.experimentsData.get('test-exp');
      expect(experiment.enabled).toBe(true);
    });

    it('can be disabled', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B'], { enabled: false });
      const experiment = abTesting.experimentsData.get('test-exp');
      expect(experiment.enabled).toBe(false);
    });

    it('sets date range', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      abTesting.registerExperiment('test-exp', ['A', 'B'], {
        startDate,
        endDate,
      });
      const experiment = abTesting.experimentsData.get('test-exp');
      expect(experiment.startDate).toBe(startDate);
      expect(experiment.endDate).toBe(endDate);
    });
  });

  describe('getVariant', () => {
    it('returns null for non-existent experiment', () => {
      const variant = abTesting.getVariant('non-existent');
      expect(variant).toBe(null);
    });

    it('returns null for disabled experiment', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B'], { enabled: false });
      const variant = abTesting.getVariant('test-exp');
      expect(variant).toBe(null);
    });

    it('returns null if before start date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      abTesting.registerExperiment('test-exp', ['A', 'B'], {
        enabled: true,
        startDate: futureDate.toISOString(),
      });
      const variant = abTesting.getVariant('test-exp');
      expect(variant).toBe(null);
    });

    it('returns null if after end date', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      abTesting.registerExperiment('test-exp', ['A', 'B'], {
        enabled: true,
        endDate: pastDate.toISOString(),
      });
      const variant = abTesting.getVariant('test-exp');
      expect(variant).toBe(null);
    });

    it('returns variant for enabled experiment', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B'], { enabled: true });
      const variant = abTesting.getVariant('test-exp');
      expect(['A', 'B']).toContain(variant);
    });

    it('caches variant for user', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B'], { enabled: true });
      const variant1 = abTesting.getVariant('test-exp');
      const variant2 = abTesting.getVariant('test-exp');
      expect(variant1).toBe(variant2);
    });
  });

  describe('assignVariant', () => {
    it('assigns variant based on user ID', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B']);
      const experiment = abTesting.experimentsData.get('test-exp');
      const variant = abTesting.assignVariant('test-exp', experiment);
      expect(['A', 'B']).toContain(variant);
    });

    it('respects weights', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B'], {
        weights: [10, 0],
      });
      const experiment = abTesting.experimentsData.get('test-exp');
      const variant = abTesting.assignVariant('test-exp', experiment);
      expect(variant).toBe('A');
    });
  });

  describe('hashString', () => {
    it('returns consistent hash for same string', () => {
      const hash1 = abTesting.hashString('test');
      const hash2 = abTesting.hashString('test');
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different strings', () => {
      const hash1 = abTesting.hashString('test1');
      const hash2 = abTesting.hashString('test2');
      expect(hash1).not.toBe(hash2);
    });

    it('returns positive number', () => {
      const hash = abTesting.hashString('test');
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isInVariant', () => {
    it('returns true if user is in variant', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B']);
      jest.spyOn(abTesting, 'getVariant').mockReturnValue('A');
      const result = abTesting.isInVariant('test-exp', 'A');
      expect(result).toBe(true);
    });

    it('returns false if user is not in variant', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B']);
      jest.spyOn(abTesting, 'getVariant').mockReturnValue('B');
      const result = abTesting.isInVariant('test-exp', 'A');
      expect(result).toBe(false);
    });
  });

  describe('trackExposure', () => {
    it('tracks exposure to analytics', () => {
      abTesting.trackExposure('test-exp', 'A');
      expect(window.analytics?.track).toHaveBeenCalledWith(
        'experiment_exposure',
        {
          experiment: 'test-exp',
          variant: 'A',
        }
      );
    });

    it('does not throw when analytics not available', () => {
      delete window.analytics;
      expect(() => abTesting.trackExposure('test-exp', 'A')).not.toThrow();
      window.analytics = { track: jest.fn() };
    });
  });

  describe('trackConversion', () => {
    it('tracks conversion to analytics', () => {
      abTesting.trackConversion('test-exp', 'A', 'signup');
      expect(window.analytics?.track).toHaveBeenCalledWith(
        'experiment_conversion',
        {
          experiment: 'test-exp',
          variant: 'A',
          goal: 'signup',
        }
      );
    });
  });

  describe('resetVariants', () => {
    it('clears user variants', () => {
      abTesting.registerExperiment('test-exp', ['A', 'B']);
      abTesting.getVariant('test-exp');
      abTesting.resetVariants();
      expect(abTesting.userVariantsData.size).toBe(0);
    });
  });

  describe('getABTesting', () => {
    it('returns singleton instance', () => {
      const instance1 = getABTesting();
      const instance2 = getABTesting();
      expect(instance1).toBe(instance2);
    });

    it('registers common experiments', () => {
      const instance = getABTesting();
      expect(instance.experimentsData.has('recipe-sorting')).toBe(true);
      expect(instance.experimentsData.has('meal-suggestions')).toBe(true);
      expect(instance.experimentsData.has('ui-density')).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true for enabled variant', () => {
      const abTesting = getABTesting();
      jest.spyOn(abTesting, 'getVariant').mockReturnValue('enabled');
      const result = isFeatureEnabled('feature');
      expect(result).toBe(true);
    });

    it('returns false for control variant', () => {
      const abTesting = getABTesting();
      jest.spyOn(abTesting, 'getVariant').mockReturnValue('control');
      const result = isFeatureEnabled('feature');
      expect(result).toBe(false);
    });

    it('returns false for null variant', () => {
      const abTesting = getABTesting();
      jest.spyOn(abTesting, 'getVariant').mockReturnValue(null);
      const result = isFeatureEnabled('feature');
      expect(result).toBe(false);
    });
  });
});
