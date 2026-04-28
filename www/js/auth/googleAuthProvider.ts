import { GoogleAuth, InitializeGoogleAuthOptions } from '@codetrix-studio/capacitor-google-auth';

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

export interface RefreshResult {
  token?: string;
  idToken?: string;
  authentication?: Record<string, unknown>;
}

function getGoogleAuth(): typeof GoogleAuth {
  if (!GoogleAuth) {
    throw new Error('GoogleAuth plugin is not available');
  }
  return GoogleAuth;
}

export async function initializeGoogleAuth(options: InitializeGoogleAuthOptions): Promise<any> {
  return getGoogleAuth().initialize(options);
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const result = await getGoogleAuth().signIn();
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
  await getGoogleAuth().signOut();
}

export async function refreshGoogleSession(): Promise<RefreshResult> {
  const result = await getGoogleAuth().refresh();
  return {
    token: result?.token,
    idToken: result?.idToken,
    authentication: result?.authentication,
  };
}
