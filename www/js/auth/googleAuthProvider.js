// @ts-check
/**
 * Google Auth provider
 * Isolates the native/web plugin behind a lazy-loaded adapter.
 */

let googleAuthPlugin;

async function getGoogleAuthPlugin() {
  if (!googleAuthPlugin) {
    const module = await import('@codetrix-studio/capacitor-google-auth');
    googleAuthPlugin = module.GoogleAuth;
  }

  return googleAuthPlugin;
}

export async function initializeGoogleAuth(options) {
  const googleAuth = await getGoogleAuthPlugin();
  return googleAuth.initialize(options);
}

export async function signInWithGoogle() {
  const googleAuth = await getGoogleAuthPlugin();
  return googleAuth.signIn();
}

export async function signOutFromGoogle() {
  const googleAuth = await getGoogleAuthPlugin();
  return googleAuth.signOut();
}

export async function refreshGoogleSession() {
  const googleAuth = await getGoogleAuthPlugin();
  return googleAuth.refresh();
}
