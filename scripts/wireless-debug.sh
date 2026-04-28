#!/bin/bash

# Wireless debugging setup script
# This script handles the complete wireless debugging setup

echo "🔧 Setting up wireless debugging..."

# Source environment
source .env.local

# Check if device is connected via USB
if ! adb devices | grep -q "device$"; then
    echo "❌ No device connected via USB!"
    echo "Please connect your device via USB and enable USB debugging."
    exit 1
fi

# Get device IP (handle multiple devices)
echo "📱 Getting device IP..."
# Use the first connected device
DEVICE_ID=$(adb devices | grep "device$" | head -1 | awk '{print $1}')
DEVICE_IP=$(adb -s "$DEVICE_ID" shell ip route | awk '{print $9}' | head -1)

if [ -z "$DEVICE_IP" ]; then
    echo "❌ Could not get device IP address!"
    exit 1
fi

echo "📡 Device IP: $DEVICE_IP"

# Enable TCP mode
echo "🌐 Enabling TCP mode on port 5555..."
adb -s "$DEVICE_ID" tcpip 5555

if [ $? -ne 0 ]; then
    echo "❌ Failed to enable TCP mode!"
    exit 1
fi

# Connect wirelessly
echo "🔗 Connecting to device wirelessly..."
adb connect "$DEVICE_IP:5555"

# Wait for connection to establish
sleep 2

# Verify connection
echo "✅ Verifying wireless connection..."
if adb devices | grep -q "$DEVICE_IP:5555.*device"; then
    echo "✅ Wireless connection successful!"
    echo ""
    echo "🚀 Starting app with live reload..."
    
    # Start development server in background
    npm run start &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Run app with live reload (use wireless device)
    npx cap run android --live-reload --host 0.0.0.0 --port 8080 --forwardPorts 8080
    
    # Clean up
    kill $SERVER_PID 2>/dev/null || true
    
else
    echo "❌ Wireless connection verification failed!"
    echo "🔄 Retrying with USB connection..."
    
    # Fallback to USB
    npx cap run android --live-reload --host 0.0.0.0 --port 8080 --forwardPorts 8080
fi

echo "✅ Wireless debugging complete!"
