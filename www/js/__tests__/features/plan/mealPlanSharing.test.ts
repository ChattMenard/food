// @ts-check
import { MealPlanSharing } from '../../../features/plan/mealPlanSharing';

describe('MealPlanSharing', () => {
  let sharing: MealPlanSharing;
  let mockGetMealPlan: jest.Mock;
  let mockSetMealPlan: jest.Mock;
  let mockPersistMealPlan: jest.Mock;
  let mockAnnounce: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMealPlan = jest.fn();
    mockSetMealPlan = jest.fn();
    mockPersistMealPlan = jest.fn().mockResolvedValue(undefined);
    mockAnnounce = jest.fn();

    // Mock DOM APIs
    (global.URL.createObjectURL as jest.Mock) = jest.fn().mockReturnValue('blob:mock-url');
    (global.URL.revokeObjectURL as jest.Mock) = jest.fn();

    (global.document.createElement as jest.Mock) = jest.fn(() => ({
      href: '',
      download: '',
      click: jest.fn()
    }));

    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    (global.navigator as any).clipboard = {
      writeText: jest.fn().mockResolvedValue(undefined)
    };

    sharing = new MealPlanSharing({
      getMealPlan: mockGetMealPlan,
      setMealPlan: mockSetMealPlan,
      persistMealPlan: mockPersistMealPlan,
      announce: mockAnnounce
    });
  });

  afterEach(() => {
    (document.body.appendChild as jest.Mock).mockRestore();
    (document.body.removeChild as jest.Mock).mockRestore();
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect((sharing as any).getMealPlan).toBe(mockGetMealPlan);
      expect((sharing as any).setMealPlan).toBe(mockSetMealPlan);
      expect((sharing as any).persistMealPlan).toBe(mockPersistMealPlan);
      expect((sharing as any).announce).toBe(mockAnnounce);
    });
  });

  describe('exportMealPlan', () => {
    it('exports meal plan as JSON', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'Weekly Plan',
        meals: [
          { day: 'Monday', recipe: 'Pasta' },
          { day: 'Tuesday', recipe: 'Salad' }
        ],
        createdAt: new Date().toISOString()
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      const exported = await sharing.exportMealPlan();

      expect(exported).toBeDefined();
      expect(exported.id).toBe('plan-1');
      expect(exported.name).toBe('Weekly Plan');
      expect(exported.meals).toHaveLength(2);
      expect(exported.exportedAt).toBeDefined();
    });

    it('handles missing meal plan', async () => {
      mockGetMealPlan.mockReturnValue(null);

      await expect(sharing.exportMealPlan()).rejects.toThrow('No meal plan to export');
    });

    it('includes metadata in export', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        meals: []
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      const exported = await sharing.exportMealPlan();

      expect(exported.version).toBeDefined();
      expect(exported.exportedAt).toBeDefined();
      expect(exported.exportedBy).toBeDefined();
    });
  });

  describe('importMealPlan', () => {
    it('imports valid meal plan', async () => {
      const importData = {
        id: 'plan-2',
        name: 'Imported Plan',
        meals: [
          { day: 'Wednesday', recipe: 'Soup' }
        ],
        version: '1.0'
      };

      await sharing.importMealPlan(importData);

      expect(mockSetMealPlan).toHaveBeenCalledWith(importData);
      expect(mockPersistMealPlan).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Meal plan imported successfully');
    });

    it('validates import data', async () => {
      const invalidData = {
        name: 'Invalid Plan'
        // missing required fields
      };

      await expect(sharing.importMealPlan(invalidData as any)).rejects.toThrow('Invalid meal plan data');
    });

    it('handles version compatibility', async () => {
      const oldVersionData = {
        id: 'plan-old',
        name: 'Old Plan',
        meals: [],
        version: '0.9'
      };

      await sharing.importMealPlan(oldVersionData);

      expect(mockSetMealPlan).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Imported older meal plan version');
    });

    it('merges with existing plan if requested', async () => {
      const existingPlan = {
        id: 'plan-existing',
        name: 'Existing Plan',
        meals: [{ day: 'Monday', recipe: 'Pasta' }]
      };

      const importData = {
        id: 'plan-import',
        name: 'Import Plan',
        meals: [{ day: 'Tuesday', recipe: 'Salad' }],
        version: '1.0'
      };

      mockGetMealPlan.mockReturnValue(existingPlan);

      await sharing.importMealPlan(importData, { merge: true });

      expect(mockSetMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          meals: expect.arrayContaining([
            { day: 'Monday', recipe: 'Pasta' },
            { day: 'Tuesday', recipe: 'Salad' }
          ])
        })
      );
    });
  });

  describe('downloadMealPlan', () => {
    it('creates and downloads file', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        meals: []
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      await sharing.downloadMealPlan();

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect((global.URL.createObjectURL as jest.Mock)).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Meal plan downloaded');
    });

    it('uses custom filename', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'My Custom Plan',
        meals: []
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      await sharing.downloadMealPlan('custom-filename.json');

      const mockElement = (global.document.createElement as jest.Mock).mock.results[0].value;
      expect(mockElement.download).toBe('custom-filename.json');
    });

    it('cleans up resources', async () => {
      const mockMealPlan = { id: 'plan-1', meals: [] };
      mockGetMealPlan.mockReturnValue(mockMealPlan);

      await sharing.downloadMealPlan();

      expect((global.URL.revokeObjectURL as jest.Mock)).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });
  });

  describe('shareMealPlanUrl', () => {
    it('generates shareable URL', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'Shareable Plan',
        meals: []
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      const url = await sharing.shareMealPlanUrl();

      expect(url).toContain('meal-plan=');
      expect(mockAnnounce).toHaveBeenCalledWith('Shareable URL generated');
    });

    it('encodes meal plan data', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'Test & Plan',
        meals: []
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      const url = await sharing.shareMealPlanUrl();

      expect(url).toContain(encodeURIComponent('Test & Plan'));
    });

    it('limits URL length', async () => {
      const largeMealPlan = {
        id: 'plan-large',
        name: 'A'.repeat(2000), // Very long name
        meals: []
      };

      mockGetMealPlan.mockReturnValue(largeMealPlan);

      await expect(sharing.shareMealPlanUrl()).rejects.toThrow('Meal plan too large to share via URL');
    });
  });

  describe('copyToClipboard', () => {
    it('copies meal plan to clipboard', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'Clipboard Plan',
        meals: [{ day: 'Monday', recipe: 'Pasta' }]
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      await sharing.copyToClipboard();

      expect((global.navigator as any).clipboard.writeText).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Meal plan copied to clipboard');
    });

    it('formats clipboard content', async () => {
      const mockMealPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        meals: [
          { day: 'Monday', recipe: 'Pasta' },
          { day: 'Tuesday', recipe: 'Salad' }
        ]
      };

      mockGetMealPlan.mockReturnValue(mockMealPlan);

      await sharing.copyToClipboard();

      const clipboardCall = (global.navigator as any).clipboard.writeText.mock.calls[0][0];
      expect(clipboardCall).toContain('Test Plan');
      expect(clipboardCall).toContain('Monday: Pasta');
      expect(clipboardCall).toContain('Tuesday: Salad');
    });

    it('handles clipboard errors', async () => {
      (global.navigator as any).clipboard.writeText.mockRejectedValue(new Error('Clipboard denied'));

      const mockMealPlan = { id: 'plan-1', meals: [] };
      mockGetMealPlan.mockReturnValue(mockMealPlan);

      await expect(sharing.copyToClipboard()).rejects.toThrow('Failed to copy to clipboard');
    });
  });

  describe('validateImportData', () => {
    it('accepts valid meal plan data', () => {
      const validData = {
        id: 'plan-1',
        name: 'Valid Plan',
        meals: [],
        version: '1.0'
      };

      expect(() => (sharing as any).validateImportData(validData)).not.toThrow();
    });

    it('rejects data without required fields', () => {
      const invalidData = {
        name: 'Invalid Plan'
        // missing id, meals, version
      };

      expect(() => (sharing as any).validateImportData(invalidData)).toThrow();
    });

    it('rejects data with invalid meals array', () => {
      const invalidData = {
        id: 'plan-1',
        name: 'Invalid Plan',
        meals: 'not an array',
        version: '1.0'
      };

      expect(() => (sharing as any).validateImportData(invalidData)).toThrow();
    });
  });

  describe('formatForClipboard', () => {
    it('formats meal plan as readable text', () => {
      const mealPlan = {
        name: 'Weekly Menu',
        meals: [
          { day: 'Monday', recipe: 'Spaghetti Bolognese' },
          { day: 'Tuesday', recipe: 'Caesar Salad' },
          { day: 'Wednesday', recipe: 'Grilled Chicken' }
        ]
      };

      const formatted = (sharing as any).formatForClipboard(mealPlan);

      expect(formatted).toContain('Weekly Menu');
      expect(formatted).toContain('Monday: Spaghetti Bolognese');
      expect(formatted).toContain('Tuesday: Caesar Salad');
      expect(formatted).toContain('Wednesday: Grilled Chicken');
    });

    it('handles empty meal plan', () => {
      const emptyPlan = {
        name: 'Empty Plan',
        meals: []
      };

      const formatted = (sharing as any).formatForClipboard(emptyPlan);

      expect(formatted).toContain('Empty Plan');
      expect(formatted).toContain('No meals scheduled');
    });
  });
});
