#!/bin/bash

# Script to fix remaining Jest mock syntax errors

echo "Fixing remaining Jest mock syntax errors..."

# Fix specific syntax patterns that are causing comma expected errors
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/\.mockImplementation(() => Promise\.resolve([^)]*),/\.mockImplementation(() => Promise.resolve(\1)),/g' {} \;

# Fix missing closing parentheses in function calls
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/\.mockImplementation(() => Promise\.resolve([^)]*)$/\.mockImplementation(() => Promise.resolve(\1))/g' {} \;

echo "Remaining syntax fixes completed!"
