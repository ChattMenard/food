#!/bin/bash

# Script to fix Jest mock syntax errors in test files

echo "Fixing Jest mock syntax errors..."

# Fix broken mockImplementation calls that are missing closing parentheses
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/jest\.fn()\.mockImplementation(() => Promise\.resolve(\([^)]*\)),/jest.fn().mockResolvedValue(\1),/g' {} \;

# Fix broken mockImplementation calls without parameters
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/jest\.fn()\.mockImplementation(() => Promise\.resolve()),/jest.fn().mockResolvedValue(),/g' {} \;

echo "Jest mock fixes completed!"
