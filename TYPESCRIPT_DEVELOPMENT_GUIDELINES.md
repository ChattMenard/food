# 📘 TypeScript Development Guidelines

## 🎯 Introduction

This document provides development guidelines for working with the Fridge to Fork codebase after the TypeScript migration. These guidelines ensure consistency, maintainability, and effective use of TypeScript features.

---

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Type Definitions](#type-definitions)
3. [Coding Standards](#coding-standards)
4. [Import/Export Patterns](#importexport-patterns)
5. [Error Handling](#error-handling)
6. [Testing Guidelines](#testing-guidelines)
7. [Best Practices](#best-practices)
8. [Migration Rules](#migration-rules)

---

## 🏗️ Project Structure

### File Organization
```
www/js/
├── types/           # Type definitions
│   ├── index.ts     # Core interfaces
│   └── global.d.ts  # Global types
├── core/            # Core application logic
├── data/            # Data layer
├── logic/           # Business logic
├── features/        # Feature modules
├── utils/           # Utility functions
├── ui/              # UI components
└── __tests__/       # Test files
```

### Naming Conventions
- **Files**: `PascalCase.ts` for classes, `camelCase.ts` for utilities
- **Interfaces**: `PascalCase` with `I` prefix (e.g., `IRecipe`)
- **Types**: `PascalCase` with descriptive names (e.g., `RecipeFilter`)
- **Enums**: `PascalCase` (e.g., `DifficultyLevel`)
- **Constants**: `UPPER_SNAKE_CASE`

---

## 📝 Type Definitions

### Core Interfaces

#### Recipe Interface
```typescript
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string[];
  minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  rating?: number;
  tags?: string[];
  cuisine?: string;
  nutrition?: NutritionData;
  dietary_flags?: DietaryFlags;
}
```

#### Ingredient Interface
```typescript
export interface Ingredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  category?: string;
  cost?: number;
}
```

#### User Preferences Interface
```typescript
export interface UserPreferences {
  people: number;
  diet: DietType;
  diets: string[];
  allergy: AllergyType;
  cuisine: string;
  maxTime: number;
  difficulty: DifficultyType;
  budget?: number;
  favoriteRecipes?: string[];
  dietaryRestrictions?: string[];
  nutritionGoals?: NutritionGoals;
}
```

### Type Aliases
```typescript
export type DietType = 'none' | 'vegetarian' | 'vegan' | 'keto' | 'gluten-free' | 'paleo';
export type AllergyType = 'none' | 'nuts' | 'dairy' | 'gluten' | 'soy' | 'shellfish';
export type DifficultyType = 'any' | 'easy' | 'medium' | 'hard';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
```

### Generic Types
```typescript
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## 📐 Coding Standards

### Function Declarations
```typescript
// ✅ Good: Explicit return types and parameter types
function searchRecipes(query: string, filters?: RecipeFilter): Recipe[] {
  return recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(query.toLowerCase())
  );
}

// ✅ Good: Arrow functions with explicit types
const parseIngredients = (text: string): string[] => {
  return text.split(',').map(s => s.trim()).filter(Boolean);
};

// ❌ Avoid: Implicit any types
function badFunction(query) {
  return query.split(' ');
}
```

### Class Definitions
```typescript
// ✅ Good: Properly typed class
export class RecipeManager {
  private recipes: Recipe[];
  private filters: RecipeFilter;

  constructor(recipes: Recipe[], filters: RecipeFilter = {}) {
    this.recipes = recipes;
    this.filters = filters;
  }

  public findRecipes(query: string): Recipe[] {
    return this.searchRecipes(query);
  }

  private searchRecipes(query: string): Recipe[] {
    // Implementation
    return [];
  }
}
```

### Interface Implementation
```typescript
// ✅ Good: Clear interface implementation
export class DatabaseManager implements IDatabaseManager {
  async saveRecipe(recipe: Recipe): Promise<void> {
    // Implementation
  }

  async getRecipe(id: string): Promise<Recipe | null> {
    // Implementation
    return null;
  }
}
```

---

## 📦 Import/Export Patterns

### Import Statements
```typescript
// ✅ Good: Named imports from modules
import { Recipe, Ingredient, UserPreferences } from '../types/index.js';
import { RecipeManager } from '../logic/recipeManager.js';
import { parseIngredients } from '../utils/ingredientParser.js';

// ✅ Good: Default imports for single exports
import logger from '../utils/logger.js';
import db from '../data/db.js';

// ✅ Good: Namespace imports for utilities
import * as helpers from '../utils/helpers.js';

// ❌ Avoid: Mixed import styles in same file
import Recipe from '../types/recipe.js';
import { Ingredient } from '../types/ingredient.js';
```

### Export Statements
```typescript
// ✅ Good: Named exports
export { RecipeManager, RecipeFilter };
export type { Recipe, Ingredient };

// ✅ Good: Default export for main class
export default class RecipeManager {
  // Implementation
}

// ✅ Good: Export all from barrel file
export * from './recipeManager.js';
export * from './recipeFilter.js';
```

### Path Resolution
```typescript
// ✅ Good: Relative imports with .js extensions
import { Recipe } from '../types/index.js';
import { RecipeManager } from './recipeManager.js';

// ✅ Good: Absolute imports for shared types
import { Recipe } from '@types/index.js';
import { Logger } from '@utils/logger.js';
```

---

## ⚠️ Error Handling

### Type-Safe Error Handling
```typescript
// ✅ Good: Custom error classes
export class RecipeNotFoundError extends Error {
  constructor(id: string) {
    super(`Recipe with id ${id} not found`);
    this.name = 'RecipeNotFoundError';
  }
}

// ✅ Good: Result pattern for operations
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export async function getRecipe(id: string): Promise<Result<Recipe>> {
  try {
    const recipe = await db.getRecipe(id);
    if (!recipe) {
      return { 
        success: false, 
        error: new RecipeNotFoundError(id) 
      };
    }
    return { success: true, data: recipe };
  } catch (error) {
    return { 
      success: false, 
      error: error as Error 
    };
  }
}
```

### Type Guards
```typescript
// ✅ Good: Type guards for runtime checks
export function isRecipe(obj: unknown): obj is Recipe {
  return (
    typeof obj === 'object' && 
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'ingredients' in obj &&
    Array.isArray((obj as Recipe).ingredients)
  );
}

export function isValidIngredient(ing: unknown): ing is Ingredient {
  return (
    typeof ing === 'object' && 
    ing !== null &&
    'name' in (ing as Ingredient)
  );
}
```

---

## 🧪 Testing Guidelines

### Test File Structure
```typescript
// ✅ Good: Proper test file structure
import { RecipeManager } from '../logic/recipeManager.js';
import type { Recipe, RecipeFilter } from '../types/index.js';

describe('RecipeManager', () => {
  let recipeManager: RecipeManager;
  let mockRecipes: Recipe[];

  beforeEach(() => {
    mockRecipes = [
      {
        id: '1',
        name: 'Test Recipe',
        ingredients: [{ id: '1', name: 'Tomato' }],
        instructions: ['Cook tomato'],
        minutes: 30,
        difficulty: 'easy'
      }
    ];
    recipeManager = new RecipeManager(mockRecipes);
  });

  describe('searchRecipes', () => {
    it('should return recipes matching query', () => {
      const results = recipeManager.searchRecipes('test');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Recipe');
    });

    it('should return empty array for no matches', () => {
      const results = recipeManager.searchRecipes('nonexistent');
      expect(results).toHaveLength(0);
    });
  });
});
```

### Mock Types
```typescript
// ✅ Good: Typed mocks
export const mockRecipe: Recipe = {
  id: 'test-1',
  name: 'Test Recipe',
  ingredients: [
    { id: 'ing-1', name: 'Tomato', amount: 2, unit: 'pcs' }
  ],
  instructions: ['Cook ingredients'],
  minutes: 30,
  difficulty: 'easy'
};

export const mockUserPreferences: UserPreferences = {
  people: 2,
  diet: 'none',
  diets: [],
  allergy: 'none',
  cuisine: 'all',
  maxTime: 60,
  difficulty: 'any'
};
```

---

## 🎯 Best Practices

### 1. Type Safety First
```typescript
// ✅ Good: Explicit types
const recipes: Recipe[] = await getRecipes();

// ❌ Avoid: Implicit any
const recipes = await getRecipes();
```

### 2. Use Union Types for Enums
```typescript
// ✅ Good: Union types
type Difficulty = 'easy' | 'medium' | 'hard';

// ❌ Avoid: Magic strings
function getDifficulty(difficulty: string) {
  // No type safety
}
```

### 3. Prefer Interfaces over Types
```typescript
// ✅ Good: Interface for object shapes
export interface Recipe {
  id: string;
  name: string;
}

// ✅ Good: Type for unions or computed types
export type RecipeId = string;
export type RecipeFilter = Partial<Recipe>;
```

### 4. Use Readonly for Immutable Data
```typescript
// ✅ Good: Readonly arrays
const readonlyRecipes: readonly Recipe[] = recipes;

// ✅ Good: Readonly interfaces
export interface ReadonlyRecipe {
  readonly id: string;
  readonly name: string;
  readonly ingredients: readonly Ingredient[];
}
```

### 5. Leverage Utility Types
```typescript
// ✅ Good: Built-in utility types
type PartialRecipe = Partial<Recipe>;
type RecipeWithoutId = Omit<Recipe, 'id'>;
type RecipeWithMetadata = Recipe & { createdAt: Date; };
```

### 6. Use Generics for Reusable Components
```typescript
// ✅ Good: Generic classes
export class Repository<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }
}

// Usage
const recipeRepository = new Repository<Recipe>();
const ingredientRepository = new Repository<Ingredient>();
```

---

## 🔄 Migration Rules

### Converting JavaScript to TypeScript

#### 1. Add Type Annotations
```typescript
// Before (JavaScript)
function searchRecipes(query, filters) {
  return recipes.filter(recipe => 
    recipe.name.includes(query)
  );
}

// After (TypeScript)
function searchRecipes(query: string, filters?: RecipeFilter): Recipe[] {
  return recipes.filter(recipe => 
    recipe.name.includes(query)
  );
}
```

#### 2. Import Types
```typescript
// Before (JavaScript)
import { Recipe } from '../types/index.js';

// After (TypeScript)
import type { Recipe } from '../types/index.js';
```

#### 3. Add Type Guards
```typescript
// Before (JavaScript)
function isValidRecipe(recipe) {
  return recipe && recipe.name && recipe.ingredients;
}

// After (TypeScript)
function isValidRecipe(recipe: unknown): recipe is Recipe {
  return (
    typeof recipe === 'object' && 
    recipe !== null &&
    'name' in recipe &&
    'ingredients' in recipe
  );
}
```

### Progressive Enhancement

#### Phase 1: Basic Types
```typescript
// Add basic type annotations
function addIngredient(name: string): void {
  pantry.push({ id: Date.now().toString(), name });
}
```

#### Phase 2: Interface Definitions
```typescript
// Define interfaces
interface PantryItem {
  id: string;
  name: string;
  added: Date;
}

function addIngredient(name: string): void {
  const item: PantryItem = {
    id: Date.now().toString(),
    name,
    added: new Date()
  };
  pantry.push(item);
}
```

#### Phase 3: Full Type Safety
```typescript
// Add comprehensive typing
class PantryManager {
  private pantry: PantryItem[] = [];

  addIngredient(name: string): PantryItem {
    const item: PantryItem = {
      id: crypto.randomUUID(),
      name,
      added: new Date()
    };
    this.pantry.push(item);
    return item;
  }
}
```

---

## 📚 Additional Resources

### TypeScript Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/prefer-const": "error"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

---

## 🎯 Conclusion

Following these guidelines ensures:
- **Consistency** across the codebase
- **Maintainability** for future development
- **Type safety** throughout the application
- **Developer productivity** with clear patterns

These guidelines will evolve as the project grows and TypeScript best practices emerge. Regular reviews and updates are encouraged.

---

**Last Updated**: April 28, 2026  
**Version**: 1.0  
**Maintainer**: Fridge to Fork Development Team
