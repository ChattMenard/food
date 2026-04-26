/**
 * Jest Setup File
 * Global setup for test environment
 */

import 'fake-indexeddb/auto';

const fetchMock = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}')
    })
);

// Polyfill structuredClone for Node.js environment
if (!global.structuredClone) {
    global.structuredClone = (obj) => {
        return JSON.parse(JSON.stringify(obj));
    };
}

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

// Reset mocks before each test
beforeEach(() => {
    localStorageMock.clear();
    fetchMock.mockClear();
    global.fetch = fetchMock;
});
