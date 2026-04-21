import { MealPlanSharing } from '../../../features/plan/mealPlanSharing.js';

describe('MealPlanSharing', () => {
  let sharing;
  let mockGetMealPlan;
  let mockSetMealPlan;
  let mockPersistMealPlan;
  let mockAnnounce;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMealPlan = jest.fn();
    mockSetMealPlan = jest.fn();
    mockPersistMealPlan = jest.fn().mockResolvedValue();
    mockAnnounce = jest.fn();

    // Mock DOM APIs
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    global.document.createElement = jest.fn(() => ({
      href: '',
      download: '',
      click: jest.fn()
    }));

    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    global.navigator.clipboard = {
      writeText: jest.fn().mockResolvedValue()
    };

    sharing = new MealPlanSharing({
      getMealPlan: mockGetMealPlan,
      setMealPlan: mockSetMealPlan,
      persistMealPlan: mockPersistMealPlan,
      announce: mockAnnounce
    });
  });

  afterEach(() => {
    document.body.appendChild.mockRestore();
    document.body.removeChild.mockRestore();
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect(sharing.getMealPlan).toBe(mockGetMealPlan);
      expect(sharing.setMealPlan).toBe(mockSetMealPlan);
      expect(sharing.persistMealPlan).toBe(mockPersistMealPlan);
      expect(sharing.announce).toBe(mockAnnounce);
    });
  });

  describe('exportMealPlan', () => {
    it('exports meal plan as JSON file', () => {
      mockGetMealPlan.mockReturnValue({ Monday: 'Pasta', Tuesday: 'Tacos' });
      sharing.exportMealPlan();

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnnounce).toHaveBeenCalledWith('Meal plan exported successfully');
    });

    it('creates blob with correct structure', () => {
      mockGetMealPlan.mockReturnValue({ Monday: 'Pasta' });
      sharing.exportMealPlan();

      const blobCall = URL.createObjectURL.mock.calls[0];
      expect(blobCall[0]).toBeInstanceOf(Blob);
    });
  });

  describe('exportToICal', () => {
    it('exports meal plan as iCal file', () => {
      mockGetMealPlan.mockReturnValue({ Monday: 'Pasta', Tuesday: 'Tacos' });
      sharing.exportToICal();

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnnounce).toHaveBeenCalledWith('Calendar exported successfully');
    });

    it('skips empty meal entries', () => {
      mockGetMealPlan.mockReturnValue({ Monday: 'Pasta', Tuesday: null });
      sharing.exportToICal();

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('importMealPlan', () => {
    it('imports valid meal plan file', async () => {
      const file = new Blob(['{"version":"1.0","mealPlan":{"Monday":"Pasta"}}'], { type: 'application/json' });
      mockSetMealPlan.mockReturnValue({ Monday: 'Pasta' });

      const result = await sharing.importMealPlan(file);
      expect(mockSetMealPlan).toHaveBeenCalledWith({ Monday: 'Pasta' });
      expect(mockPersistMealPlan).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Meal plan imported successfully');
      expect(result).toEqual({ Monday: 'Pasta' });
    });

    it('rejects invalid file format', async () => {
      const file = new Blob(['invalid json'], { type: 'application/json' });

      await expect(sharing.importMealPlan(file)).rejects.toThrow();
      expect(mockAnnounce).toHaveBeenCalledWith('Failed to import meal plan: Invalid file format');
    });

    it('rejects file without mealPlan property', async () => {
      const file = new Blob(['{"version":"1.0"}'], { type: 'application/json' });

      await expect(sharing.importMealPlan(file)).rejects.toThrow();
      expect(mockAnnounce).toHaveBeenCalledWith('Failed to import meal plan: Invalid file format');
    });

    it('handles file read errors', async () => {
      const file = new Blob([''], { type: 'application/json' });
      
      // Mock FileReader to trigger error
      const mockReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);

      const promise = sharing.importMealPlan(file);
      mockReader.onerror({ target: {} });

      await expect(promise).rejects.toThrow('Error reading file');
      expect(mockAnnounce).toHaveBeenCalledWith('Failed to import meal plan: Error reading file');
    });
  });

  describe('copyMealPlanToClipboard', () => {
    it('copies meal plan to clipboard', async () => {
      mockGetMealPlan.mockReturnValue({ Monday: 'Pasta' });
      sharing.copyMealPlanToClipboard();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({ Monday: 'Pasta' }, null, 2));
      expect(mockAnnounce).toHaveBeenCalledWith('Meal plan copied to clipboard');
    });

    it('handles clipboard errors', async () => {
      mockGetMealPlan.mockReturnValue({ Monday: 'Pasta' });
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      sharing.copyMealPlanToClipboard();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnnounce).toHaveBeenCalledWith('Failed to copy meal plan to clipboard');
    });
  });
});
