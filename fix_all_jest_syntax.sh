#!/bin/bash

# Script to fix all remaining Jest mock syntax errors

echo "Fixing all remaining Jest mock syntax errors..."

# Fix missing closing parentheses in dataManager.test.ts
sed -i 's/\.mockImplementation(() => Promise\.resolve(\[[^]]*\]) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/dataManager.test.ts
sed -i 's/\.mockImplementation(() => Promise\.resolve({[^}]*}) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/dataManager.test.ts

# Fix missing closing parentheses in other test files
sed -i 's/\.mockImplementation(() => Promise\.resolve({[^}]*}) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/features/plan/mealPlanSharing.test.ts
sed -i 's/\.mockImplementation(() => Promise\.resolve({[^}]*}) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/features/plan/mealPlanTemplates.test.ts
sed -i 's/\.mockImplementation(() => Promise\.resolve({[^}]*}) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/integration.offline-sync.test.ts
sed -i 's/\.mockImplementation(() => Promise\.resolve({[^}]*}) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/mealPrepPlanner.test.ts
sed -i 's/\.mockImplementation(() => Promise\.resolve({[^}]*}) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/networkRetry.test.ts
sed -i 's/\.mockImplementation(() => Promise\.resolve({[^}]*}) })/\.mockImplementation(() => Promise.resolve(\1)))/g' www/js/__tests__/recipeImages.test.ts

echo "All Jest syntax fixes completed!"
