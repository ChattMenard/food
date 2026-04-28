#!/bin/bash

# Script to fix common TypeScript import issues in test files

echo "Fixing TypeScript import issues..."

# Fix jest.mock statements with .ts extensions
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/jest\.mock('\([^']*\.ts\)/jest.mock('\1/g" {} \;

# Fix import statements with .js extensions to remove them
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/from '\([^']*\)\.js'/from '\1'/g" {} \;

# Fix require statements with .ts extensions
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/require('\([^']*\.ts\)/require('\1/g" {} \;

# Fix unterminated string literals in jest.mock (missing closing quote)
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/jest\.mock('\([^']*\)\.ts,/jest.mock('\1',/g" {} \;

echo "Import fixes completed!"
