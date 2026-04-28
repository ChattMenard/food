export interface RecipeIngredient {
  name: string;
  quantity?: number | string;
  unit?: string;
  group?: string;
  preparation?: string;
}

export interface RecipeReview {
  id?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  author?: string;
}

export interface RecipeNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  [key: string]: number | undefined;
}

export interface RecipeSchema {
  id?: string;
  name: string;
  description?: string;
  cuisine?: string;
  dietary?: string[];
  ingredients: Array<string | RecipeIngredient>;
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  time?: number;
  servings?: number;
  status?: string;
  submittedAt?: string;
  likes?: number;
  saves?: number;
  reviews?: RecipeReview[];
  rating?: number;
  image?: string;
  nutrition?: RecipeNutrition;
  [key: string]: unknown;
}

export interface PantryItem {
  id?: string;
  name: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string;
  purchaseDate?: string;
  lastUsedDate?: string;
  category?: string;
  storageLocation?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface CostEntry {
  name: string;
  cost: number;
  unit: string;
  updatedAt: string;
  source?: string;
}

export interface MealPrepRecipe extends RecipeSchema {
  scaledServings: number;
  scalingFactor: number;
  prepDate?: string;
  useByDate?: string;
}

export interface PrepTask {
  recipe?: string;
  task: string;
  duration: number;
  parallel?: boolean;
}

export interface PrepScheduleBlock {
  time: string;
  duration: number;
  tasks: PrepTask[];
  group: string;
}

export interface StoragePlan {
  refrigerator: {
    containers: number;
    space: string;
    days: number;
  };
  freezer: {
    containers: number;
    space: string;
  };
  equipment: Record<string, number>;
}

export interface ShoppingListEntry {
  name: string;
  quantity: number;
  unit: string;
  forRecipes: string[];
}

export interface RecipePlan {
  strategy: string;
  strategyDetails: Record<string, unknown>;
  prepDate: string;
  recipes: MealPrepRecipe[];
  schedule: PrepScheduleBlock[];
  storage: StoragePlan;
  shoppingList: ShoppingListEntry[];
  totalPrepTime: number;
  equipmentNeeded: string[];
  tips: string[];
}
