import { SocialLogin } from '@capgo/capacitor-social-login';

export interface SignInResult {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  imageUrl?: string;
  idToken?: string;
  authentication?: Record<string, unknown>;
}

export interface InitializeGoogleAuthOptions {
  clientId: string;
  iOSClientId?: string;
  scopes?: string[];
  grantOfflineAccess?: boolean;
}

function getSocialLogin(): typeof SocialLogin {
  return SocialLogin;
}

export async function initializeGoogleAuth(options: InitializeGoogleAuthOptions): Promise<void> {
  await getSocialLogin().initialize({
    google: {
      webClientId: options.clientId,
      iOSClientId: options.iOSClientId,
      mode: options.grantOfflineAccess ? 'offline' : 'online',
    }
  });
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const result = await getSocialLogin().login({
    provider: 'google',
    options: {
      scopes: ['email', 'profile'],
    }
  });
  return {
    id: result?.id || result?.idToken || '',
    email: result?.email || '',
    name: result?.name,
    givenName: result?.givenName,
    familyName: result?.familyName,
    imageUrl: result?.imageUrl,
    idToken: result?.idToken,
    authentication: result?.authentication,
  };
}

export async function signOutFromGoogle(): Promise<void> {
  await getSocialLogin().logout();
}

export async function refreshGoogleSession(): Promise<any> {
  const result = await getSocialLogin().login({
    provider: 'google',
    options: {
      scopes: ['email', 'profile'],
      forceRefreshToken: true,
    }
  });
  return {
    token: result?.token,
    idToken: result?.idToken,
    authentication: result?.authentication,
  };
}
