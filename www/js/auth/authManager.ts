// @ts-check
/**
 * Authentication Manager
 * Handles Google Sign-In and user session management
 */

import {
  initializeGoogleAuth,
  signInWithGoogle,
  signOutFromGoogle,
  refreshGoogleSession,
} from './googleAuthProvider.js';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  photoUrl?: string;
  idToken?: string;
  authentication?: Record<string, unknown>;
}

class AuthManager {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  listeners: Array<(user: AuthUser | null) => void>;
  initialized: boolean;

  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.listeners = [];
    this.initialized = false;
  }

  /**
   * Initialize Google Sign-In
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Google Auth
      await initializeGoogleAuth({
        clientId:
          '593330232333-ibpbcc7qme63ku7a3e67i2dg33n9f1en.apps.googleusercontent.com',
        scopes: ['email', 'profile'],
        grantOfflineAccess: true,
      });

      this.initialized = true;
      console.log('[AuthManager] Initialized');
    } catch (error) {
      console.error('[AuthManager] Initialization failed:', error);
    }
  }

  /**
   * Sign in with Google
   * @returns {Promise<AuthUser>} User object with id, email, name, photoUrl
   */
  async signIn(): Promise<AuthUser> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const result = await signInWithGoogle();

      this.currentUser = {
        id: result.id,
        email: result.email,
        name: result.name,
        givenName: result.givenName,
        familyName: result.familyName,
        photoUrl: result.imageUrl,
        idToken: result.idToken,
        authentication: result.authentication,
      };

      this.isAuthenticated = true;
      await this.saveSession();

      console.log('[AuthManager] Signed in:', this.currentUser?.email);
      if (this.currentUser) {
        this.notifyListeners('signIn', this.currentUser);
      }
      return this.currentUser;
    } catch (error) {
      console.error('[AuthManager] Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await signOutFromGoogle();

      this.currentUser = null;
      this.isAuthenticated = false;
      await this.clearSession();

      console.log('[AuthManager] Signed out');
      this.notifyListeners('signOut', null);

    } catch (error) {
      console.error('[AuthManager] Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Refresh the current session
   */
  async refresh(): Promise<AuthUser> {
    try {
      const result = await refreshGoogleSession();

      if (this.currentUser) {
        this.currentUser.idToken = result.idToken || '';
        this.currentUser.authentication = result.authentication;
        await this.saveSession();
      }

      console.log('[AuthManager] Session refreshed');
      return this.currentUser as AuthUser;
    } catch (error) {
      console.error('[AuthManager] Refresh failed:', error);
      // If refresh fails, sign out
      await this.signOut();
      throw error;
    }
  }

  /**
   * Get the current user
   * @returns {AuthUser|null} Current user object or null
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuth() {
    return this.isAuthenticated;
  }

  /**
   * Save session to storage
   */
  async saveSession() {
    if (this.currentUser) {
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      localStorage.setItem('auth_timestamp', Date.now().toString());
    }
  }

  /**
   * Load session from storage
   */
  async loadSession(): Promise<AuthUser | null> {
    try {
      const userJson = localStorage.getItem('auth_user');
      const timestamp = localStorage.getItem('auth_timestamp');

      if (userJson && timestamp) {
        // Check if session is less than 1 hour old
        const sessionAge = Date.now() - parseInt(timestamp, 10);
        if (sessionAge < 3600000) {
          this.currentUser = JSON.parse(userJson) as AuthUser;
          this.isAuthenticated = true;
          console.log('[AuthManager] Session loaded');
          return this.currentUser;
        } else {
          // Session expired
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('[AuthManager] Failed to load session:', error);
      await this.clearSession();
    }
    return null;
  }

  /**
   * Clear session from storage
   */
  async clearSession() {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_timestamp');
  }

  /**
   * Subscribe to auth events
   * @param {Function} callback - Callback function for auth events
   */
  subscribe(callback: (user: any) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Unsubscribe from auth events
   * @param {Function} callback - Callback function to remove
   */
  unsubscribe(callback: (user: any) => void): void {
    this.listeners = this.listeners.filter((listener) => listener !== callback);
  }

  /**
   * Notify all listeners of auth events
   * @param {string} event - Event type ('signIn', 'signOut')
   * @param {Object} data - Event data
   */
  notifyListeners(event: string, data: any): void {
    this.listeners.forEach((callback) => callback(data));
  }
}

// Export singleton instance
const authManager = new AuthManager();
export default authManager;
