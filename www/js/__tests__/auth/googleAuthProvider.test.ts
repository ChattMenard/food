// @ts-check
import { initializeGoogleAuth, signInWithGoogle, signOutFromGoogle, refreshGoogleSession } from '../../auth/googleAuthProvider.js;

jest.mock('@codetrix-studio/capacitor-google-auth', () => ({
  GoogleAuth: {
    initialize: jest.fn().mockResolvedValue({ success: true }),
    signIn: jest.fn().mockResolvedValue({ name: 'Test User', email: 'test@example.com', id: 'google-123' }),
    signOut: jest.fn().mockResolvedValue(),
    refresh: jest.fn().mockResolvedValue({ token: 'new-token' })
  }
}));

describe('GoogleAuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeGoogleAuth', () => {
    it('should initialize Google Auth with options', async () => {
      const options = { clientId: 'test-client-id', scope: 'email profile' };
      const result = await initializeGoogleAuth(options);
      expect(result).toEqual({ success: true });
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with Google and return user info', async () => {
      const user = await signInWithGoogle();
      expect(user).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        id: 'google-123'
      });
    });
  });

  describe('signOutFromGoogle', () => {
    it('should sign out from Google', async () => {
      await signOutFromGoogle();
      // Should not throw
    });
  });

  describe('refreshGoogleSession', () => {
    it('should refresh Google session and return token', async () => {
      const result = await refreshGoogleSession();
      expect(result).toEqual({ token: 'new-token' });
    });
  });
});
