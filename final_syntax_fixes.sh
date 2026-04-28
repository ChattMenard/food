#!/bin/bash

# Script to fix remaining syntax errors in test files

echo "Fixing remaining syntax errors..."

# Fix missing closing parentheses in Jest mocks
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/mockImplementation(() => Promise\.resolve(\([^)]*\)}/mockImplementation(() => Promise.resolve(\1))/g' {} \;

# Fix missing commas in Jest mock objects
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/})$/}),/g' {} \;

# Fix specific patterns that are causing syntax errors
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/mockImplementation(() => Promise\.resolve()),/mockResolvedValue(),/g' {} \;

echo "Final syntax fixes completed!"
