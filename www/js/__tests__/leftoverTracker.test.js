import { LeftoverTracker } from '../features/pantry/leftoverTracker.js';

describe('LeftoverTracker', () => {
  let tracker;
  let mockGetPantry;
  let mockSetPantry;
  let mockPersistPantry;
  let mockAnnounce;

  beforeEach(() => {
    mockGetPantry = jest.fn();
    mockSetPantry = jest.fn();
    mockPersistPantry = jest.fn();
    mockAnnounce = jest.fn();

    tracker = new LeftoverTracker({
      getPantry: mockGetPantry,
      setPantry: mockSetPantry,
      persistPantry: mockPersistPantry,
      announce: mockAnnounce
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect(tracker.getPantry).toBe(mockGetPantry);
      expect(tracker.setPantry).toBe(mockSetPantry);
      expect(tracker.persistPantry).toBe(mockPersistPantry);
      expect(tracker.announce).toBe(mockAnnounce);
    });
  });

  describe('markAsLeftover', () => {
    it('marks item as leftover when not already marked', () => {
      mockGetPantry.mockReturnValue([
        { name: 'pasta', quantity: 2 }
      ]);

      const result = tracker.markAsLeftover(0);
      expect(result).toBe(true);
      expect(mockGetPantry()[0].isLeftover).toBe(true);
      expect(mockGetPantry()[0].leftoverDate).toBeDefined();
      expect(mockAnnounce).toHaveBeenCalledWith('Marked pasta as leftover');
      expect(mockPersistPantry).toHaveBeenCalled();
    });

    it('removes leftover status when already marked', () => {
      mockGetPantry.mockReturnValue([
        { name: 'pasta', quantity: 2, isLeftover: true, leftoverDate: '2024-01-01' }
      ]);

      const result = tracker.markAsLeftover(0);
      expect(result).toBe(true);
      expect(mockGetPantry()[0].isLeftover).toBe(false);
      expect(mockGetPantry()[0].leftoverDate).toBeUndefined();
      expect(mockAnnounce).toHaveBeenCalledWith('Removed leftover status from pasta');
      expect(mockPersistPantry).toHaveBeenCalled();
    });

    it('returns false when item does not exist', () => {
      mockGetPantry.mockReturnValue([
        { name: 'pasta', quantity: 2 }
      ]);

      const result = tracker.markAsLeftover(5);
      expect(result).toBe(false);
      expect(mockPersistPantry).not.toHaveBeenCalled();
    });

    it('handles empty pantry', () => {
      mockGetPantry.mockReturnValue([]);

      const result = tracker.markAsLeftover(0);
      expect(result).toBe(false);
      expect(mockPersistPantry).not.toHaveBeenCalled();
    });
  });

  describe('getLeftovers', () => {
    it('returns only items marked as leftover', () => {
      mockGetPantry.mockReturnValue([
        { name: 'pasta', quantity: 2, isLeftover: true },
        { name: 'sauce', quantity: 1, isLeftover: false },
        { name: 'cheese', quantity: 3, isLeftover: true }
      ]);

      const leftovers = tracker.getLeftovers();
      expect(leftovers).toHaveLength(2);
      expect(leftovers[0].name).toBe('pasta');
      expect(leftovers[1].name).toBe('cheese');
    });

    it('returns empty array when no leftovers', () => {
      mockGetPantry.mockReturnValue([
        { name: 'pasta', quantity: 2, isLeftover: false },
        { name: 'sauce', quantity: 1, isLeftover: false }
      ]);

      const leftovers = tracker.getLeftovers();
      expect(leftovers).toEqual([]);
    });

    it('handles empty pantry', () => {
      mockGetPantry.mockReturnValue([]);

      const leftovers = tracker.getLeftovers();
      expect(leftovers).toEqual([]);
    });
  });

  describe('suggestLeftoverRecipes', () => {
    it('returns empty array when no leftovers', () => {
      mockGetPantry.mockReturnValue([
        { name: 'pasta', quantity: 2, isLeftover: false }
      ]);

      const recipes = [
        { name: 'Pasta Carbonara', ingredients: ['pasta', 'eggs'] }
      ];

      const suggestions = tracker.suggestLeftoverRecipes(recipes);
      expect(suggestions).toEqual([]);
    });

    it('handles empty recipes array', () => {
      mockGetPantry.mockReturnValue([
        { name: 'pasta', quantity: 2, isLeftover: true }
      ]);

      const suggestions = tracker.suggestLeftoverRecipes([]);
      expect(suggestions).toEqual([]);
    });
  });
});
