// @ts-check
/**
 * Meal Prep Planner Tests
 * Tests for batch cooking, portion planning, and prep schedules
 */

import {
  MealPrepPlanner,
  PREP_STRATEGIES,
  STORAGE_GUIDELINES,
} from '../features/plan/mealPrepPlanner';

describe('MealPrepPlanner', () => {
  let planner: MealPrepPlanner;

  beforeEach(() => {
    planner = new MealPrepPlanner();
  });

  describe('initialization', () => {
    it('should default to component strategy', () => {
      expect((planner as any).currentStrategy).toBe('component');
    });

    it('should default to Sunday prep day', () => {
      expect((planner as any).prepDay).toBe(0);
    });

    it('should get current settings', () => {
      const settings = planner.getSettings();
      expect(settings.strategy).toBe('component');
      expect(settings.prepDay).toBe(0);
      expect(settings.strategyDetails).toBeDefined();
    });
  });

  describe('strategy management', () => {
    it('should list all strategies', () => {
      const strategies = planner.getStrategies();
      expect(strategies.length).toBe(3);
      expect(strategies.some((s: any) => s.id === 'component')).toBe(true);
      expect(strategies.some((s: any) => s.id === 'batch-meals')).toBe(true);
      expect(strategies.some((s: any) => s.id === 'hybrid')).toBe(true);
    });

    it('should set strategy correctly', async () => {
      await planner.setStrategy('batch-meals');
      expect((planner as any).currentStrategy).toBe('batch-meals');
      expect(planner.getSettings().strategyDetails.name).toBe('Batch Meals');
    });

    it('should reject invalid strategy', async () => {
      await expect(planner.setStrategy('invalid' as any)).rejects.toThrow('Invalid strategy');
    });

    it('should save strategy to localStorage', async () => {
      await planner.setStrategy('hybrid');
      
      const saved = localStorage.getItem('meal-prep-settings');
      const settings = JSON.parse(saved!);
      expect(settings.strategy).toBe('hybrid');
    });
  });

  describe('prep day management', () => {
    it('should set prep day', async () => {
      await planner.setPrepDay(6); // Saturday
      expect((planner as any).prepDay).toBe(6);
      expect(planner.getSettings().prepDay).toBe(6);
    });

    it('should validate prep day range', async () => {
      await expect(planner.setPrepDay(-1)).rejects.toThrow('Invalid prep day');
      await expect(planner.setPrepDay(7)).rejects.toThrow('Invalid prep day');
    });

    it('should save prep day to localStorage', async () => {
      await planner.setPrepDay(3);
      
      const saved = localStorage.getItem('meal-prep-settings');
      const settings = JSON.parse(saved!);
      expect(settings.prepDay).toBe(3);
    });
  });

  describe('meal plan analysis', () => {
    const mockMealPlan = {
      meals: [
        { day: 'Monday', recipe: 'Spaghetti Bolognese', servings: 4 },
        { day: 'Tuesday', recipe: 'Chicken Salad', servings: 2 },
        { day: 'Wednesday', recipe: 'Vegetable Soup', servings: 6 },
        { day: 'Thursday', recipe: 'Grilled Cheese', servings: 2 },
        { day: 'Friday', recipe: 'Fish Tacos', servings: 4 }
      ]
    };

    const mockRecipes = [
      {
        name: 'Spaghetti Bolognese',
        ingredients: ['pasta', 'ground beef', 'tomato sauce', 'onions', 'garlic'],
        prepTime: 30,
        cookTime: 45,
        batchable: true,
        freezerFriendly: true
      },
      {
        name: 'Chicken Salad',
        ingredients: ['chicken', 'lettuce', 'tomatoes', 'cucumber', 'dressing'],
        prepTime: 20,
        cookTime: 0,
        batchable: false,
        freezerFriendly: false
      },
      {
        name: 'Vegetable Soup',
        ingredients: ['vegetables', 'broth', 'herbs'],
        prepTime: 40,
        cookTime: 60,
        batchable: true,
        freezerFriendly: true
      },
      {
        name: 'Grilled Cheese',
        ingredients: ['bread', 'cheese', 'butter'],
        prepTime: 10,
        cookTime: 10,
        batchable: false,
        freezerFriendly: false
      },
      {
        name: 'Fish Tacos',
        ingredients: ['fish', 'tortillas', 'cabbage', 'salsa'],
        prepTime: 25,
        cookTime: 15,
        batchable: false,
        freezerFriendly: false
      }
    ];

    it('should analyze meal plan for prep opportunities', () => {
      const analysis = planner.analyzeMealPlan(mockMealPlan, mockRecipes);
      
      expect(analysis).toHaveProperty('batchableMeals');
      expect(analysis).toHaveProperty('componentGroups');
      expect(analysis).toHaveProperty('prepSchedule');
      expect(analysis).toHaveProperty('storagePlan');
      
      expect(analysis.batchableMeals).toHaveLength(2); // Spaghetti and Vegetable Soup
    });

    it('should group common ingredients', () => {
      const analysis = planner.analyzeMealPlan(mockMealPlan, mockRecipes);
      
      expect(analysis.componentGroups).toBeDefined();
      expect(analysis.componentGroups.length).toBeGreaterThan(0);
      
      const onionGroup = analysis.componentGroups.find((group: any) => 
        group.ingredient === 'onions'
      );
      expect(onionGroup).toBeDefined();
      expect(onionGroup.recipes).toContain('Spaghetti Bolognese');
    });

    it('should generate prep schedule', () => {
      const analysis = planner.analyzeMealPlan(mockMealPlan, mockRecipes);
      
      expect(analysis.prepSchedule).toBeDefined();
      expect(analysis.prepSchedule.tasks).toBeDefined();
      expect(analysis.prepSchedule.timeline).toBeDefined();
      
      expect(analysis.prepSchedule.tasks.length).toBeGreaterThan(0);
    });

    it('should create storage plan', () => {
      const analysis = planner.analyzeMealPlan(mockMealPlan, mockRecipes);
      
      expect(analysis.storagePlan).toBeDefined();
      expect(analysis.storagePlan.containers).toBeDefined();
      expect(analysis.storagePlan.timeline).toBeDefined();
      
      expect(analysis.storagePlan.containers.length).toBeGreaterThan(0);
    });
  });

  describe('component strategy', () => {
    beforeEach(async () => {
      await planner.setStrategy('component');
    });

    it('should focus on ingredient prep', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Spaghetti', servings: 4 },
          { day: 'Tuesday', recipe: 'Chili', servings: 4 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Spaghetti',
          ingredients: ['pasta', 'tomato sauce', 'ground beef'],
          prepTime: 20,
          cookTime: 30
        },
        {
          name: 'Chili',
          ingredients: ['ground beef', 'beans', 'tomatoes', 'onions'],
          prepTime: 30,
          cookTime: 60
        }
      ];

      const plan = planner.generatePrepPlan(mockMealPlan, mockRecipes);
      
      expect(plan.strategy).toBe('component');
      expect(plan.componentPrep).toBeDefined();
      expect(plan.componentPrep.length).toBeGreaterThan(0);
    });

    it('should optimize ingredient grouping', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Taco Salad', servings: 4 },
          { day: 'Tuesday', recipe: 'Taco Soup', servings: 4 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Taco Salad',
          ingredients: ['ground beef', 'lettuce', 'tomatoes', 'cheese', 'taco seasoning'],
          prepTime: 25,
          cookTime: 15
        },
        {
          name: 'Taco Soup',
          ingredients: ['ground beef', 'beans', 'tomatoes', 'onions', 'taco seasoning'],
          prepTime: 30,
          cookTime: 45
        }
      ];

      const plan = planner.generatePrepPlan(mockMealPlan, mockRecipes);
      
      const groundBeefPrep = plan.componentPrep.find((prep: any) => 
        prep.ingredient === 'ground beef'
      );
      expect(groundBeefPrep).toBeDefined();
      expect(groundBeefPrep.totalQuantity).toBeGreaterThan(0);
    });
  });

  describe('batch meals strategy', () => {
    beforeEach(async () => {
      await planner.setStrategy('batch-meals');
    });

    it('should focus on batch cooking complete meals', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Soup', servings: 4 },
          { day: 'Tuesday', recipe: 'Soup', servings: 4 },
          { day: 'Wednesday', recipe: 'Soup', servings: 4 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Soup',
          ingredients: ['vegetables', 'broth'],
          prepTime: 30,
          cookTime: 60,
          batchable: true,
          freezerFriendly: true
        }
      ];

      const plan = planner.generatePrepPlan(mockMealPlan, mockRecipes);
      
      expect(plan.strategy).toBe('batch-meals');
      expect(plan.batchMeals).toBeDefined();
      expect(plan.batchMeals.length).toBeGreaterThan(0);
    });

    it('should calculate batch quantities', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Chili', servings: 2 },
          { day: 'Tuesday', recipe: 'Chili', servings: 3 },
          { day: 'Wednesday', recipe: 'Chili', servings: 1 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Chili',
          ingredients: ['ground beef', 'beans', 'tomatoes'],
          prepTime: 30,
          cookTime: 90,
          batchable: true,
          freezerFriendly: true
        }
      ];

      const plan = planner.generatePrepPlan(mockMealPlan, mockRecipes);
      
      const chiliBatch = plan.batchMeals.find((batch: any) => batch.recipe === 'Chili');
      expect(chiliBatch).toBeDefined();
      expect(chiliBatch.totalServings).toBe(6);
    });
  });

  describe('hybrid strategy', () => {
    beforeEach(async () => {
      await planner.setStrategy('hybrid');
    });

    it('should combine component and batch approaches', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Soup', servings: 4 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 },
          { day: 'Wednesday', recipe: 'Soup', servings: 4 },
          { day: 'Thursday', recipe: 'Sandwich', servings: 2 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Soup',
          ingredients: ['vegetables', 'broth'],
          prepTime: 30,
          cookTime: 60,
          batchable: true,
          freezerFriendly: true
        },
        {
          name: 'Salad',
          ingredients: ['lettuce', 'tomatoes', 'cucumber'],
          prepTime: 20,
          cookTime: 0,
          batchable: false,
          freezerFriendly: false
        },
        {
          name: 'Sandwich',
          ingredients: ['bread', 'cheese', 'ham'],
          prepTime: 10,
          cookTime: 5,
          batchable: false,
          freezerFriendly: false
        }
      ];

      const plan = planner.generatePrepPlan(mockMealPlan, mockRecipes);
      
      expect(plan.strategy).toBe('hybrid');
      expect(plan.batchMeals).toBeDefined();
      expect(plan.componentPrep).toBeDefined();
      expect(plan.batchMeals.length).toBeGreaterThan(0);
      expect(plan.componentPrep.length).toBeGreaterThan(0);
    });
  });

  describe('storage guidelines', () => {
    it('should provide storage recommendations', () => {
      const guidelines = planner.getStorageGuidelines();
      
      expect(guidelines).toBeDefined();
      expect(guidelines.refrigerator).toBeDefined();
      expect(guidelines.freezer).toBeDefined();
      expect(guidelines.pantry).toBeDefined();
    });

    it('should match STORAGE_GUIDELINES constants', () => {
      const guidelines = planner.getStorageGuidelines();
      
      expect(guidelines.refrigerator.maxDays).toBe(STORAGE_GUIDELINES.refrigerator.maxDays);
      expect(guidelines.freezer.maxDays).toBe(STORAGE_GUIDELINES.freezer.maxDays);
      expect(guidelines.pantry.maxDays).toBe(STORAGE_GUIDELINES.pantry.maxDays);
    });

    it('should calculate storage timeline', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Soup', servings: 4 },
          { day: 'Wednesday', recipe: 'Salad', servings: 2 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Soup',
          ingredients: ['vegetables', 'broth'],
          freezerFriendly: true
        },
        {
          name: 'Salad',
          ingredients: ['lettuce', 'tomatoes'],
          freezerFriendly: false
        }
      ];

      const timeline = planner.calculateStorageTimeline(mockMealPlan, mockRecipes);
      
      expect(timeline).toBeDefined();
      expect(timeline.monday).toBeDefined();
      expect(timeline.wednesday).toBeDefined();
    });
  });

  describe('shopping list generation', () => {
    it('should generate consolidated shopping list', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Spaghetti', servings: 4 },
          { day: 'Tuesday', recipe: 'Chili', servings: 4 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Spaghetti',
          ingredients: ['pasta', 'tomato sauce', 'ground beef'],
          ingredientQuantities: {
            'pasta': '1lb',
            'tomato sauce': '2 cups',
            'ground beef': '1lb'
          }
        },
        {
          name: 'Chili',
          ingredients: ['ground beef', 'beans', 'tomatoes'],
          ingredientQuantities: {
            'ground beef': '1.5lbs',
            'beans': '2 cans',
            'tomatoes': '1 can'
          }
        }
      ];

      const shoppingList = planner.generateShoppingList(mockMealPlan, mockRecipes);
      
      expect(shoppingList).toBeDefined();
      expect(shoppingList.items).toBeDefined();
      expect(shoppingList.categories).toBeDefined();
      
      const groundBeef = shoppingList.items.find((item: any) => item.ingredient === 'ground beef');
      expect(groundBeef).toBeDefined();
      expect(groundBeef.quantity).toBe('2.5lbs');
    });

    it('should categorize shopping list items', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Complete Meal', servings: 4 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Complete Meal',
          ingredients: ['chicken', 'rice', 'broccoli', 'milk', 'flour'],
          ingredientQuantities: {
            'chicken': '2lbs',
            'rice': '2 cups',
            'broccoli': '2 heads',
            'milk': '1 gallon',
            'flour': '2 cups'
          }
        }
      ];

      const shoppingList = planner.generateShoppingList(mockMealPlan, mockRecipes);
      
      expect(shoppingList.categories.produce).toBeDefined();
      expect(shoppingList.categories.protein).toBeDefined();
      expect(shoppingList.categories.dairy).toBeDefined();
      expect(shoppingList.categories.pantry).toBeDefined();
    });
  });

  describe('prep timeline optimization', () => {
    it('should optimize prep order for efficiency', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Long Cook Meal', servings: 4 },
          { day: 'Tuesday', recipe: 'Quick Meal', servings: 2 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Long Cook Meal',
          ingredients: ['beef', 'vegetables'],
          prepTime: 30,
          cookTime: 180
        },
        {
          name: 'Quick Meal',
          ingredients: ['chicken', 'rice'],
          prepTime: 15,
          cookTime: 20
        }
      ];

      const timeline = planner.optimizePrepTimeline(mockMealPlan, mockRecipes);
      
      expect(timeline).toBeDefined();
      expect(timeline.tasks).toBeDefined();
      expect(timeline.totalTime).toBeDefined();
      
      // Long cook meal should be scheduled first
      expect(timeline.tasks[0].recipe).toBe('Long Cook Meal');
    });

    it('should identify parallel prep opportunities', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Roast Chicken', servings: 4 },
          { day: 'Tuesday', recipe: 'Roasted Vegetables', servings: 4 }
        ]
      };

      const mockRecipes = [
        {
          name: 'Roast Chicken',
          ingredients: ['chicken', 'herbs'],
          prepTime: 20,
          cookTime: 90,
          ovenTemp: 375
        },
        {
          name: 'Roasted Vegetables',
          ingredients: ['vegetables', 'olive oil'],
          prepTime: 15,
          cookTime: 45,
          ovenTemp: 375
        }
      ];

      const timeline = planner.optimizePrepTimeline(mockMealPlan, mockRecipes);
      
      expect(timeline.parallelTasks).toBeDefined();
      expect(timeline.parallelTasks.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle empty meal plan', () => {
      const plan = planner.generatePrepPlan({ meals: [] }, []);
      
      expect(plan.strategy).toBeDefined();
      expect(plan.componentPrep).toEqual([]);
      expect(plan.batchMeals).toEqual([]);
    });

    it('should handle missing recipe data', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Unknown Recipe', servings: 4 }
        ]
      };

      expect(() => planner.generatePrepPlan(mockMealPlan, [])).not.toThrow();
    });

    it('should handle invalid serving numbers', () => {
      const mockMealPlan = {
        meals: [
          { day: 'Monday', recipe: 'Recipe', servings: null as any }
        ]
      };

      const mockRecipes = [
        {
          name: 'Recipe',
          ingredients: ['ingredient'],
          prepTime: 10,
          cookTime: 20
        }
      ];

      expect(() => planner.generatePrepPlan(mockMealPlan, mockRecipes)).not.toThrow();
    });
  });
});
