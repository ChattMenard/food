/**
 * Migration Manager
 * Handles schema evolution without data loss
 * Provides rollback capabilities for failed migrations
 */

import db from './db.js';

const MIGRATION_KEY = 'db-schema-version';

class MigrationManager {
  constructor() {
    this.migrations = new Map();
    this.registerMigrations();
  }

  /**
   * Register all known migrations
   */
  registerMigrations() {
    // v3 -> v4: Add queuedMutations store
    this.migrations.set(4, async () => {
      console.log('[Migration] v3 -> v4: Adding queuedMutations store');
      // Store is created automatically in onupgradeneeded
      return { success: true };
    });

    // Future migrations go here
    // this.migrations.set(5, async () => { ... });
  }

  /**
   * Get current schema version from preferences
   */
  async getCurrentVersion() {
    await db.ready;
    const record = await db.get('preferences', MIGRATION_KEY);
    return record ? parseInt(record.value, 10) : 3; // Default to v3 (pre-mutation)
  }

  /**
   * Set current schema version
   */
  async setCurrentVersion(version) {
    await db.put('preferences', {
      key: MIGRATION_KEY,
      value: version.toString(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = Math.max(...this.migrations.keys());

    if (currentVersion >= targetVersion) {
      console.log('[Migration] Up to date (v' + currentVersion + ')');
      return { migrated: false, from: currentVersion, to: currentVersion };
    }

    console.log(
      '[Migration] Starting: v' + currentVersion + ' -> v' + targetVersion
    );

    const results = [];

    for (
      let version = currentVersion + 1;
      version <= targetVersion;
      version++
    ) {
      const migration = this.migrations.get(version);

      if (!migration) {
        console.warn('[Migration] No migration found for v' + version);
        continue;
      }

      try {
        const result = await migration();
        results.push({ version, ...result });

        if (result.success) {
          await this.setCurrentVersion(version);
          console.log('[Migration] v' + version + ' completed');
        } else {
          console.error('[Migration] v' + version + ' failed:', result.error);
          break; // Stop on failure
        }
      } catch (error) {
        console.error('[Migration] v' + version + ' error:', error);
        results.push({ version, success: false, error: error.message });
        break;
      }
    }

    const finalVersion = await this.getCurrentVersion();
    const allSuccessful = results.every((r) => r.success);

    return {
      migrated: allSuccessful,
      from: currentVersion,
      to: finalVersion,
      results,
    };
  }

  /**
   * Rollback to previous version (destructive - use carefully)
   */
  async rollback(targetVersion) {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      return {
        success: false,
        error: 'Target version must be lower than current',
      };
    }

    console.log(
      '[Migration] Rolling back: v' + currentVersion + ' -> v' + targetVersion
    );

    // Note: Actual rollback logic depends on what changed in each version
    // This is a placeholder - implement specific rollbacks as needed

    await this.setCurrentVersion(targetVersion);

    return { success: true, from: currentVersion, to: targetVersion };
  }

  /**
   * Get migration status
   */
  async getStatus() {
    const current = await this.getCurrentVersion();
    const available = Math.max(...this.migrations.keys());

    return {
      currentVersion: current,
      availableVersion: available,
      pending: available - current,
      migrations: Array.from(this.migrations.keys()),
    };
  }
}

const migrationManager = new MigrationManager();
export default migrationManager;
export { MigrationManager };
