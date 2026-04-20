/**
 * Jest Setup File
 * Global setup for test environment
 */

// Mock IndexedDB
class MockDB {
    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.stores = new Map();
    }
    
    async open() {
        return this;
    }
    
    async transaction(storeNames, mode) {
        return {
            objectStore: (name) => this.stores.get(name) || { data: [] }
        };
    }
    
    async close() {}
}

global.MockDB = MockDB;

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (index) => Object.keys(store)[index] || null
    };
})();

global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}')
    })
);

// Mock db.js module with state tracking
const mockDbStore = new Map();

jest.mock('./www/js/data/db.js', () => ({
    __esModule: true,
    default: {
        ready: Promise.resolve(),
        get: jest.fn((store, key) => {
            // Handle cost-savings specially for costTracker tests
            if (key === 'cost-savings') {
                const value = mockDbStore.get(key);
                return Promise.resolve(value || null);
            }
            return Promise.resolve(mockDbStore.get(key) || null);
        }),
        put: jest.fn((store, item) => {
            // Handle cost-savings specially
            if (item && item.key === 'cost-savings') {
                mockDbStore.set(item.key, item);
            } else if (item && item.key) {
                mockDbStore.set(item.key, item);
            }
            return Promise.resolve();
        }),
        add: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
        getPantry: jest.fn(() => Promise.resolve([])),
        setPantry: jest.fn(() => Promise.resolve()),
        getMealPlan: jest.fn(() => Promise.resolve({})),
        setMealPlan: jest.fn(() => Promise.resolve()),
        getPreferences: jest.fn(() => Promise.resolve({})),
        setPreferences: jest.fn(() => Promise.resolve()),
        addMutation: jest.fn(() => Promise.resolve()),
        getPendingMutations: jest.fn(() => Promise.resolve([])),
        markMutationSynced: jest.fn(() => Promise.resolve()),
        markMutationFailed: jest.fn(() => Promise.resolve()),
        incrementMutationRetry: jest.fn(() => Promise.resolve(0)),
        // Expose store for test inspection
        _store: mockDbStore
    }
}));

// Reset mocks before each test
beforeEach(() => {
    localStorageMock.clear();
    mockDbStore.clear();
    fetch.mockClear();
});
