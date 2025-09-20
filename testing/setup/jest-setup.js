/**
 * Jest Setup Configuration for Idle Cultivation Game
 * Provides test utilities and mock objects for consistent testing
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

// Set up global mocks
global.localStorage = localStorageMock;
global.sessionStorage = sessionStorageMock;

// Mock window object properties
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Test utilities
global.testUtils = {
  /**
   * Create mock player data for testing
   */
  createMockPlayerData() {
    return {
      name: 'Test Player',
      cultivation: {
        qi: { level: 25, experience: 10000 },
        body: { level: 20, experience: 8000 },
        realm: 'Foundation Establishment',
        stage: 2
      },
      resources: {
        jade: 50000,
        spiritStones: 2500
      },
      progressionSystems: {
        mounts: { unlocked: true, active: 'Spirit Horse', level: 10 },
        wings: { unlocked: true, active: 'Feather Wings', level: 8 },
        accessories: { unlocked: true },
        runes: { unlocked: true },
        meridians: { unlocked: true },
        dantian: { unlocked: true },
        soul: { unlocked: false }
      },
      equipment: {
        weapon: { type: 'sword', level: 15, power: 1000 },
        armor: { type: 'robe', level: 12, defense: 800 }
      }
    };
  },

  /**
   * Create mock game state for testing
   */
  createMockGameState() {
    const playerData = this.createMockPlayerData();

    return {
      player: playerData,
      game: {
        version: '1.0.0',
        lastSave: Date.now(),
        playtime: 3600000 // 1 hour
      },
      systems: {
        combat: { initialized: true },
        quest: { initialized: true },
        gacha: { initialized: true }
      }
    };
  },

  /**
   * Create mock event manager for testing
   */
  createMockEventManager() {
    const listeners = new Map();

    return {
      on: jest.fn((event, callback) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event).push(callback);
        return () => {
          const eventListeners = listeners.get(event);
          const index = eventListeners.indexOf(callback);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        };
      }),
      emit: jest.fn((event, data) => {
        if (listeners.has(event)) {
          listeners.get(event).forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('Event callback error:', error);
            }
          });
        }
      }),
      off: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(() => {
        listeners.clear();
      }),
      getListenerCount: jest.fn((event) => {
        return listeners.has(event) ? listeners.get(event).length : 0;
      })
    };
  },

  /**
   * Create mock UI manager for testing
   */
  createMockUIManager() {
    return {
      init: jest.fn(),
      registerComponent: jest.fn(),
      destroyComponent: jest.fn(),
      getComponent: jest.fn(),
      getAllComponents: jest.fn(() => []),
      getComponentsByType: jest.fn(() => []),
      setTheme: jest.fn(),
      currentTheme: 'gfl-dark',
      currentBreakpoint: 'desktop',
      getDebugInfo: jest.fn(() => ({
        isInitialized: true,
        registeredThemes: ['gfl-dark', 'gfl-light'],
        currentTheme: 'gfl-dark',
        currentBreakpoint: 'desktop'
      }))
    };
  },

  /**
   * Create mock power calculator for testing
   */
  createMockPowerCalculator() {
    return {
      calculatePlayerPower: jest.fn(() => 15000),
      calculateTotalPower: jest.fn(() => 15000),
      getPowerTier: jest.fn(() => ({
        name: 'Foundation',
        color: '#4CAF50'
      })),
      getCachedPower: jest.fn(() => 15000),
      invalidateCache: jest.fn(),
      getBreakdown: jest.fn(() => ({
        total: 15000,
        base: 5000,
        equipment: 3000,
        progression: 7000
      }))
    };
  },

  /**
   * Wait for specified time in tests
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Wait for condition to be true
   */
  async waitForCondition(condition, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) {
        return true;
      }
      await this.wait(50);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Create a spy that tracks calls
   */
  createSpy() {
    return jest.fn();
  },

  /**
   * Mock DOM element for testing
   */
  createMockElement(tagName = 'div') {
    const element = {
      tagName: tagName.toUpperCase(),
      className: '',
      id: '',
      style: {},
      attributes: new Map(),
      children: [],
      parentNode: null,
      textContent: '',
      innerHTML: '',

      // Methods
      appendChild: jest.fn(function(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
      }),
      removeChild: jest.fn(function(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
          this.children.splice(index, 1);
          child.parentNode = null;
        }
        return child;
      }),
      getAttribute: jest.fn(function(name) {
        return this.attributes.get(name) || null;
      }),
      setAttribute: jest.fn(function(name, value) {
        this.attributes.set(name, value);
      }),
      removeAttribute: jest.fn(function(name) {
        this.attributes.delete(name);
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      click: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(() => false),
        toggle: jest.fn()
      }
    };

    return element;
  }
};

// Set up global test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();

  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global test configuration
jest.setTimeout(10000); // 10 second timeout for all tests

// Suppress console output during tests unless explicitly needed
if (process.env.NODE_ENV === 'test') {
  global.console.log = jest.fn();
  global.console.warn = jest.fn();
  global.console.error = jest.fn();
}