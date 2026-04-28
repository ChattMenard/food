#!/bin/bash

# Optimize wireless debugging performance and stability
echo "🔧 Optimizing wireless debugging configuration..."

# Kill any existing processes on common ports
echo "🔄 Cleaning up existing processes..."
npx kill-port 8080 3000 8081 8100 2>/dev/null || true

# Set Android debug properties for better performance
echo "📱 Configuring Android debug settings..."
adb shell settings put global animator_duration_scale 0.5 2>/dev/null || true
adb shell settings put global transition_animation_scale 0.5 2>/dev/null || true
adb shell settings put global window_animation_scale 0.5 2>/dev/null || true

# Disable Chrome DevTools debugging for better performance
adb shell settings put global webview_debug_mode 0 2>/dev/null || true

# Optimize ADB for wireless debugging
echo "🌐 Optimizing ADB wireless connection..."
adb tcpip 5555 2>/dev/null || true

# Start optimized development server
echo "🚀 Starting optimized development server..."
npm run start &

# Wait a moment for server to start
sleep 3

echo "✅ Debug optimization complete!"
echo ""
echo "📋 Performance tips:"
echo "  - Use 'npm run android' for USB debugging (faster)"
echo "  - Use 'npx cap run android --live-reload --host 0.0.0.0 --port 8080' for wireless"
echo "  - Close Chrome DevTools when not needed"
echo "  - Disable unnecessary browser extensions"
echo ""
echo "🔗 To connect wirelessly:"
echo "  1. Enable USB debugging first"
echo "  2. Run: adb tcpip 5555"
echo "  3. Run: adb connect <device-ip>:5555"
