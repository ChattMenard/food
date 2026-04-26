declare module '*.js' {
  const value: any;
  export default value;
  export function normalizeCuisine(cuisine: string): string;
  export function addImagesToRecipes(recipes: any[]): any[];
  export class SearchIndex {
    constructor(recipes: any[]);
    search(query: string, filters?: any): any[];
    getRecipeById(id: string): any;
    getAllRecipes(): any[];
    addRecipe(recipe: any): void;
    removeRecipe(id: string): void;
    getRecipesByCuisine(cuisine: string): any[];
    getRecipesByIngredient(ingredient: string): any[];
    getRandomRecipes(count: number, filters?: any): any[];
  }
}

declare module '@capacitor/filesystem' {
  export interface Filesystem {
    readFile(options: { path: string; directory: string }): Promise<{ data: string }>;
  }
  export const Filesystem: Filesystem;
}

declare module '../utils/dietFilters.js' {
  export function normalizeCuisine(cuisine: string): string;
}

declare module '../advanced/recipeImages.js' {
  export function addImagesToRecipes(recipes: any[]): any[];
}

declare module '../logic/searchIndex.js' {
  export class SearchIndex {
    constructor(recipes: any[]);
    search(query: string, filters?: any): any[];
    getRecipeById(id: string): any;
    getAllRecipes(): any[];
    addRecipe(recipe: any): void;
    removeRecipe(id: string): void;
    getRecipesByCuisine(cuisine: string): any[];
    getRecipesByIngredient(ingredient: string): any[];
    getRandomRecipes(count: number, filters?: any): any[];
  }
}

declare module '../auth/authManager.js' {
  interface AuthManager {
    loadSession(): Promise<any>;
    signIn(): Promise<any>;
    signOut(): Promise<void>;
  }
  
  const authManager: AuthManager;
  export default authManager;
}

declare module '../data/db.js' {
  interface PantryDB {
    ready: Promise<void>;
    getPantry(): Promise<any[]>;
    getMealPlan(): Promise<any>;
    getPreferences(): Promise<any>;
    get(store: string, key: any): Promise<any>;
    setPantry(pantry: any[]): Promise<void>;
    setMealPlan(mealPlan: any): Promise<void>;
    setPreferences(preferences: any): Promise<void>;
    put(store: string, data: any): Promise<void>;
  }
  
  const db: PantryDB;
  export default db;
}

declare global {
  var Capacitor: any;
  interface Window {
    Capacitor: any;
  }
}
