#!/bin/bash

# Sync to GitHub (now primary origin)
# Usage: ./sync-remotes.sh

echo "🔄 Syncing to GitHub (primary origin)..."

# Push to GitHub (primary - with Git LFS)
echo "📦 Pushing to GitHub (origin)..."
git push origin --no-verify

if [ $? -eq 0 ]; then
    echo "✅ GitHub push successful"
    echo "🎉 Sync complete!"
else
    echo "❌ GitHub push failed"
    echo "💡 Try: git push origin --no-verify --force"
    exit 1
fi
