/**
 * StorageUtils - Utility functions for managing localStorage and storage operations
 * Provides quota checking, error handling, and fallback mechanisms
 */
class StorageUtils {
    static STORAGE_QUOTA_WARNING = 0.8; // Warning at 80% usage
    static STORAGE_QUOTA_LIMIT = 0.95; // Error at 95% usage

    /**
     * Test if localStorage is available and functional
     * @returns {boolean} Whether localStorage is available
     */
    static isLocalStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('StorageUtils: localStorage is not available:', error.message);
            return false;
        }
    }

    /**
     * Get estimated storage quota and usage
     * @returns {Promise<Object>} Storage info object
     */
    static async getStorageInfo() {
        const info = {
            available: this.isLocalStorageAvailable(),
            quota: 0,
            usage: 0,
            usagePercent: 0,
            remaining: 0,
            isNearLimit: false,
            isAtLimit: false
        };

        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                info.quota = estimate.quota || 0;
                info.usage = estimate.usage || 0;
                info.usagePercent = info.quota > 0 ? (info.usage / info.quota) * 100 : 0;
                info.remaining = Math.max(0, info.quota - info.usage);
                info.isNearLimit = info.usagePercent >= (this.STORAGE_QUOTA_WARNING * 100);
                info.isAtLimit = info.usagePercent >= (this.STORAGE_QUOTA_LIMIT * 100);
            } else {
                // Fallback: estimate localStorage usage
                const localStorageUsage = this._estimateLocalStorageUsage();
                const estimatedQuota = 5 * 1024 * 1024; // 5MB typical localStorage limit

                info.quota = estimatedQuota;
                info.usage = localStorageUsage;
                info.usagePercent = (localStorageUsage / estimatedQuota) * 100;
                info.remaining = Math.max(0, estimatedQuota - localStorageUsage);
                info.isNearLimit = info.usagePercent >= (this.STORAGE_QUOTA_WARNING * 100);
                info.isAtLimit = info.usagePercent >= (this.STORAGE_QUOTA_LIMIT * 100);
            }
        } catch (error) {
            console.warn('StorageUtils: Could not get storage estimate:', error);
        }

        return info;
    }

    /**
     * Safely set item in localStorage with quota checking
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     * @param {Object} options - Options
     * @returns {Promise<boolean>} Success status
     */
    static async setItem(key, value, options = {}) {
        const config = {
            checkQuota: true,
            compress: false,
            fallback: true,
            ...options
        };

        try {
            // Check storage availability
            if (!this.isLocalStorageAvailable()) {
                if (config.fallback) {
                    console.warn('StorageUtils: localStorage unavailable, using fallback');
                    return this._setItemFallback(key, value);
                }
                throw new Error('localStorage is not available');
            }

            // Check quota if requested
            if (config.checkQuota) {
                const storageInfo = await this.getStorageInfo();
                const valueSize = new Blob([value]).size;

                if (storageInfo.isAtLimit) {
                    throw new Error('Storage quota exceeded');
                }

                if (storageInfo.isNearLimit || storageInfo.remaining < valueSize * 2) {
                    console.warn(`StorageUtils: Storage nearly full (${storageInfo.usagePercent.toFixed(1)}%)`);
                    // Try to cleanup old data
                    await this._cleanupOldData();
                }
            }

            // Store the item
            localStorage.setItem(key, value);
            return true;

        } catch (error) {
            console.error(`StorageUtils: Failed to set item '${key}':`, error);

            if (config.fallback) {
                return this._setItemFallback(key, value);
            }

            return false;
        }
    }

    /**
     * Safely get item from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {string|null} Retrieved value
     */
    static getItem(key, defaultValue = null) {
        try {
            if (!this.isLocalStorageAvailable()) {
                return this._getItemFallback(key, defaultValue);
            }

            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;

        } catch (error) {
            console.error(`StorageUtils: Failed to get item '${key}':`, error);
            return this._getItemFallback(key, defaultValue);
        }
    }

    /**
     * Safely remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    static removeItem(key) {
        try {
            if (this.isLocalStorageAvailable()) {
                localStorage.removeItem(key);
            }
            this._removeItemFallback(key);
            return true;
        } catch (error) {
            console.error(`StorageUtils: Failed to remove item '${key}':`, error);
            return false;
        }
    }

    /**
     * Clear all storage data with confirmation
     * @param {string} prefix - Only clear keys with this prefix
     * @param {boolean} confirmed - Confirmation flag
     * @returns {boolean} Success status
     */
    static clear(prefix = null, confirmed = false) {
        if (!confirmed) {
            throw new Error('clear() requires explicit confirmation');
        }

        try {
            if (prefix) {
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(prefix)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => localStorage.removeItem(key));
            } else {
                localStorage.clear();
            }

            this._clearFallback(prefix);
            return true;
        } catch (error) {
            console.error('StorageUtils: Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Get all keys matching a prefix
     * @param {string} prefix - Key prefix to match
     * @returns {Array} Array of matching keys
     */
    static getKeys(prefix = null) {
        const keys = [];

        try {
            if (this.isLocalStorageAvailable()) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (!prefix || key.startsWith(prefix))) {
                        keys.push(key);
                    }
                }
            }

            // Also check fallback storage
            keys.push(...this._getKeysFallback(prefix));
        } catch (error) {
            console.error('StorageUtils: Failed to get keys:', error);
        }

        return [...new Set(keys)]; // Remove duplicates
    }

    /**
     * Check if storage is healthy
     * @returns {Promise<Object>} Health check result
     */
    static async checkHealth() {
        const health = {
            isHealthy: true,
            issues: [],
            warnings: [],
            storageInfo: null
        };

        try {
            // Check localStorage availability
            if (!this.isLocalStorageAvailable()) {
                health.isHealthy = false;
                health.issues.push('localStorage is not available');
            }

            // Check storage quota
            health.storageInfo = await this.getStorageInfo();
            if (health.storageInfo.isAtLimit) {
                health.isHealthy = false;
                health.issues.push(`Storage quota exceeded (${health.storageInfo.usagePercent.toFixed(1)}%)`);
            } else if (health.storageInfo.isNearLimit) {
                health.warnings.push(`Storage quota nearly full (${health.storageInfo.usagePercent.toFixed(1)}%)`);
            }

            // Check for corrupted data
            const testKey = '__health_test__';
            const testValue = JSON.stringify({ test: true, timestamp: Date.now() });

            try {
                localStorage.setItem(testKey, testValue);
                const retrieved = localStorage.getItem(testKey);
                if (retrieved !== testValue) {
                    health.issues.push('Storage data integrity check failed');
                    health.isHealthy = false;
                }
                localStorage.removeItem(testKey);
            } catch (error) {
                health.issues.push(`Storage write/read test failed: ${error.message}`);
                health.isHealthy = false;
            }

        } catch (error) {
            health.isHealthy = false;
            health.issues.push(`Health check failed: ${error.message}`);
        }

        return health;
    }

    // Private methods

    /**
     * Estimate localStorage usage
     * @returns {number} Estimated usage in bytes
     * @private
     */
    static _estimateLocalStorageUsage() {
        let usage = 0;
        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    usage += key.length + (localStorage[key] || '').length;
                }
            }
        } catch (error) {
            console.warn('StorageUtils: Could not estimate localStorage usage:', error);
        }
        return usage;
    }

    /**
     * Clean up old storage data
     * @private
     */
    static async _cleanupOldData() {
        try {
            const oldKeys = [];
            const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days

            // Look for timestamped backup keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('_backup_')) {
                    const timestampMatch = key.match(/_backup_(\d+)$/);
                    if (timestampMatch) {
                        const timestamp = parseInt(timestampMatch[1]);
                        if (timestamp < cutoffTime) {
                            oldKeys.push(key);
                        }
                    }
                }
            }

            // Remove old backups
            oldKeys.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn(`StorageUtils: Failed to cleanup old key '${key}':`, error);
                }
            });

            if (oldKeys.length > 0) {
                console.log(`StorageUtils: Cleaned up ${oldKeys.length} old backup files`);
            }

        } catch (error) {
            console.warn('StorageUtils: Cleanup failed:', error);
        }
    }

    // Fallback storage implementation (in-memory)
    static _fallbackStorage = new Map();

    static _setItemFallback(key, value) {
        try {
            this._fallbackStorage.set(key, value);
            return true;
        } catch (error) {
            console.error('StorageUtils: Fallback setItem failed:', error);
            return false;
        }
    }

    static _getItemFallback(key, defaultValue = null) {
        try {
            return this._fallbackStorage.get(key) || defaultValue;
        } catch (error) {
            console.error('StorageUtils: Fallback getItem failed:', error);
            return defaultValue;
        }
    }

    static _removeItemFallback(key) {
        try {
            this._fallbackStorage.delete(key);
        } catch (error) {
            console.error('StorageUtils: Fallback removeItem failed:', error);
        }
    }

    static _clearFallback(prefix = null) {
        try {
            if (prefix) {
                const keysToDelete = [];
                for (const key of this._fallbackStorage.keys()) {
                    if (key.startsWith(prefix)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => this._fallbackStorage.delete(key));
            } else {
                this._fallbackStorage.clear();
            }
        } catch (error) {
            console.error('StorageUtils: Fallback clear failed:', error);
        }
    }

    static _getKeysFallback(prefix = null) {
        const keys = [];
        try {
            for (const key of this._fallbackStorage.keys()) {
                if (!prefix || key.startsWith(prefix)) {
                    keys.push(key);
                }
            }
        } catch (error) {
            console.error('StorageUtils: Fallback getKeys failed:', error);
        }
        return keys;
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageUtils };
} else if (typeof window !== 'undefined') {
    window.StorageUtils = StorageUtils;
}