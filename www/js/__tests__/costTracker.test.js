import { CostTracker } from '../logic/costTracker.js';

describe('CostTracker', () => {
    let costTracker;

    beforeEach(() => {
        costTracker = new CostTracker();
    });

    describe('constructor', () => {
        it('should initialize with empty cost database', () => {
            expect(costTracker.costDatabase.size).toBe(0);
        });

        it('should initialize with zero budget', () => {
            expect(costTracker.budget).toBe(0);
        });

        it('should initialize with zero spent this month', () => {
            expect(costTracker.spentThisMonth).toBe(0);
        });
    });

    describe('setBudget', () => {
        it('should set monthly budget', () => {
            costTracker.setBudget(500);
            expect(costTracker.budget).toBe(500);
        });
    });

    describe('addCost', () => {
        it('should add cost to database', () => {
            costTracker.addCost('tomatoes', 2.50, 'lb');
            expect(costTracker.getCost('tomatoes')).toBe(2.50);
        });

        it('should handle lowercase ingredient names', () => {
            costTracker.addCost('Tomatoes', 2.50, 'lb');
            expect(costTracker.getCost('tomatoes')).toBe(2.50);
        });

        it('should update existing cost', () => {
            costTracker.addCost('eggs', 3.00, 'dozen');
            costTracker.addCost('eggs', 4.00, 'dozen');
            expect(costTracker.getCost('eggs')).toBe(4.00);
        });
    });

    describe('getCost', () => {
        it('should return null for unknown ingredient', () => {
            expect(costTracker.getCost('unknown')).toBeNull();
        });

        it('should return cost for known ingredient', () => {
            costTracker.addCost('milk', 3.50, 'gallon');
            expect(costTracker.getCost('milk')).toBe(3.50);
        });
    });

    describe('calculateShoppingListCost', () => {
        beforeEach(() => {
            costTracker.addCost('eggs', 3.00, 'dozen');
            costTracker.addCost('milk', 4.00, 'gallon');
            costTracker.addCost('bread', 2.50, 'loaf');
        });

        it('should calculate total cost', () => {
            const shoppingList = [
                { name: 'eggs', quantity: 1 },
                { name: 'milk', quantity: 1 }
            ];
            const result = costTracker.calculateShoppingListCost(shoppingList);
            expect(result.totalCost).toBe(7.00);
        });

        it('should calculate with quantity', () => {
            const shoppingList = [
                { name: 'eggs', quantity: 2 }
            ];
            const result = costTracker.calculateShoppingListCost(shoppingList);
            expect(result.totalCost).toBe(6.00);
        });

        it('should handle unknown costs', () => {
            const shoppingList = [
                { name: 'eggs', quantity: 1 },
                { name: 'unknown', quantity: 1 }
            ];
            const result = costTracker.calculateShoppingListCost(shoppingList);
            expect(result.unknownCosts).toContain('unknown');
        });

        it('should calculate known percentage', () => {
            const shoppingList = [
                { name: 'eggs', quantity: 1 },
                { name: 'unknown', quantity: 1 }
            ];
            const result = costTracker.calculateShoppingListCost(shoppingList);
            expect(result.knownPercentage).toBe(50);
        });
    });

    describe('estimateCost', () => {
        it('should estimate cost by category', () => {
            const item = { category: 'vegetables', quantity: 2 };
            const cost = costTracker.estimateCost(item);
            expect(cost).toBe(5.00);
        });

        it('should use default category for unknown', () => {
            const item = { category: 'unknown', quantity: 1 };
            const cost = costTracker.estimateCost(item);
            expect(cost).toBe(3.00);
        });

        it('should handle missing category', () => {
            const item = { quantity: 1 };
            const cost = costTracker.estimateCost(item);
            expect(cost).toBe(3.00);
        });
    });

    describe('calculateMonthlySpending', () => {
        it('should calculate spending for current month', () => {
            const now = new Date();
            const pantryItems = [
                { name: 'milk', purchaseDate: now.toISOString(), cost: 4.00 },
                { name: 'eggs', purchaseDate: now.toISOString(), cost: 3.00 }
            ];
            costTracker.setBudget(500);
            const result = costTracker.calculateMonthlySpending(pantryItems);
            expect(result.totalSpent).toBe(7.00);
            expect(result.remaining).toBe(493.00);
        });

        it('should ignore items from previous months', () => {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const pantryItems = [
                { name: 'milk', purchaseDate: lastMonth.toISOString(), cost: 4.00 }
            ];
            const result = costTracker.calculateMonthlySpending(pantryItems);
            expect(result.totalSpent).toBe(0);
        });

        it('should estimate cost if not provided', () => {
            const now = new Date();
            const pantryItems = [
                { name: 'vegetables', purchaseDate: now.toISOString() }
            ];
            const result = costTracker.calculateMonthlySpending(pantryItems);
            expect(result.totalSpent).toBeGreaterThan(0);
        });
    });

    describe('getOptimizationSuggestions', () => {
        beforeEach(() => {
            costTracker.addCost('eggs', 3.00, 'dozen');
            costTracker.addCost('expensive-item', 10.00, 'lb');
            costTracker.setBudget(100);
        });

        it('should suggest removing duplicates', () => {
            const shoppingList = [{ name: 'eggs', quantity: 1 }];
            const pantry = [{ name: 'eggs' }];
            const suggestions = costTracker.getOptimizationSuggestions(shoppingList, pantry);
            const duplicate = suggestions.find(s => s.type === 'duplicate');
            expect(duplicate).toBeDefined();
            expect(duplicate.priority).toBe('high');
        });

        it('should suggest expensive alternatives', () => {
            const shoppingList = [{ name: 'expensive-item', quantity: 1 }];
            const pantry = [];
            const suggestions = costTracker.getOptimizationSuggestions(shoppingList, pantry);
            const expensive = suggestions.find(s => s.type === 'expensive');
            expect(expensive).toBeDefined();
        });

        it('should warn about budget usage', () => {
            const now = new Date();
            const pantry = [
                { name: 'item', purchaseDate: now.toISOString(), cost: 85.00 }
            ];
            costTracker.calculateMonthlySpending(pantry);
            const suggestions = costTracker.getOptimizationSuggestions([], pantry);
            const warning = suggestions.find(s => s.type === 'budget-warning');
            expect(warning).toBeDefined();
            expect(warning.priority).toBe('urgent');
        });
    });

    describe('trackSavings', () => {
        it('should track cost savings', async () => {
            const initialSavings = await costTracker.getTotalSavings();
            await costTracker.trackSavings(5.00);
            expect(await costTracker.getTotalSavings()).toBe(initialSavings + 5.00);
        });

        it('should accumulate savings', async () => {
            const initialSavings = await costTracker.getTotalSavings();
            await costTracker.trackSavings(5.00);
            await costTracker.trackSavings(3.00);
            expect(await costTracker.getTotalSavings()).toBe(initialSavings + 8.00);
        });
    });

    describe('generateReport', () => {
        it('should generate comprehensive report', () => {
            costTracker.addCost('eggs', 3.00, 'dozen');
            const shoppingList = [{ name: 'eggs', quantity: 1 }];
            const pantry = [];
            const report = costTracker.generateReport(shoppingList, pantry);
            
            expect(report.date).toBeDefined();
            expect(report.shoppingList).toBeDefined();
            expect(report.monthlySpending).toBeDefined();
            expect(report.summary).toBeDefined();
        });
    });
});
