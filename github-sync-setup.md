# GitHub Sync Setup

## Problem
GitHub has a 100MB file size limit, while GitLab allows larger files. The repository contains large data files that exceed GitHub's limits.

## Solution Strategy
1. **Keep GitLab as primary** (full repository with large files)
2. **GitHub as code-only mirror** (source code only, no large data files)

## Implementation Steps

### Step 1: Create a GitHub-only branch without large files
```bash
# Create a clean branch for GitHub
git checkout -b github-clean

# Remove large files from this branch only
git rm --cached scripts/*.csv scripts/*.json www/data/recipes*.json
git commit -m "Remove large files for GitHub compatibility"

# Push to GitHub
git push github github-clean --no-verify
```

### Step 2: Set up automatic sync script
```bash
# Use the sync-remotes.sh script
./sync-remotes.sh
```

### Step 3: Git workflow
- **Main development**: Push to GitLab (origin) - includes everything
- **GitHub mirror**: Push to GitHub (github) - code only
- **Both remotes**: Use `git sync-all` alias

## Current Status
- ✅ GitLab: Full repository with large files (primary)
- ⏳ GitHub: Need to create clean branch
- ✅ Sync script: Ready to use

## Large Files to Exclude from GitHub
- scripts/clean_100k_meals.csv (145.72 MB)
- scripts/clean_100k_validated_filtered.json (131.45 MB)  
- scripts/existing_validated.json (278.72 MB)
- scripts/raw_recipes.csv (280.88 MB)
- www/data/recipes_enhanced_gzip.json.gz (97.51 MB)
