# Dependency Manifest

## NPM Packages (package.json)

### Core Dependencies
```json
{
  "dependencies": {
    "@capacitor/android": "^7.2.0",
    "@capacitor/core": "^7.2.0",
    "@capacitor/ios": "^7.2.0",
    "@capacitor/filesystem": "^1.1.0",
    "@capacitor-community/speech-recognition": "^7.0.0",
    "@capacitor/camera": "^7.0.0",
    "@capacitor/share": "^7.0.0",
    "@capacitor/push-notifications": "^7.0.0",
    "@capacitor/local-notifications": "^7.0.0",
    "@codetrix-studio/capacitor-google-auth": "^3.4.0-rc.0",
    "fuse.js": "^7.0.0",
    "idb": "^8.0.0",
    "comlink": "^4.4.1"
  },
  "devDependencies": {
    "webpack": "^5.90.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "postcss-loader": "^8.1.0",
    "css-loader": "^6.10.0",
    "style-loader": "^3.3.4",
    "html-webpack-plugin": "^5.6.0",
    "copy-webpack-plugin": "^12.0.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### Installation Command
```bash
npm install --legacy-peer-deps
```

**Note:** `--legacy-peer-deps` is required because some Capacitor plugins have peer dependency conflicts.

## Android Dependencies

### build.gradle (Project level)
```gradle
plugins {
    id 'com.android.application' version '8.8.0' apply false
    id 'com.android.library' version '8.8.0' apply false
}
```

### build.gradle (App level)
```gradle
android {
    compileSdk 36
    defaultConfig {
        minSdk 26
        targetSdk 36
    }
}

dependencies {
    implementation project(':capacitor-android')
    implementation project(':capacitor-filesystem')
    implementation project(':capacitor-community-speech-recognition')
    // ... other capacitor plugins
}
```

### Required Permissions (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## System Requirements

### Development Environment
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Java**: OpenJDK 17
- **Android SDK**: API 26-36
- **Android Gradle Plugin**: 8.8.0

### Environment Variables
```bash
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

## Python Scripts (Data Processing)

### Required Python Packages
```bash
pip install pandas numpy
```

### Scripts in /scripts/
- `validate_recipes.py` - Validates recipe data quality
- `validate_kaggle_recipes.py` - Validates Kaggle dataset
- `merge_kaggle_recipes.py` - Merges multiple datasets
- `convert_csv_to_json.py` - Converts CSV to app format

## Verification

After installation, verify with:
```bash
# Check Node
node --version  # v18.x

# Check Android SDK
adb --version

# Check Java
java -version  # OpenJDK 17

# Check Capacitor
npx cap --version  # 7.x
```
