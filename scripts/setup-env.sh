#!/bin/bash

# Environment Setup Script
# This script sets up proper environment variables for development

echo "🔧 Setting up development environment..."

# Check if .env.local exists, if not create from example
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local - please edit it with your actual values"
else
    echo "✅ .env.local already exists"
fi

# Auto-detect Android SDK path
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Android/Sdk" ]; then
        echo "📱 Found Android SDK at $HOME/Android/Sdk"
        echo "export ANDROID_HOME=$HOME/Android/Sdk" >> .env.local
    elif [ -d "$HOME/Library/Android/sdk" ]; then
        echo "📱 Found Android SDK at $HOME/Library/Android/sdk"
        echo "export ANDROID_HOME=$HOME/Library/Android/sdk" >> .env.local
    else
        echo "⚠️  Android SDK not found in standard locations"
        echo "Please set ANDROID_HOME manually in .env.local"
    fi
fi

# Auto-detect Java/JDK
if [ -z "$JAVA_HOME" ]; then
    if command -v java >/dev/null 2>&1; then
        JAVA_PATH=$(which java)
        JDK_PATH=$(dirname $(dirname $JAVA_PATH))
        echo "☕ Found JDK at $JDK_PATH"
        echo "export JAVA_HOME=$JDK_PATH" >> .env.local
    else
        echo "⚠️  Java not found in PATH"
        echo "Please set JAVA_HOME manually in .env.local"
    fi
fi

echo ""
echo "🎯 Next steps:"
echo "1. Edit .env.local with your actual configuration values"
echo "2. Source the environment: source .env.local"
echo "3. Run: npm run android:debug"
echo ""
echo "📋 For production deployment:"
echo "- Deploy the AI proxy: gcloud functions deploy aiProxy --set-env-vars GEMINI_API_KEY=\$YOUR_KEY"
echo "- Set VITE_AI_PROXY_URL in your production environment"
