#!/bin/bash

# Script to fix unterminated string literal issues in test files

echo "Fixing unterminated string literals..."

# Fix import statements with missing closing quotes
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/from '\([^']*\)\.js'/from '\1'/g" {} \;

# Fix jest.mock statements with .ts extensions and missing quotes
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/jest\.mock('\([^']*\)\.ts,/jest.mock('\1',/g" {} \;
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/jest\.mock('\([^']*\)\.js,/jest.mock('\1',/g" {} \;

# Fix import statements that end with .js" instead of '
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/from '\([^']*\)\.js\"/from '\1'/g" {} \;

# Fix require statements with similar issues
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/require('\([^']*\)\.ts,/require('\1',/g" {} \;
find www/js/__tests__ -name "*.ts" -type f -exec sed -i "s/require('\([^']*\)\.js,/require('\1',/g" {} \;

echo "String literal fixes completed!"
