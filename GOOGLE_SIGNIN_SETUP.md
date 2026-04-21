# Google Sign-In Setup Instructions

## Overview
This guide explains how to set up Google Sign-In for the Meal Planner app on web, iOS, and Android platforms.

## Files Created/Modified

1. `package.json` - Added `@codetrix-studio/capacitor-google-auth` dependency
2. `capacitor.config.json` - Added Google Auth plugin configuration
3. `www/js/auth/authManager.js` - Authentication manager for session handling
4. `ios/App/App/Info.plist` - Added Google Sign-In URL scheme
5. `android/app/build.gradle` - Added Google Play Services Auth dependency
6. `android/app/src/main/res/values/strings.xml` - Added server_client_id

## Step 1: Create Google Cloud Console Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing project
3. Enable Google Sign-In API:
   - Navigate to APIs & Services → Library
   - Search for "Google Sign-In API"
   - Click Enable

## Step 2: Create OAuth 2.0 Credentials

### Web Client ID
1. Navigate to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Meal Planner Web"
5. Authorized JavaScript origins:
   - `http://localhost:8080` (development)
   - `https://your-domain.com` (production)
6. Authorized redirect URIs:
   - Leave empty for now (Capacitor handles this)
7. Click "Create"
8. Copy the **Web client ID** (starts with `apps.googleusercontent.com`)

### iOS Client ID
1. Click "Create Credentials" → "OAuth client ID"
2. Application type: "iOS"
3. Name: "Meal Planner iOS"
4. Bundle ID: `com.main.app`
5. Click "Create"
6. Copy the **iOS client ID** and the **URL scheme** (reversed client ID)

### Android Client ID
1. Click "Create Credentials" → "OAuth client ID"
2. Application type: "Android"
3. Name: "Meal Planner Android"
4. Package name: `com.main.app`
5. SHA-1 signing certificate fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
   For release, use your release keystore
6. Click "Create"
7. Copy the **Android client ID**

## Step 3: Update Configuration Files

### capacitor.config.json
Replace `YOUR_WEB_CLIENT_ID` with your actual Web client ID:

```json
{
  "plugins": {
    "GoogleAuth": {
      "scopes": ["email", "profile"],
      "serverClientId": "YOUR_ACTUAL_WEB_CLIENT_ID",
      "forceCodeForRefreshToken": true
    }
  }
}
```

### authManager.js
Replace `YOUR_WEB_CLIENT_ID` with your actual Web client ID:

```javascript
await GoogleAuth.initialize({
  clientId: 'YOUR_ACTUAL_WEB_CLIENT_ID',
  scopes: ['email', 'profile'],
  grantOfflineAccess: true
});
```

### iOS Info.plist
Replace the placeholder values with your iOS credentials:

```xml
<key>CFBundleURLName</key>
<string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string>
<key>CFBundleURLSchemes</key>
<array>
  <string>YOUR_REVERSED_IOS_CLIENT_ID</string>
</array>
```

### Android strings.xml
Replace `YOUR_WEB_CLIENT_ID` with your actual Web client ID:

```xml
<string name="server_client_id">YOUR_ACTUAL_WEB_CLIENT_ID</string>
```

## Step 4: Sync Capacitor

After updating configuration files, sync Capacitor:

```bash
npm run sync
```

## Step 5: iOS Configuration

### Add Google Sign-In SDK (if needed)
The Capacitor plugin should handle this automatically. If you need manual setup:

1. In Xcode, open `Podfile`
2. Add:
   ```ruby
   pod 'GoogleSignIn', '~> 7.0'
   ```
3. Run `pod install`

### Configure AppDelegate
The plugin should handle this automatically. Ensure your `AppDelegate.swift` imports are correct.

## Step 6: Android Configuration

### Add google-services.json (optional)
If you want to use Google Services:

1. Download `google-services.json` from Google Cloud Console
2. Place it in `android/app/`
3. The build.gradle already includes the plugin setup

### Sync Gradle
```bash
cd android
./gradlew clean
cd ..
npm run sync
```

## Step 7: Usage in Your App

### Import the auth manager
```javascript
import authManager from './js/auth/authManager.js';
```

### Initialize on app load
```javascript
await authManager.initialize();
await authManager.loadSession();
```

### Sign in
```javascript
try {
  const user = await authManager.signIn();
  console.log('Signed in:', user.email);
} catch (error) {
  console.error('Sign in failed:', error);
}
```

### Sign out
```javascript
await authManager.signOut();
```

### Check authentication status
```javascript
if (authManager.isAuth()) {
  const user = authManager.getCurrentUser();
  console.log('User:', user.email);
}
```

### Subscribe to auth events
```javascript
authManager.subscribe((event, data) => {
  if (event === 'signIn') {
    console.log('User signed in:', data.email);
  } else if (event === 'signOut') {
    console.log('User signed out');
  }
});
```

## Troubleshooting

**Web: "popup_closed_by_user" error**
- Ensure popup blocker is disabled
- Check that the authorized JavaScript origin matches your domain

**iOS: Sign-in not working**
- Verify the URL scheme in Info.plist matches the iOS client ID
- Ensure the bundle ID matches what you configured in Google Console
- Check that the app is linked to the correct Google Cloud project

**Android: Sign-in not working**
- Verify the SHA-1 fingerprint matches your keystore
- Ensure the package name matches what you configured in Google Console
- Check that `google-services.json` is in the correct location
- Verify the server_client_id in strings.xml matches your Web client ID

**"idtokenissuermismatch" error**
- Ensure you're using the correct client ID for the platform
- Web uses the Web client ID
- iOS uses the iOS client ID
- Android uses the Android client ID
- But all platforms need the Web client ID as the server client ID

**Session not persisting**
- Check localStorage is enabled
- Verify the session timestamp is not expired (1 hour TTL)
- Ensure the auth manager is initialized on app load

## Notes

- The plugin uses `@codetrix-studio/capacitor-google-auth` with `--legacy-peer-deps` due to Capacitor 8.x compatibility
- Session persistence uses localStorage with 1-hour TTL
- Refresh tokens are supported for offline access
- The auth manager provides a singleton instance for easy access

## Security Considerations

- Never commit client IDs to public repositories
- Use environment variables for client IDs in production
- Implement proper backend validation of ID tokens
- Use HTTPS for production domains
- Regularly rotate secrets and credentials

## Next Steps

After setup:
1. Test on web (localhost)
2. Test on iOS simulator/device
3. Test on Android emulator/device
4. Implement backend token validation
5. Add user profile management
6. Integrate with cross-device sync
