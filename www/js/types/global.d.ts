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

declare module '@capgo/capacitor-social-login' {
  export interface GoogleAuthOptions {
    webClientId: string;
    iOSClientId?: string;
    mode?: 'online' | 'offline';
  }

  export interface InitializeOptions {
    google?: GoogleAuthOptions;
  }

  export interface LoginOptions {
    scopes?: string[];
    forceRefreshToken?: boolean;
  }

  export interface LoginRequest {
    provider: 'google' | 'facebook' | 'apple' | string;
    options?: LoginOptions;
  }

  export const SocialLogin: {
    initialize: (options: InitializeOptions) => Promise<void>;
    login: (request: LoginRequest) => Promise<any>;
    logout: () => Promise<void>;
  };
}

declare module '../utils/dietFilters.js' {
  export function normalizeCuisine(cuisine: string): string;
}

declare module '../advanced/recipeImages.js' {
  export function addImagesToRecipes(recipes: any[]): any[];
}


export {};
