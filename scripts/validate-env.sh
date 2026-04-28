#!/bin/bash

# Environment validation script
# This script ensures all environment requirements are met

echo "🔍 Running comprehensive environment validation..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ ERROR: .env.local not found!"
    echo "Please run: npm run setup:env"
    exit 1
fi

# Source the environment
source .env.local

# Validate ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ERROR: ANDROID_HOME not set"
    exit 1
fi

if [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ ERROR: ANDROID_HOME directory not found: $ANDROID_HOME"
    exit 1
fi

# Validate JAVA_HOME
if [ -z "$JAVA_HOME" ]; then
    echo "⚠️  WARNING: JAVA_HOME not set"
else
    if [ ! -d "$JAVA_HOME" ]; then
        echo "⚠️  WARNING: JAVA_HOME directory not found: $JAVA_HOME"
    fi
fi

# Check for required tools
echo "🛠️  Checking required tools..."

# Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ ERROR: Node.js not found"
    exit 1
fi

# npm
if ! command -v npm >/dev/null 2>&1; then
    echo "❌ ERROR: npm not found"
    exit 1
fi

# Android tools
if [ -d "$ANDROID_HOME" ]; then
    if [ ! -f "$ANDROID_HOME/platform-tools/adb" ]; then
        echo "⚠️  WARNING: ADB not found in Android SDK"
    fi
fi

# Security checks
echo "🔒 Running security validation..."

# Check for exposed API keys in source
if grep -r "GEMINI_API_KEY.*[^\"']$" www/js/ 2>/dev/null; then
    echo "❌ ERROR: Exposed API key detected in source code!"
    exit 1
fi

# Check for hardcoded paths
if grep -r "/home/x99/" www/js/ 2>/dev/null; then
    echo "❌ ERROR: Hardcoded absolute paths detected!"
    exit 1
fi

# Validate configuration files
echo "📝 Validating configuration files..."

if [ ! -f "www/js/utils/config.js" ]; then
    echo "❌ ERROR: config.js missing!"
    exit 1
fi

if [ ! -f "capacitor.config.json" ]; then
    echo "❌ ERROR: capacitor.config.json missing!"
    exit 1
fi

# Build validation
echo "🔧 Validating build configuration..."

if ! npm run build:css:once >/dev/null 2>&1; then
    echo "❌ ERROR: CSS build failed!"
    exit 1
fi

# Test validation
echo "🧪 Validating test suite..."

if ! npm test >/dev/null 2>&1; then
    echo "❌ ERROR: Test suite failed!"
    exit 1
fi

echo "✅ All environment validations passed!"
echo ""
echo "🎯 Environment is ready for development!"
echo "   - Security: ✅ No exposed credentials"
echo "   - Portability: ✅ No hardcoded paths"
echo "   - Build: ✅ CSS compilation successful"
echo "   - Tests: ✅ All tests passing"
echo "   - Tools: ✅ Required tools available"

exit 0
