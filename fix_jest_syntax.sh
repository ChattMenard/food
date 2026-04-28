#!/bin/bash

# Script to fix Jest mock syntax errors in test files

echo "Fixing Jest mock syntax errors..."

# Fix missing closing parentheses in mockImplementation calls
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/\.mockImplementation(() => Promise\.resolve()$/\.mockImplementation(() => Promise.resolve())/g' {} \;

# Fix missing closing parentheses in mockResolvedValue calls  
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/\.mockResolvedValue({[^}]*})$/&)/g' {} \;

# Fix double closing parentheses
find www/js/__tests__ -name "*.ts" -type f -exec sed -i 's/)))/))/g' {} \;

echo "Jest syntax fixes completed!"
