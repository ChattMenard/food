#!/bin/bash

# Script to systematically fix TypeScript compilation errors

echo "Fixing TypeScript compilation errors..."

# Fix common Jest mock issues across test files
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/jest\.fn()\.mockResolvedValue(/jest\.fn().mockImplementation(() => Promise.resolve(/g' {} \;

# Fix import statements in TypeScript files to remove .js extensions
find www/js -name "*.ts" -type f -exec sed -i 's/from '\''\([^'\'']*\)\.js'\''/from '\''\1'\''/g' {} \;

# Fix class property declarations by adding proper TypeScript types
# This will need manual intervention for complex cases

echo "TypeScript error fixes completed!"
