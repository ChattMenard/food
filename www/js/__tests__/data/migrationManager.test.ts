// @ts-check
import migrationManager, { MigrationManager } from '../../data/migrationManager';

jest.mock('../../data/db', () => ({
  ready: Promise.resolve(),
  get: jest.fn().mockImplementation(() => Promise.resolve()),
  put: jest.fn().mockImplementation(() => Promise.resolve())
}));

import db from '../../data/db';

describe('MigrationManager', () => {
  let versionStore = {};

  beforeEach(() => {
    jest.clearAllMocks();
    versionStore = {};
    (db.get as jest.Mock).mockImplementation((store, key) => {
      if (key === 'db-schema-version') {
        return versionStore[key] ? Promise.resolve({ value: versionStore[key] }) : Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
    (db.put as jest.Mock).mockImplementation((store, data) => {
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
      versionStore['db-schema-version'] = '4';
      const version = await migrationManager.getCurrentVersion();
      expect(version).toBe(4);
    });

    it('should parse version as integer', async () => {
      versionStore['db-schema-version'] = '5';
      const version = await migrationManager.getCurrentVersion();
      expect(version).toBe(5);
    });
  });

  describe('setCurrentVersion', () => {
    it('should set version in preferences', async () => {
      await migrationManager.setCurrentVersion(4);
      expect(db.put).toHaveBeenCalledWith('preferences', {
        key: 'db-schema-version',
        value: '4',
        updatedAt: expect.any(Number)
      });
    });
  });

  describe('migrate', () => {
    it('should return not migrated if already up to date', async () => {
      versionStore['db-schema-version'] = '4';
      const result = await migrationManager.migrate();
      expect(result.migrated).toBe(false);
      expect(result.from).toBe(4);
      expect(result.to).toBe(4);
    });

    it('should run pending migrations', async () => {
      versionStore['db-schema-version'] = '3';
      const result = await migrationManager.migrate();
      expect(result.migrated).toBe(true);
      expect(result.from).toBe(3);
      expect(result.to).toBe(4);
    });

    it('should stop on migration failure', async () => {
      const manager = new MigrationManager();
      manager.migrationsData.set(5, async () => ({ success: false, error: 'Test error' }));
      
      versionStore['db-schema-version'] = '3';
      const result = await manager.migrate();
      
      expect(result.migrated).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.results[1].success).toBe(false);
    });

    it('should handle migration errors', async () => {
      const manager = new MigrationManager();
      manager.migrationsData.set(5, async () => { throw new Error('Migration error'); });
      
      versionStore['db-schema-version'] = '3';
      const result = await manager.migrate();
      
      expect(result.migrated).toBe(false);
      expect(result.results[1].error).toBe('Migration error');
    });
  });

  describe('rollback', () => {
    it('should rollback to lower version', async () => {
      versionStore['db-schema-version'] = '4';
      const result = await migrationManager.rollback(3);
      
      expect(result.success).toBe(true);
      expect(result.from).toBe(4);
      expect(result.to).toBe(3);
      expect(db.put).toHaveBeenCalledWith('preferences', expect.objectContaining({ value: '3' }));
    });

    it('should fail if target version not lower', async () => {
      versionStore['db-schema-version'] = '3';
      const result = await migrationManager.rollback(4);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Target version must be lower than current');
    });

    it('should fail if target version equals current', async () => {
      versionStore['db-schema-version'] = '3';
      const result = await migrationManager.rollback(3);
      
      expect(result.success).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return migration status', async () => {
      versionStore['db-schema-version'] = '3';
      const status = await migrationManager.getStatus();
      
      expect(status.currentVersion).toBe(3);
      expect(status.availableVersion).toBe(4);
      expect(status.pending).toBe(1);
      expect(status.migrations).toContain(4);
    });

    it('should show no pending when up to date', async () => {
      versionStore['db-schema-version'] = '4';
      const status = await migrationManager.getStatus();
      
      expect(status.pending).toBe(0);
    });
  });
});
