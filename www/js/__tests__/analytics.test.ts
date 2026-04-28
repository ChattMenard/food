// @ts-check
import { Analytics, getAnalytics, initAnalytics } from '../utils/analytics.js;

// Mock window and document
global.window = {
  location: {
    pathname: '/test',
    href: 'https://example.com/test',
  },
};

global.document = {
  title: 'Test Page',
};

describe('Analytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = new Analytics();
    localStorage.clear();
    jest.clearAllMocks();

    // Set document title for pageView tests
    document.title = 'Test Page';
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('constructor', () => {
    it('initializes with default values', () => {
      expect(analytics.enabled).toBe(false);
      expect(analytics.apiKey).toBe('');
      expect(analytics.apiHost).toBe('');
      expect(analytics.userId).toBe(null);
      expect(analytics.userProperties).toEqual({});
    });
  });

  describe('init', () => {
    it('initializes with API key', () => {
      analytics.init({ apiKey: 'test-key', apiHost: 'https://test.com' });
      expect(analytics.enabled).toBe(true);
      expect(analytics.apiKey).toBe('test-key');
      expect(analytics.apiHost).toBe('https://test.com');
    });

    it('remains disabled without API key', () => {
      analytics.init({});
      expect(analytics.enabled).toBe(false);
    });

    it('loads user ID when enabled', () => {
      analytics.init({ apiKey: 'test-key' });
      expect(analytics.userId).toBeTruthy();
    });

    it('does not load user ID when disabled', () => {
      analytics.init({});
      expect(analytics.userId).toBe(null);
    });
  });

  describe('loadUserId', () => {
    it('loads existing user ID from localStorage', () => {
      localStorage.setItem('analytics-user-id', 'user_123');
      analytics.loadUserId();
      expect(analytics.userId).toBe('user_123');
    });

    it('generates new user ID if none exists', () => {
      analytics.loadUserId();
      expect(analytics.userId).toBeTruthy();
      expect(analytics.userId).toMatch(/^user_/);
      expect(localStorage.getItem('analytics-user-id')).toBe(analytics.userId);
    });
  });

  describe('generateUserId', () => {
    it('generates unique user IDs', () => {
      const id1 = analytics.generateUserId();
      const id2 = analytics.generateUserId();
      expect(id1).not.toBe(id2);
    });

    it('generates IDs with correct format', () => {
      const id = analytics.generateUserId();
      expect(id).toMatch(/^user_[a-z0-9]+$/);
    });
  });

  describe('identify', () => {
    it('sets user ID and properties', () => {
      analytics.identify('user_123', { name: 'Test User' });
      expect(analytics.userId).toBe('user_123');
      expect(analytics.userProperties).toEqual({ name: 'Test User' });
    });

    it('merges properties with existing', () => {
      analytics.identify('user_123', { name: 'Test' });
      analytics.identify('user_123', { email: 'test@example.com' });
      expect(analytics.userProperties).toEqual({
        name: 'Test',
        email: 'test@example.com',
      });
    });

    it('uses existing user ID if none provided', () => {
      analytics.userId = 'user_456';
      analytics.identify(null, { name: 'Test' });
      expect(analytics.userId).toBe('user_456');
    });
  });

  describe('track', () => {
    it('logs event when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      analytics.track('test_event', { prop: 'value' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('does not throw when disabled', () => {
      expect(() => analytics.track('test_event')).not.toThrow();
    });
  });

  describe('pageView', () => {
    it('tracks page view with default path', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.pageView();
      expect(trackSpy).toHaveBeenCalledWith('page_view', {
        path: window.location.pathname,
        url: window.location.href,
        title: 'Test Page',
      });
    });

    it('tracks page view with custom path', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.pageView('/custom');
      expect(trackSpy).toHaveBeenCalledWith('page_view', {
        path: '/custom',
        url: window.location.href,
        title: 'Test Page',
      });
    });
  });

  describe('trackPantryItemAdded', () => {
    it('tracks pantry item added event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      const item = { name: 'Chicken', category: 'meat', quantity: 2 };
      analytics.trackPantryItemAdded(item);
      expect(trackSpy).toHaveBeenCalledWith('pantry_item_added', {
        item_name: 'Chicken',
        category: 'meat',
        quantity: 2,
      });
    });
  });

  describe('trackMealPlanned', () => {
    it('tracks meal planned event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      const meal = {
        recipeId: 1,
        recipeName: 'Pasta',
        date: '2024-01-01',
        mealType: 'dinner',
      };
      analytics.trackMealPlanned(meal);
      expect(trackSpy).toHaveBeenCalledWith('meal_planned', {
        recipe_id: 1,
        recipe_name: 'Pasta',
        date: '2024-01-01',
        meal_type: 'dinner',
      });
    });
  });

  describe('trackRecipeViewed', () => {
    it('tracks recipe viewed event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.trackRecipeViewed(1, 'Pasta');
      expect(trackSpy).toHaveBeenCalledWith('recipe_viewed', {
        recipe_id: 1,
        recipe_name: 'Pasta',
      });
    });
  });

  describe('trackRecipeCooked', () => {
    it('tracks recipe cooked event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.trackRecipeCooked(1, 'Pasta');
      expect(trackSpy).toHaveBeenCalledWith('recipe_cooked', {
        recipe_id: 1,
        recipe_name: 'Pasta',
      });
    });
  });

  describe('trackShoppingListCreated', () => {
    it('tracks shopping list created event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.trackShoppingListCreated(10);
      expect(trackSpy).toHaveBeenCalledWith('shopping_list_created', {
        item_count: 10,
      });
    });
  });

  describe('trackAISuggestionUsed', () => {
    it('tracks AI suggestion used event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.trackAISuggestionUsed('meal_suggestion');
      expect(trackSpy).toHaveBeenCalledWith('ai_suggestion_used', {
        suggestion_type: 'meal_suggestion',
      });
    });
  });

  describe('trackSearch', () => {
    it('tracks search performed event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.trackSearch('chicken', 15);
      expect(trackSpy).toHaveBeenCalledWith('search_performed', {
        query: 'chicken',
        result_count: 15,
      });
    });
  });

  describe('trackFilterApplied', () => {
    it('tracks filter applied event', () => {
      const trackSpy = jest.spyOn(analytics, 'track');
      analytics.trackFilterApplied('cuisine', 'italian');
      expect(trackSpy).toHaveBeenCalledWith('filter_applied', {
        filter_type: 'cuisine',
        filter_value: 'italian',
      });
    });
  });

  describe('setUserProperty', () => {
    it('sets user property', () => {
      analytics.setUserProperty('name', 'Test User');
      expect(analytics.userProperties.name).toBe('Test User');
    });

    it('overwrites existing property', () => {
      analytics.setUserProperty('name', 'Test');
      analytics.setUserProperty('name', 'Updated');
      expect(analytics.userProperties.name).toBe('Updated');
    });
  });

  describe('incrementUserProperty', () => {
    it('increments property from zero', () => {
      analytics.incrementUserProperty('count');
      expect(analytics.userProperties.count).toBe(1);
    });

    it('increments existing property', () => {
      analytics.userProperties.count = 5;
      analytics.incrementUserProperty('count');
      expect(analytics.userProperties.count).toBe(6);
    });

    it('increments by custom value', () => {
      analytics.incrementUserProperty('count', 5);
      expect(analytics.userProperties.count).toBe(5);
    });
  });

  describe('reset', () => {
    it('resets user ID and properties', () => {
      analytics.userId = 'user_123';
      analytics.userProperties = { name: 'Test' };
      analytics.reset();
      expect(analytics.userId).toBe(null);
      expect(analytics.userProperties).toEqual({});
    });

    it('removes user ID from localStorage', () => {
      localStorage.setItem('analytics-user-id', 'user_123');
      analytics.reset();
      expect(localStorage.getItem('analytics-user-id')).toBe(null);
    });
  });

  describe('flush', () => {
    it('does not throw when called', () => {
      expect(() => analytics.flush()).not.toThrow();
    });
  });

  describe('getAnalytics', () => {
    it('returns singleton instance', () => {
      const instance1 = getAnalytics();
      const instance2 = getAnalytics();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initAnalytics', () => {
    it('initializes global analytics instance', () => {
      initAnalytics({ apiKey: 'test-key' });
      const analytics = getAnalytics();
      expect(analytics.enabled).toBe(true);
      expect(analytics.apiKey).toBe('test-key');
    });
  });
});
