// @ts-check
import { MealPlanTemplates } from '../../../features/plan/mealPlanTemplates';

jest.mock('../../../data/db', () => ({
  ready: Promise.resolve(),
  get: jest.fn(),
  put: jest.fn().mockResolvedValue(undefined)
}));

import db from '../../../data/db';

describe('MealPlanTemplates', () => {
  let templates: MealPlanTemplates;
  let mockGetMealPlan: jest.Mock;
  let mockSetMealPlan: jest.Mock;
  let mockPersistMealPlan: jest.Mock;
  let mockGetRecipes: jest.Mock;
  let mockAnnounce: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMealPlan = jest.fn();
    mockSetMealPlan = jest.fn();
    mockPersistMealPlan = jest.fn().mockResolvedValue(undefined);
    mockGetRecipes = jest.fn();
    mockAnnounce = jest.fn();

    templates = new MealPlanTemplates({
      getMealPlan: mockGetMealPlan,
      setMealPlan: mockSetMealPlan,
      persistMealPlan: mockPersistMealPlan,
      getRecipes: mockGetRecipes,
      announce: mockAnnounce
    });
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect((templates as any).getMealPlan).toBe(mockGetMealPlan);
      expect((templates as any).setMealPlan).toBe(mockSetMealPlan);
      expect((templates as any).persistMealPlan).toBe(mockPersistMealPlan);
      expect((templates as any).getRecipes).toBe(mockGetRecipes);
      expect((templates as any).announce).toBe(mockAnnounce);
    });

    it('initializes customTemplates as empty object', () => {
      expect((templates as any).customTemplates).toEqual({});
    });

    it('calls loadCustomTemplates on construction', async () => {
      const loadSpy = jest.spyOn(templates as any, 'loadCustomTemplates');
      loadSpy.mockResolvedValue(undefined);
      
      new MealPlanTemplates({
        getMealPlan: mockGetMealPlan,
        setMealPlan: mockSetMealPlan,
        persistMealPlan: mockPersistMealPlan,
        getRecipes: mockGetRecipes,
        announce: mockAnnounce
      });
      
      expect(loadSpy).toHaveBeenCalled();
      loadSpy.mockRestore();
    });
  });

  describe('getBuiltInTemplates', () => {
    it('returns built-in template list', () => {
      const builtInTemplates = templates.getBuiltInTemplates();
      
      expect(Array.isArray(builtInTemplates)).toBe(true);
      expect(builtInTemplates.length).toBeGreaterThan(0);
      
      const template = builtInTemplates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('meals');
    });

    it('includes variety of template types', () => {
      const builtInTemplates = templates.getBuiltInTemplates();
      
      const templateIds = builtInTemplates.map((t: any) => t.id);
      expect(templateIds).toContain('weekly-balanced');
      expect(templateIds).toContain('vegetarian-week');
      expect(templateIds).toContain('quick-meals');
    });

    it('templates have proper structure', () => {
      const builtInTemplates = templates.getBuiltInTemplates();
      
      builtInTemplates.forEach((template: any) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.meals).toBeDefined();
        expect(Array.isArray(template.meals)).toBe(true);
        
        template.meals.forEach((meal: any) => {
          expect(meal).toHaveProperty('day');
          expect(meal).toHaveProperty('recipe');
          expect(meal).toHaveProperty('category');
        });
      });
    });
  });

  describe('getAllTemplates', () => {
    it('returns built-in and custom templates', async () => {
      (templates as any).customTemplates = {
        'custom-1': {
          id: 'custom-1',
          name: 'Custom Template',
          meals: []
        }
      };

      const allTemplates = await templates.getAllTemplates();

      expect(allTemplates.length).toBeGreaterThan(0);
      
      const customTemplate = allTemplates.find((t: any) => t.id === 'custom-1');
      expect(customTemplate).toBeDefined();
      expect(customTemplate.name).toBe('Custom Template');
    });

    it('marks custom templates appropriately', async () => {
      (templates as any).customTemplates = {
        'custom-1': { id: 'custom-1', name: 'Custom', meals: [] }
      };

      const allTemplates = await templates.getAllTemplates();

      const customTemplate = allTemplates.find((t: any) => t.id === 'custom-1');
      expect(customTemplate.isCustom).toBe(true);

      const builtInTemplate = allTemplates.find((t: any) => t.id === 'weekly-balanced');
      expect(builtInTemplate.isCustom).toBe(false);
    });
  });

  describe('applyTemplate', () => {
    it('applies template to current meal plan', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        meals: [
          { day: 'Monday', recipe: 'Pasta', category: 'dinner' },
          { day: 'Tuesday', recipe: 'Salad', category: 'lunch' }
        ]
      };

      await templates.applyTemplate(template);

      expect(mockSetMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          meals: template.meals,
          templateId: 'test-template',
          templateName: 'Test Template'
        })
      );
      expect(mockPersistMealPlan).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Template applied successfully');
    });

    it('validates template structure', async () => {
      const invalidTemplate = {
        id: 'invalid',
        name: 'Invalid Template'
        // missing meals
      };

      await expect(templates.applyTemplate(invalidTemplate as any)).rejects.toThrow('Invalid template structure');
    });

    it('replaces existing meals when not merging', async () => {
      const existingPlan = {
        meals: [
          { day: 'Wednesday', recipe: 'Soup', category: 'dinner' }
        ]
      };

      mockGetMealPlan.mockReturnValue(existingPlan);

      const template = {
        id: 'test-template',
        name: 'Test Template',
        meals: [
          { day: 'Monday', recipe: 'Pasta', category: 'dinner' }
        ]
      };

      await templates.applyTemplate(template, { merge: false });

      expect(mockSetMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          meals: template.meals
        })
      );
    });

    it('merges with existing meals when requested', async () => {
      const existingPlan = {
        meals: [
          { day: 'Monday', recipe: 'Existing Pasta', category: 'dinner' }
        ]
      };

      mockGetMealPlan.mockReturnValue(existingPlan);

      const template = {
        id: 'test-template',
        name: 'Test Template',
        meals: [
          { day: 'Tuesday', recipe: 'New Salad', category: 'lunch' }
        ]
      };

      await templates.applyTemplate(template, { merge: true });

      expect(mockSetMealPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          meals: expect.arrayContaining([
            { day: 'Monday', recipe: 'Existing Pasta', category: 'dinner' },
            { day: 'Tuesday', recipe: 'New Salad', category: 'lunch' }
          ])
        })
      );
    });
  });

  describe('saveCustomTemplate', () => {
    it('saves custom template', async () => {
      const templateData = {
        name: 'My Custom Template',
        description: 'A custom meal plan',
        meals: [
          { day: 'Friday', recipe: 'Pizza', category: 'dinner' }
        ]
      };

      const result = await templates.saveCustomTemplate(templateData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('My Custom Template');
      expect(result.isCustom).toBe(true);
      expect(db.put).toHaveBeenCalledWith('meal-plan-templates', result);
      expect(mockAnnounce).toHaveBeenCalledWith('Custom template saved');
    });

    it('generates unique ID for custom template', async () => {
      const templateData = {
        name: 'Template 1',
        meals: []
      };

      const result1 = await templates.saveCustomTemplate(templateData);
      const result2 = await templates.saveCustomTemplate({
        ...templateData,
        name: 'Template 2'
      });

      expect(result1.id).not.toBe(result2.id);
    });

    it('validates custom template data', async () => {
      const invalidData = {
        name: 'Invalid Template'
        // missing meals
      };

      await expect(templates.saveCustomTemplate(invalidData as any)).rejects.toThrow('Invalid template data');
    });
  });

  describe('deleteCustomTemplate', () => {
    it('deletes custom template', async () => {
      const templateId = 'custom-template-1';
      
      await templates.deleteCustomTemplate(templateId);

      expect(db.delete).toHaveBeenCalledWith('meal-plan-templates', templateId);
      expect(mockAnnounce).toHaveBeenCalledWith('Custom template deleted');
    });

    it('prevents deletion of built-in templates', async () => {
      const builtInId = 'weekly-balanced';

      await expect(templates.deleteCustomTemplate(builtInId)).rejects.toThrow('Cannot delete built-in template');
    });
  });

  describe('validateTemplate', () => {
    it('accepts valid template', () => {
      const validTemplate = {
        name: 'Valid Template',
        meals: [
          { day: 'Monday', recipe: 'Pasta', category: 'dinner' }
        ]
      };

      expect(() => (templates as any).validateTemplate(validTemplate)).not.toThrow();
    });

    it('rejects template without name', () => {
      const invalidTemplate = {
        meals: []
      };

      expect(() => (templates as any).validateTemplate(invalidTemplate)).toThrow('Template name is required');
    });

    it('rejects template without meals', () => {
      const invalidTemplate = {
        name: 'Invalid Template'
      };

      expect(() => (templates as any).validateTemplate(invalidTemplate)).toThrow('Template meals are required');
    });

    it('rejects template with invalid meal structure', () => {
      const invalidTemplate = {
        name: 'Invalid Template',
        meals: [
          { day: 'Monday' } // missing recipe and category
        ]
      };

      expect(() => (templates as any).validateTemplate(invalidTemplate)).toThrow('Invalid meal structure');
    });
  });

  describe('loadCustomTemplates', () => {
    it('loads custom templates from database', async () => {
      const customTemplates = [
        {
          id: 'custom-1',
          name: 'Custom 1',
          meals: [],
          isCustom: true
        },
        {
          id: 'custom-2',
          name: 'Custom 2',
          meals: [],
          isCustom: true
        }
      ];

      (db.getAll as jest.Mock).mockResolvedValue(customTemplates);

      await (templates as any).loadCustomTemplates();

      expect((templates as any).customTemplates).toEqual({
        'custom-1': customTemplates[0],
        'custom-2': customTemplates[1]
      });
    });

    it('handles database errors gracefully', async () => {
      (db.getAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect((templates as any).loadCustomTemplates()).resolves.toBeUndefined();
    });
  });

  describe('template recommendations', () => {
    it('recommends templates based on preferences', async () => {
      const preferences = {
        diet: 'vegetarian',
        difficulty: 'easy',
        timeLimit: 30
      };

      const recommendations = await templates.getRecommendations(preferences);

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach((template: any) => {
        expect(template).toHaveProperty('template');
        expect(template).toHaveProperty('score');
        expect(template.score).toBeGreaterThanOrEqual(0);
        expect(template.score).toBeLessThanOrEqual(1);
      });
    });

    it('scores templates based on match criteria', async () => {
      const preferences = {
        diet: 'vegetarian'
      };

      const recommendations = await templates.getRecommendations(preferences);

      const vegetarianTemplates = recommendations.filter((r: any) => 
        r.template.tags?.includes('vegetarian')
      );
      
      // Vegetarian templates should have higher scores
      vegetarianTemplates.forEach((rec: any) => {
        expect(rec.score).toBeGreaterThan(0.5);
      });
    });
  });
});
