// @ts-check
import migrationManager, { MigrationManager } from '../../data/migrationManager';

jest.mock('../../data/db', () => ({
  ready: Promise.resolve(),
  get: jest.fn(),
  put: jest.fn().mockResolvedValue(undefined)
}));

import db from '../../data/db';

describe('MigrationManager', () => {
  let versionStore: { [key: string]: any } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    versionStore = {};
    (db.get as jest.Mock).mockImplementation((store: string, key: string) => {
      if (key === 'db-schema-version') {
        return versionStore[key] ? Promise.resolve({ value: versionStore[key] }) : Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
    (db.put as jest.Mock).mockImplementation((store: string, data: any) => {
      if (data.key === 'db-schema-version') {
        versionStore[data.key] = data.value;
      }
      return Promise.resolve();
    });
  });

  describe('constructor', () => {
    it('should register migrations on construction', () => {
      const manager = new MigrationManager();
      expect(manager.migrationsData.size).toBeGreaterThan(0);
    });

    it('should have migration for version 4', () => {
      const manager = new MigrationManager();
      expect(manager.migrationsData.has(4)).toBe(true);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return default version 3 when no version stored', async () => {
      const version = await migrationManager.getCurrentVersion();
      expect(version).toBe(3);
    });

    it('should return stored version', async () => {
      versionStore['db-schema-version'] = 5;
      const version = await migrationManager.getCurrentVersion();
      expect(version).toBe(5);
    });
  });

  describe('setCurrentVersion', () => {
    it('should set version in database', async () => {
      await migrationManager.setCurrentVersion(10);
      expect(versionStore['db-schema-version']).toBe(10);
    });

    it('should call db.put with correct parameters', async () => {
      await migrationManager.setCurrentVersion(10);
      expect(db.put).toHaveBeenCalledWith('meta', {
        key: 'db-schema-version',
        value: 10
      });
    });
  });

  describe('needsMigration', () => {
    it('should return true when current version is less than target', async () => {
      versionStore['db-schema-version'] = 3;
      const needsMigration = await migrationManager.needsMigration(4);
      expect(needsMigration).toBe(true);
    });

    it('should return false when current version equals target', async () => {
      versionStore['db-schema-version'] = 4;
      const needsMigration = await migrationManager.needsMigration(4);
      expect(needsMigration).toBe(false);
    });

    it('should return false when current version is greater than target', async () => {
      versionStore['db-schema-version'] = 5;
      const needsMigration = await migrationManager.needsMigration(4);
      expect(needsMigration).toBe(false);
    });
  });

  describe('migrateTo', () => {
    it('should migrate to target version', async () => {
      versionStore['db-schema-version'] = 3;
      await migrationManager.migrateTo(4);
      expect(versionStore['db-schema-version']).toBe(4);
    });

    it('should not migrate if already at target version', async () => {
      versionStore['db-schema-version'] = 4;
      await migrationManager.migrateTo(4);
      expect(versionStore['db-schema-version']).toBe(4);
    });

    it('should not migrate if past target version', async () => {
      versionStore['db-schema-version'] = 5;
      await migrationManager.migrateTo(4);
      expect(versionStore['db-schema-version']).toBe(5);
    });

    it('should run all necessary migrations', async () => {
      versionStore['db-schema-version'] = 3;
      await migrationManager.migrateTo(5);
      expect(versionStore['db-schema-version']).toBe(5);
    });
  });

  describe('migrateToLatest', () => {
    it('should migrate to latest version', async () => {
      versionStore['db-schema-version'] = 3;
      await migrationManager.migrateToLatest();
      expect(versionStore['db-schema-version']).toBeGreaterThan(3);
    });

    it('should not migrate if already at latest', async () => {
      const manager = new MigrationManager();
      const latestVersion = Math.max(...Array.from(manager.migrationsData.keys()));
      versionStore['db-schema-version'] = latestVersion;
      await migrationManager.migrateToLatest();
      expect(versionStore['db-schema-version']).toBe(latestVersion);
    });
  });

  describe('migration functions', () => {
    it('should have migration function for version 4', () => {
      const manager = new MigrationManager();
      const migration = manager.migrationsData.get(4);
      expect(migration).toBeDefined();
      expect(typeof migration?.up).toBe('function');
      expect(typeof migration?.down).toBe('function');
    });

    it('should execute migration up function', async () => {
      const manager = new MigrationManager();
      const migration = manager.migrationsData.get(4);
      const mockUp = jest.fn();
      if (migration) {
        migration.up = mockUp;
      }
      
      await migrationManager.migrateTo(4);
      
      if (migration) {
        expect(mockUp).toHaveBeenCalled();
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (db.get as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(migrationManager.getCurrentVersion()).rejects.toThrow('Database error');
    });

    it('should handle migration errors gracefully', async () => {
      const manager = new MigrationManager();
      const migration = manager.migrationsData.get(4);
      const mockUp = jest.fn().mockRejectedValue(new Error('Migration error'));
      if (migration) {
        migration.up = mockUp;
      }
      
      await expect(migrationManager.migrateTo(4)).rejects.toThrow('Migration error');
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(migrationManager).toBeInstanceOf(MigrationManager);
    });

    it('should return same instance on multiple imports', () => {
      const migrationManager2 = require('../../data/migrationManager').migrationManager;
      expect(migrationManager).toBe(migrationManager2);
    });
  });
});
