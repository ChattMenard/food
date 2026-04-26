#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
ADB_BIN="${ADB_BIN:-$ANDROID_HOME/platform-tools/adb}"
JAVA_HOME="${JAVA_HOME:-$HOME/Downloads/android-studio/jbr}"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"

if [[ ! -x "$ADB_BIN" ]]; then
  echo "adb not found at $ADB_BIN. Set ADB_BIN or ANDROID_HOME."
  exit 1
fi

npx cap sync android
"$ROOT_DIR/android/gradlew" -p "$ROOT_DIR/android" clean :app:assembleDebug

APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found at $APK_PATH"
  exit 1
fi

DEVICE_LINES="$("$ADB_BIN" devices | awk 'NR>1 && $2=="device" {print $1}')"
if [[ -n "${ADB_SERIAL:-}" ]]; then
  TARGET_DEVICE="$ADB_SERIAL"
else
  TARGET_DEVICE="$(echo "$DEVICE_LINES" | head -n 1)"
fi

if [[ -z "$TARGET_DEVICE" ]]; then
  echo "No Android device or emulator detected."
  echo "Start an emulator or connect a device, then rerun."
  exit 1
fi

DEVICE_COUNT="$(echo "$DEVICE_LINES" | sed '/^$/d' | wc -l | tr -d ' ')"
if [[ -z "${ADB_SERIAL:-}" && "$DEVICE_COUNT" -gt 1 ]]; then
  echo "Multiple devices detected; defaulting to $TARGET_DEVICE. Set ADB_SERIAL to choose a target."
fi

"$ADB_BIN" -s "$TARGET_DEVICE" install -r "$APK_PATH"
"$ADB_BIN" -s "$TARGET_DEVICE" shell am start -n com.main.app/.MainActivity

echo "Launched com.main.app on $TARGET_DEVICE"
