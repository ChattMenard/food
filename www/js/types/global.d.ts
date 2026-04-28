declare module '*.js' {
  const value: any;
  export default value;
}

declare global {
  interface Window {
    dataManager?: any;
    offlineManager?: any;
    _recipesLoaded?: boolean;
    _appInitialized?: boolean;
    renderMealPlan?: any;
    updateMeals?: any;
    updateShoppingList?: any;
    updateTodayNutrition?: any;
    renderNutritionGoals?: any;
    isAIQuery?: boolean;
    IS_DEVELOPMENT?: boolean;
    analytics?: any;
    ANALYTICS_ID?: string;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    errorBoundary?: any;
    Capacitor?: any;
    SENTRY_DSN?: string;
    Sentry?: {
      captureException(error: unknown): void;
    };
  }

  var Capacitor: any;

  interface ImportMeta {
    readonly env?: Record<string, string | undefined> & {
      SENTRY_DSN?: string;
      ANALYTICS_ID?: string;
    };
  }
}

declare module '@capacitor/filesystem' {
  export interface Filesystem {
    readFile(options: { path: string; directory: string }): Promise<{ data: string }>;
  }
  export const Filesystem: Filesystem;
}

declare module '@capacitor/app' {
  export interface AppListenerHandle {
    remove: () => Promise<void> | void;
  }

  export const App: {
    addListener: (eventName: string, listenerFunc: (event: any) => void) => Promise<AppListenerHandle>;
    exitApp: () => void;
  };
}

declare module '@capacitor/share' {
  export interface ShareOptions {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }

  export const Share: {
    share: (options: ShareOptions) => Promise<void>;
  };
}

declare module '@codetrix-studio/capacitor-google-auth' {
  export interface InitializeGoogleAuthOptions {
    clientId: string;
    scopes?: string[];
    grantOfflineAccess?: boolean;
    forceCodeForRefreshToken?: boolean;
  }

  export const GoogleAuth: {
    initialize: (options: InitializeGoogleAuthOptions) => Promise<any>;
    signIn: () => Promise<any>;
    signOut: () => Promise<void>;
    refresh: () => Promise<any>;
  };
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

export {};
