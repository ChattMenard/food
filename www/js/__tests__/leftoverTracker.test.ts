// @ts-check
import { LeftoverTracker } from '../features/pantry/leftoverTracker';

describe('LeftoverTracker', () => {
  let tracker: LeftoverTracker;
  let mockGetPantry: jest.Mock;
  let mockSetPantry: jest.Mock;
  let mockPersistPantry: jest.Mock;
  let mockAnnounce: jest.Mock;

  beforeEach(() => {
    mockGetPantry = jest.fn();
    mockSetPantry = jest.fn();
    mockPersistPantry = jest.fn();
    mockAnnounce = jest.fn();

    tracker = new LeftoverTracker({
      getPantry: mockGetPantry,
      setPantry: mockSetPantry,
      persistPantry: mockPersistPantry,
      announce: mockAnnounce,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect((tracker as any).getPantry).toBe(mockGetPantry);
      expect((tracker as any).setPantry).toBe(mockSetPantry);
      expect((tracker as any).persistPantry).toBe(mockPersistPantry);
      expect((tracker as any).announce).toBe(mockAnnounce);
    });
  });

  describe('markAsLeftover', () => {
    it('marks item as leftover when not already marked', () => {
      const pantryItems = [{ name: 'pasta', quantity: 2 }];
      mockGetPantry.mockReturnValue(pantryItems);

      const result = (tracker as any).markAsLeftover(0);
      expect(result).toBe(true);
      expect(pantryItems[0].isLeftover).toBe(true);
      expect(pantryItems[0].leftoverDate).toBeDefined();
      expect(mockAnnounce).toHaveBeenCalledWith('Marked pasta as leftover');
      expect(mockPersistPantry).toHaveBeenCalled();
    });

    it('removes leftover status when already marked', () => {
      const pantryItems = [{ name: 'pasta', quantity: 2, isLeftover: true, leftoverDate: new Date() }];
      mockGetPantry.mockReturnValue(pantryItems);

      const result = (tracker as any).markAsLeftover(0);
      expect(result).toBe(true);
      expect(pantryItems[0].isLeftover).toBe(false);
      expect(pantryItems[0].leftoverDate).toBeUndefined();
      expect(mockAnnounce).toHaveBeenCalledWith('Removed leftover status from pasta');
      expect(mockPersistPantry).toHaveBeenCalled();
    });

    it('returns false for invalid index', () => {
      mockGetPantry.mockReturnValue([{ name: 'pasta', quantity: 2 }]);

      const result = (tracker as any).markAsLeftover(5);
      expect(result).toBe(false);
      expect(mockPersistPantry).not.toHaveBeenCalled();
    });

    it('handles empty pantry', () => {
      mockGetPantry.mockReturnValue([]);

      const result = (tracker as any).markAsLeftover(0);
      expect(result).toBe(false);
      expect(mockPersistPantry).not.toHaveBeenCalled();
    });
  });

  describe('getLeftovers', () => {
    it('returns only leftover items', () => {
      const pantryItems = [
        { name: 'pasta', quantity: 2, isLeftover: true },
        { name: 'rice', quantity: 1, isLeftover: false },
        { name: 'chicken', quantity: 3, isLeftover: true }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const leftovers = (tracker as any).getLeftovers();
      expect(leftovers).toHaveLength(2);
      expect(leftovers[0].name).toBe('pasta');
      expect(leftovers[1].name).toBe('chicken');
    });

    it('returns empty array when no leftovers', () => {
      const pantryItems = [
        { name: 'pasta', quantity: 2, isLeftover: false },
        { name: 'rice', quantity: 1, isLeftover: false }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const leftovers = (tracker as any).getLeftovers();
      expect(leftovers).toEqual([]);
    });

    it('handles null pantry', () => {
      mockGetPantry.mockReturnValue(null);

      const leftovers = (tracker as any).getLeftovers();
      expect(leftovers).toEqual([]);
    });
  });

  describe('getLeftoversByAge', () => {
    beforeEach(() => {
      const now = new Date();
      const pantryItems = [
        { name: 'old pasta', quantity: 1, isLeftover: true, leftoverDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
        { name: 'fresh chicken', quantity: 2, isLeftover: true, leftoverDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
        { name: 'very old rice', quantity: 1, isLeftover: true, leftoverDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) } // 10 days ago
      ];
      mockGetPantry.mockReturnValue(pantryItems);
    });

    it('groups leftovers by age', () => {
      const byAge = (tracker as any).getLeftoversByAge();
      
      expect(byAge.fresh).toHaveLength(1);
      expect(byAge.fresh[0].name).toBe('fresh chicken');
      
      expect(byAge.medium).toHaveLength(1);
      expect(byAge.medium[0].name).toBe('old pasta');
      
      expect(byAge.old).toHaveLength(1);
      expect(byAge.old[0].name).toBe('very old rice');
    });

    it('handles empty categories', () => {
      const pantryItems = [
        { name: 'fresh pasta', quantity: 1, isLeftover: true, leftoverDate: new Date() }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const byAge = (tracker as any).getLeftoversByAge();
      
      expect(byAge.fresh).toHaveLength(1);
      expect(byAge.medium).toEqual([]);
      expect(byAge.old).toEqual([]);
    });
  });

  describe('getExpiringLeftovers', () => {
    beforeEach(() => {
      const now = new Date();
      const pantryItems = [
        { name: 'expiring pasta', quantity: 1, isLeftover: true, leftoverDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) }, // 6 days ago
        { name: 'fresh chicken', quantity: 2, isLeftover: true, leftoverDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
        { name: 'very old rice', quantity: 1, isLeftover: true, leftoverDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) } // 8 days ago
      ];
      mockGetPantry.mockReturnValue(pantryItems);
    });

    it('returns leftovers older than threshold', () => {
      const expiring = (tracker as any).getExpiringLeftovers(5); // 5 days
      
      expect(expiring).toHaveLength(2);
      expect(expiring.map((item: any) => item.name)).toContain('expiring pasta');
      expect(expiring.map((item: any) => item.name)).toContain('very old rice');
    });

    it('returns empty when no items exceed threshold', () => {
      const expiring = (tracker as any).getExpiringLeftovers(10); // 10 days
      
      expect(expiring).toEqual([]);
    });
  });

  describe('suggestRecipes', () => {
    it('suggests recipes based on leftovers', () => {
      const pantryItems = [
        { name: 'chicken', quantity: 2, isLeftover: true },
        { name: 'rice', quantity: 1, isLeftover: true },
        { name: 'onions', quantity: 3, isLeftover: false }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const suggestions = (tracker as any).suggestRecipes();
      
      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach((suggestion: any) => {
        expect(suggestion).toHaveProperty('name');
        expect(suggestion).toHaveProperty('ingredients');
        expect(suggestion).toHaveProperty('matchPercentage');
      });
    });

    it('prioritizes recipes using more leftovers', () => {
      const pantryItems = [
        { name: 'chicken', quantity: 2, isLeftover: true },
        { name: 'rice', quantity: 1, isLeftover: true },
        { name: 'onions', quantity: 3, isLeftover: false }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const suggestions = (tracker as any).suggestRecipes();
      
      // Should be sorted by match percentage
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i-1].matchPercentage).toBeGreaterThanOrEqual(suggestions[i].matchPercentage);
      }
    });

    it('returns empty when no leftovers', () => {
      const pantryItems = [
        { name: 'chicken', quantity: 2, isLeftover: false },
        { name: 'rice', quantity: 1, isLeftover: false }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const suggestions = (tracker as any).suggestRecipes();
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('generateLeftoverReport', () => {
    it('generates comprehensive report', () => {
      const now = new Date();
      const pantryItems = [
        { name: 'chicken', quantity: 2, isLeftover: true, leftoverDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { name: 'rice', quantity: 1, isLeftover: true, leftoverDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) },
        { name: 'onions', quantity: 3, isLeftover: false }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const report = (tracker as any).generateLeftoverReport();
      
      expect(report).toHaveProperty('totalLeftovers');
      expect(report).toHaveProperty('byAge');
      expect(report).toHaveProperty('expiringSoon');
      expect(report).toHaveProperty('suggestions');
      expect(report.totalLeftovers).toBe(2);
    });

    it('handles empty pantry', () => {
      mockGetPantry.mockReturnValue([]);

      const report = (tracker as any).generateLeftoverReport();
      
      expect(report.totalLeftovers).toBe(0);
      expect(report.byAge.fresh).toEqual([]);
      expect(report.byAge.medium).toEqual([]);
      expect(report.byAge.old).toEqual([]);
      expect(report.expiringSoon).toEqual([]);
      expect(report.suggestions).toEqual([]);
    });
  });

  describe('autoCleanup', () => {
    it('removes very old leftovers', () => {
      const now = new Date();
      const pantryItems = [
        { name: 'chicken', quantity: 2, isLeftover: true, leftoverDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { name: 'old rice', quantity: 1, isLeftover: true, leftoverDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) }, // 15 days old
        { name: 'onions', quantity: 3, isLeftover: false }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      (tracker as any).autoCleanup(14); // 14 days threshold

      expect(mockSetPantry).toHaveBeenCalled();
      const updatedPantry = mockSetPantry.mock.calls[0][0];
      expect(updatedPantry.filter((item: any) => item.name === 'old rice')).toEqual([]);
      expect(updatedPantry.filter((item: any) => item.name === 'chicken')).toHaveLength(1);
    });

    it('announces cleanup results', () => {
      const now = new Date();
      const pantryItems = [
        { name: 'old rice', quantity: 1, isLeftover: true, leftoverDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      (tracker as any).autoCleanup(14);

      expect(mockAnnounce).toHaveBeenCalledWith('Cleaned up 1 expired leftover item');
    });

    it('handles no expired items', () => {
      const pantryItems = [
        { name: 'chicken', quantity: 2, isLeftover: true, leftoverDate: new Date() }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      (tracker as any).autoCleanup(14);

      expect(mockAnnounce).toHaveBeenCalledWith('No expired leftovers to clean up');
    });
  });

  describe('edge cases', () => {
    it('handles missing leftoverDate', () => {
      const pantryItems = [
        { name: 'pasta', quantity: 2, isLeftover: true } // missing leftoverDate
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const leftovers = (tracker as any).getLeftovers();
      expect(leftovers).toHaveLength(1);
      expect(leftovers[0].name).toBe('pasta');
    });

    it('handles invalid dates', () => {
      const pantryItems = [
        { name: 'pasta', quantity: 2, isLeftover: true, leftoverDate: 'invalid-date' as any }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const byAge = (tracker as any).getLeftoversByAge();
      expect(byAge.fresh).toEqual([]);
      expect(byAge.medium).toEqual([]);
      expect(byAge.old).toEqual([]);
    });

    it('handles zero quantity leftovers', () => {
      const pantryItems = [
        { name: 'pasta', quantity: 0, isLeftover: true }
      ];
      mockGetPantry.mockReturnValue(pantryItems);

      const leftovers = (tracker as any).getLeftovers();
      expect(leftovers).toHaveLength(1);
    });
  });
});
