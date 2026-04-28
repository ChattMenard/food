// @ts-check
/**
 * Type declarations for Capacitor plugins
 * These are dynamically imported and may not be available in all environments
 */

declare module '@capacitor/filesystem' {
  export interface FilesystemPlugin {
    readFile(options: { path: string }): Promise<{ data: string }>;
    writeFile(options: { path: string; data: string }): Promise<void>;
    deleteFile(options: { path: string }): Promise<void>;
    readdir(options: { path: string }): Promise<{ files: string[] }>;
    stat(options: { path: string }): Promise<{ type: string; size: number; ctime: number; mtime: number; uri: string }>;
    mkdir(options: { path: string; recursive?: boolean }): Promise<void>;
    rmdir(options: { path: string; recursive?: boolean }): Promise<void>;
    getUri(options: { path: string }): Promise<{ uri: string }>;
  }

  export const Filesystem: FilesystemPlugin;
}

declare module '@capacitor/app' {
  export interface AppPlugin {
    exitApp(): Promise<void>;
    getLaunchUrl(): Promise<{ url: string }>;
    addListener(eventName: 'appUrlOpen', listenerFunc: (event: { url: string }) => void): Promise<any>;
    removeAllListeners(): Promise<void>;
  }

  export const App: AppPlugin;
}

declare module '@capacitor/share' {
  export interface SharePlugin {
    share(options: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<void>;
    canShare(): Promise<{ value: boolean }>;
  }

  export const Share: SharePlugin;
}

declare module '@capacitor/core' {
  export interface Capacitor {
    isPluginAvailable(pluginName: string): boolean;
    isNativePlatform(): boolean;
    getPlatform(): string;
  }

  export const Capacitor: Capacitor;
}

// Global Capacitor access
declare global {
  const Capacitor: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    isPluginAvailable?: (plugin: string) => boolean;
  } | undefined;
}
