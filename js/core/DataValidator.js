/**
 * DataValidator - Comprehensive validation system for save data integrity
 * Handles schema validation, data sanitization, and corruption detection
 */
class DataValidator {
    constructor() {
        this.schemas = new Map();
        this.validators = new Map();
        this.sanitizers = new Map();

        // Validation statistics
        this.stats = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0,
            corruptionDetected: 0,
            sanitizationPerformed: 0
        };

        // Default validation options
        this.defaultOptions = {
            strict: false,
            sanitize: true,
            logErrors: true,
            throwOnError: false
        };

        // Initialize built-in validators
        this._initializeBuiltInValidators();

        console.log('DataValidator initialized');
    }

    /**
     * Register a validation schema for a specific data type
     * @param {string} type - Data type identifier
     * @param {Object} schema - Validation schema
     */
    registerSchema(type, schema) {
        this.schemas.set(type, schema);
        console.log(`DataValidator: Schema registered for type '${type}'`);
    }

    /**
     * Register a custom validator function
     * @param {string} name - Validator name
     * @param {Function} validator - Validator function
     */
    registerValidator(name, validator) {
        if (typeof validator !== 'function') {
            throw new Error('Validator must be a function');
        }
        this.validators.set(name, validator);
        console.log(`DataValidator: Custom validator '${name}' registered`);
    }

    /**
     * Register a custom sanitizer function
     * @param {string} name - Sanitizer name
     * @param {Function} sanitizer - Sanitizer function
     */
    registerSanitizer(name, sanitizer) {
        if (typeof sanitizer !== 'function') {
            throw new Error('Sanitizer must be a function');
        }
        this.sanitizers.set(name, sanitizer);
        console.log(`DataValidator: Custom sanitizer '${name}' registered`);
    }

    /**
     * Validate data against a schema or type
     * @param {*} data - Data to validate
     * @param {string|Object} schemaOrType - Schema object or type string
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    validate(data, schemaOrType, options = {}) {
        const config = { ...this.defaultOptions, ...options };

        this.stats.totalValidations++;

        try {
            let schema;

            if (typeof schemaOrType === 'string') {
                schema = this.schemas.get(schemaOrType);
                if (!schema) {
                    throw new Error(`No schema registered for type '${schemaOrType}'`);
                }
            } else {
                schema = schemaOrType;
            }

            const result = this._validateAgainstSchema(data, schema, config);

            if (result.isValid) {
                this.stats.successfulValidations++;
            } else {
                this.stats.failedValidations++;
                if (result.hasCorruption) {
                    this.stats.corruptionDetected++;
                }
            }

            if (config.logErrors && !result.isValid) {
                console.warn('DataValidator: Validation failed:', result.errors);
            }

            if (config.throwOnError && !result.isValid) {
                throw new Error(`Validation failed: ${result.errors.join(', ')}`);
            }

            return result;

        } catch (error) {
            this.stats.failedValidations++;

            const result = {
                isValid: false,
                errors: [error.message],
                warnings: [],
                sanitizedData: data,
                hasCorruption: true
            };

            if (config.logErrors) {
                console.error('DataValidator: Validation error:', error);
            }

            if (config.throwOnError) {
                throw error;
            }

            return result;
        }
    }

    /**
     * Sanitize data to fix common issues
     * @param {*} data - Data to sanitize
     * @param {string|Object} schemaOrType - Schema object or type string
     * @param {Object} options - Sanitization options
     * @returns {Object} Sanitization result
     */
    sanitize(data, schemaOrType, options = {}) {
        const config = { ...this.defaultOptions, ...options };

        try {
            let schema;

            if (typeof schemaOrType === 'string') {
                schema = this.schemas.get(schemaOrType);
                if (!schema) {
                    throw new Error(`No schema registered for type '${schemaOrType}'`);
                }
            } else {
                schema = schemaOrType;
            }

            const result = this._sanitizeAgainstSchema(data, schema, config);

            if (result.sanitized) {
                this.stats.sanitizationPerformed++;
            }

            return result;

        } catch (error) {
            console.error('DataValidator: Sanitization error:', error);
            return {
                sanitized: false,
                data: data,
                changes: [],
                errors: [error.message]
            };
        }
    }

    /**
     * Validate game state data specifically
     * @param {Object} gameState - Game state data
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    validateGameState(gameState, options = {}) {
        return this.validate(gameState, 'gameState', options);
    }

    /**
     * Sanitize game state data specifically
     * @param {Object} gameState - Game state data
     * @param {Object} options - Sanitization options
     * @returns {Object} Sanitization result
     */
    sanitizeGameState(gameState, options = {}) {
        return this.sanitize(gameState, 'gameState', options);
    }

    /**
     * Check for data corruption indicators
     * @param {*} data - Data to check
     * @param {Object} options - Check options
     * @returns {Object} Corruption check result
     */
    checkCorruption(data, options = {}) {
        const checks = {
            isValidJSON: true,
            hasRequiredFields: true,
            hasValidTypes: true,
            hasReasonableValues: true,
            hasValidStructure: true
        };

        const issues = [];
        let corruptionLevel = 0; // 0 = none, 1 = minor, 2 = moderate, 3 = severe

        try {
            // Check 1: Valid JSON structure
            if (typeof data !== 'object' || data === null) {
                checks.isValidJSON = false;
                issues.push('Data is not a valid object');
                corruptionLevel = Math.max(corruptionLevel, 3);
            }

            // Check 2: Required fields presence
            if (data && typeof data === 'object') {
                const requiredFields = ['player', 'cultivation', 'meta'];
                for (const field of requiredFields) {
                    if (!(field in data)) {
                        checks.hasRequiredFields = false;
                        issues.push(`Missing required field: ${field}`);
                        corruptionLevel = Math.max(corruptionLevel, 2);
                    }
                }
            }

            // Check 3: Valid data types
            if (data) {
                const typeChecks = this._performTypeChecks(data);
                if (typeChecks.issues.length > 0) {
                    checks.hasValidTypes = false;
                    issues.push(...typeChecks.issues);
                    corruptionLevel = Math.max(corruptionLevel, typeChecks.severity);
                }
            }

            // Check 4: Reasonable value ranges
            if (data) {
                const rangeChecks = this._performRangeChecks(data);
                if (rangeChecks.issues.length > 0) {
                    checks.hasReasonableValues = false;
                    issues.push(...rangeChecks.issues);
                    corruptionLevel = Math.max(corruptionLevel, rangeChecks.severity);
                }
            }

            // Check 5: Valid structure integrity
            if (data) {
                const structureChecks = this._performStructureChecks(data);
                if (structureChecks.issues.length > 0) {
                    checks.hasValidStructure = false;
                    issues.push(...structureChecks.issues);
                    corruptionLevel = Math.max(corruptionLevel, structureChecks.severity);
                }
            }

        } catch (error) {
            issues.push(`Corruption check error: ${error.message}`);
            corruptionLevel = 3;
        }

        const isCorrupted = corruptionLevel > 0;
        const severity = ['none', 'minor', 'moderate', 'severe'][corruptionLevel];

        return {
            isCorrupted,
            severity,
            corruptionLevel,
            checks,
            issues,
            isRecoverable: corruptionLevel < 3
        };
    }

    /**
     * Attempt to repair corrupted data
     * @param {*} data - Corrupted data
     * @param {Object} options - Repair options
     * @returns {Object} Repair result
     */
    repairData(data, options = {}) {
        const config = {
            useDefaults: true,
            preservePartialData: true,
            logRepairs: true,
            ...options
        };

        const repairs = [];
        let repairedData = this._deepClone(data);

        try {
            // Ensure basic structure exists
            if (!repairedData || typeof repairedData !== 'object') {
                repairedData = this._getDefaultGameState();
                repairs.push('Recreated entire data structure');
            }

            // Repair missing required sections
            const requiredSections = ['player', 'cultivation', 'realm', 'character', 'loadout', 'scriptures', 'gacha', 'combat', 'sect', 'tutorial', 'settings', 'meta'];

            for (const section of requiredSections) {
                if (!repairedData[section]) {
                    repairedData[section] = this._getDefaultSection(section);
                    repairs.push(`Restored missing section: ${section}`);
                }
            }

            // Repair invalid data types
            const typeRepairs = this._repairTypes(repairedData);
            repairs.push(...typeRepairs);

            // Repair invalid ranges
            const rangeRepairs = this._repairRanges(repairedData);
            repairs.push(...rangeRepairs);

            // Repair relationships and dependencies
            const relationshipRepairs = this._repairRelationships(repairedData);
            repairs.push(...relationshipRepairs);

            if (config.logRepairs && repairs.length > 0) {
                console.log('DataValidator: Performed repairs:', repairs);
            }

            return {
                repaired: repairs.length > 0,
                data: repairedData,
                repairs: repairs,
                success: true
            };

        } catch (error) {
            console.error('DataValidator: Repair failed:', error);
            return {
                repaired: false,
                data: data,
                repairs: [],
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get validation statistics
     * @returns {Object} Validation statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset validation statistics
     */
    resetStats() {
        this.stats = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0,
            corruptionDetected: 0,
            sanitizationPerformed: 0
        };
    }

    // Private methods

    /**
     * Initialize built-in validators
     */
    _initializeBuiltInValidators() {
        // Register game state schema
        this.registerSchema('gameState', {
            type: 'object',
            required: ['player', 'cultivation', 'meta'],
            properties: {
                player: {
                    type: 'object',
                    required: ['jade', 'spiritCrystals', 'shards', 'power'],
                    properties: {
                        jade: { type: 'number', minimum: 0 },
                        spiritCrystals: { type: 'number', minimum: 0 },
                        shards: { type: 'number', minimum: 0 },
                        power: { type: 'number', minimum: 0 },
                        offlineTime: { type: 'number', minimum: 0 }
                    }
                },
                cultivation: {
                    type: 'object',
                    required: ['qi', 'body', 'dual'],
                    properties: {
                        qi: { $ref: '#/definitions/cultivationPath' },
                        body: { $ref: '#/definitions/cultivationPath' },
                        dual: { $ref: '#/definitions/cultivationPath' }
                    }
                },
                meta: {
                    type: 'object',
                    required: ['createdAt', 'lastPlayed', 'version'],
                    properties: {
                        createdAt: { type: 'number', minimum: 0 },
                        lastPlayed: { type: 'number', minimum: 0 },
                        totalPlayTime: { type: 'number', minimum: 0 },
                        version: { type: 'string' }
                    }
                }
            },
            definitions: {
                cultivationPath: {
                    type: 'object',
                    required: ['level', 'experience', 'experienceRequired', 'baseRate', 'multiplier'],
                    properties: {
                        level: { type: 'number', minimum: 0, maximum: 1000 },
                        experience: { type: 'number', minimum: 0 },
                        experienceRequired: { type: 'number', minimum: 1 },
                        baseRate: { type: 'number', minimum: 0 },
                        multiplier: { type: 'number', minimum: 0 }
                    }
                }
            }
        });

        // Register basic validators
        this.registerValidator('isNumber', (value) => typeof value === 'number' && !isNaN(value));
        this.registerValidator('isString', (value) => typeof value === 'string');
        this.registerValidator('isBoolean', (value) => typeof value === 'boolean');
        this.registerValidator('isArray', (value) => Array.isArray(value));
        this.registerValidator('isObject', (value) => typeof value === 'object' && value !== null && !Array.isArray(value));
        this.registerValidator('isPositive', (value) => typeof value === 'number' && value >= 0);
        this.registerValidator('isInteger', (value) => Number.isInteger(value));

        // Register basic sanitizers
        this.registerSanitizer('toNumber', (value) => {
            const num = Number(value);
            return isNaN(num) ? 0 : num;
        });
        this.registerSanitizer('toString', (value) => String(value));
        this.registerSanitizer('toBoolean', (value) => Boolean(value));
        this.registerSanitizer('clampPositive', (value) => Math.max(0, Number(value) || 0));
        this.registerSanitizer('clampInteger', (value) => Math.floor(Number(value) || 0));
    }

    /**
     * Validate data against a schema
     * @param {*} data - Data to validate
     * @param {Object} schema - Validation schema
     * @param {Object} config - Validation configuration
     * @returns {Object} Validation result
     */
    _validateAgainstSchema(data, schema, config) {
        const errors = [];
        const warnings = [];
        let sanitizedData = config.sanitize ? this._deepClone(data) : data;

        const result = this._validateValue(sanitizedData, schema, '', config);

        errors.push(...result.errors);
        warnings.push(...result.warnings);

        if (config.sanitize && result.sanitizedValue !== undefined) {
            sanitizedData = result.sanitizedValue;
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            sanitizedData,
            hasCorruption: this._hasCorruptionIndicators(errors)
        };
    }

    /**
     * Sanitize data against a schema
     * @param {*} data - Data to sanitize
     * @param {Object} schema - Sanitization schema
     * @param {Object} config - Sanitization configuration
     * @returns {Object} Sanitization result
     */
    _sanitizeAgainstSchema(data, schema, config) {
        const changes = [];
        let sanitizedData = this._deepClone(data);

        const result = this._sanitizeValue(sanitizedData, schema, '', changes);

        return {
            sanitized: changes.length > 0,
            data: result,
            changes,
            errors: []
        };
    }

    /**
     * Validate a single value against schema rules
     * @param {*} value - Value to validate
     * @param {Object} schema - Schema rules
     * @param {string} path - Property path
     * @param {Object} config - Configuration
     * @returns {Object} Validation result
     */
    _validateValue(value, schema, path, config) {
        const errors = [];
        const warnings = [];
        let sanitizedValue = value;

        // Type validation
        if (schema.type) {
            const typeValid = this._validateType(value, schema.type);
            if (!typeValid.isValid) {
                if (config.sanitize) {
                    sanitizedValue = this._sanitizeType(value, schema.type);
                    warnings.push(`${path}: Type corrected from ${typeof value} to ${schema.type}`);
                } else {
                    errors.push(`${path}: Expected type ${schema.type}, got ${typeof value}`);
                }
            }
        }

        // Required validation
        if (schema.required && Array.isArray(schema.required)) {
            for (const requiredProp of schema.required) {
                if (!value || !(requiredProp in value)) {
                    errors.push(`${path}: Missing required property '${requiredProp}'`);
                }
            }
        }

        // Range validation
        if (typeof sanitizedValue === 'number') {
            if (schema.minimum !== undefined && sanitizedValue < schema.minimum) {
                if (config.sanitize) {
                    sanitizedValue = schema.minimum;
                    warnings.push(`${path}: Value clamped to minimum ${schema.minimum}`);
                } else {
                    errors.push(`${path}: Value ${sanitizedValue} below minimum ${schema.minimum}`);
                }
            }
            if (schema.maximum !== undefined && sanitizedValue > schema.maximum) {
                if (config.sanitize) {
                    sanitizedValue = schema.maximum;
                    warnings.push(`${path}: Value clamped to maximum ${schema.maximum}`);
                } else {
                    errors.push(`${path}: Value ${sanitizedValue} above maximum ${schema.maximum}`);
                }
            }
        }

        // Object properties validation
        if (schema.type === 'object' && schema.properties && typeof sanitizedValue === 'object') {
            for (const [propKey, propSchema] of Object.entries(schema.properties)) {
                const propPath = path ? `${path}.${propKey}` : propKey;
                const propResult = this._validateValue(sanitizedValue[propKey], propSchema, propPath, config);

                errors.push(...propResult.errors);
                warnings.push(...propResult.warnings);

                if (config.sanitize && propResult.sanitizedValue !== undefined) {
                    sanitizedValue[propKey] = propResult.sanitizedValue;
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            sanitizedValue: config.sanitize ? sanitizedValue : undefined
        };
    }

    /**
     * Sanitize a single value
     * @param {*} value - Value to sanitize
     * @param {Object} schema - Schema rules
     * @param {string} path - Property path
     * @param {Array} changes - Changes log
     * @returns {*} Sanitized value
     */
    _sanitizeValue(value, schema, path, changes) {
        let sanitizedValue = value;

        // Type sanitization
        if (schema.type && !this._validateType(value, schema.type).isValid) {
            sanitizedValue = this._sanitizeType(value, schema.type);
            changes.push(`${path}: Type corrected to ${schema.type}`);
        }

        // Range sanitization
        if (typeof sanitizedValue === 'number') {
            if (schema.minimum !== undefined && sanitizedValue < schema.minimum) {
                sanitizedValue = schema.minimum;
                changes.push(`${path}: Clamped to minimum ${schema.minimum}`);
            }
            if (schema.maximum !== undefined && sanitizedValue > schema.maximum) {
                sanitizedValue = schema.maximum;
                changes.push(`${path}: Clamped to maximum ${schema.maximum}`);
            }
        }

        // Object properties sanitization
        if (schema.type === 'object' && schema.properties && typeof sanitizedValue === 'object') {
            for (const [propKey, propSchema] of Object.entries(schema.properties)) {
                const propPath = path ? `${path}.${propKey}` : propKey;
                sanitizedValue[propKey] = this._sanitizeValue(sanitizedValue[propKey], propSchema, propPath, changes);
            }
        }

        return sanitizedValue;
    }

    /**
     * Validate type of a value
     * @param {*} value - Value to check
     * @param {string} expectedType - Expected type
     * @returns {Object} Type validation result
     */
    _validateType(value, expectedType) {
        const actualType = typeof value;
        let isValid = false;

        switch (expectedType) {
            case 'string':
                isValid = actualType === 'string';
                break;
            case 'number':
                isValid = actualType === 'number' && !isNaN(value);
                break;
            case 'boolean':
                isValid = actualType === 'boolean';
                break;
            case 'object':
                isValid = actualType === 'object' && value !== null && !Array.isArray(value);
                break;
            case 'array':
                isValid = Array.isArray(value);
                break;
            default:
                isValid = actualType === expectedType;
        }

        return { isValid, actualType, expectedType };
    }

    /**
     * Sanitize type of a value
     * @param {*} value - Value to sanitize
     * @param {string} targetType - Target type
     * @returns {*} Sanitized value
     */
    _sanitizeType(value, targetType) {
        switch (targetType) {
            case 'string':
                return String(value);
            case 'number':
                const num = Number(value);
                return isNaN(num) ? 0 : num;
            case 'boolean':
                return Boolean(value);
            case 'object':
                return (typeof value === 'object' && value !== null) ? value : {};
            case 'array':
                return Array.isArray(value) ? value : [];
            default:
                return value;
        }
    }

    /**
     * Check for corruption indicators in errors
     * @param {Array} errors - Validation errors
     * @returns {boolean} Whether corruption is indicated
     */
    _hasCorruptionIndicators(errors) {
        const corruptionKeywords = ['missing', 'invalid', 'corrupted', 'malformed', 'unexpected'];
        return errors.some(error =>
            corruptionKeywords.some(keyword =>
                error.toLowerCase().includes(keyword)
            )
        );
    }

    /**
     * Perform type checks on data
     * @param {Object} data - Data to check
     * @returns {Object} Type check result
     */
    _performTypeChecks(data) {
        const issues = [];
        let severity = 0;

        try {
            // Check player data types
            if (data.player) {
                if (typeof data.player.jade !== 'number') {
                    issues.push('Player jade should be a number');
                    severity = Math.max(severity, 1);
                }
                if (typeof data.player.spiritCrystals !== 'number') {
                    issues.push('Player spiritCrystals should be a number');
                    severity = Math.max(severity, 1);
                }
                if (typeof data.player.power !== 'number') {
                    issues.push('Player power should be a number');
                    severity = Math.max(severity, 1);
                }
            }

            // Check cultivation data types
            if (data.cultivation) {
                const paths = ['qi', 'body', 'dual'];
                for (const path of paths) {
                    if (data.cultivation[path]) {
                        const cult = data.cultivation[path];
                        if (typeof cult.level !== 'number') {
                            issues.push(`Cultivation ${path} level should be a number`);
                            severity = Math.max(severity, 1);
                        }
                        if (typeof cult.experience !== 'number') {
                            issues.push(`Cultivation ${path} experience should be a number`);
                            severity = Math.max(severity, 1);
                        }
                    }
                }
            }

            // Check meta data types
            if (data.meta) {
                if (typeof data.meta.createdAt !== 'number') {
                    issues.push('Meta createdAt should be a number');
                    severity = Math.max(severity, 2);
                }
                if (typeof data.meta.lastPlayed !== 'number') {
                    issues.push('Meta lastPlayed should be a number');
                    severity = Math.max(severity, 2);
                }
            }

        } catch (error) {
            issues.push(`Type check error: ${error.message}`);
            severity = 3;
        }

        return { issues, severity };
    }

    /**
     * Perform range checks on data
     * @param {Object} data - Data to check
     * @returns {Object} Range check result
     */
    _performRangeChecks(data) {
        const issues = [];
        let severity = 0;

        try {
            // Check player ranges
            if (data.player) {
                if (data.player.jade < 0) {
                    issues.push('Player jade cannot be negative');
                    severity = Math.max(severity, 1);
                }
                if (data.player.jade > 1e15) {
                    issues.push('Player jade value is unreasonably high');
                    severity = Math.max(severity, 2);
                }
                if (data.player.power < 0) {
                    issues.push('Player power cannot be negative');
                    severity = Math.max(severity, 1);
                }
            }

            // Check cultivation ranges
            if (data.cultivation) {
                const paths = ['qi', 'body', 'dual'];
                for (const path of paths) {
                    if (data.cultivation[path]) {
                        const cult = data.cultivation[path];
                        if (cult.level < 0 || cult.level > 1000) {
                            issues.push(`Cultivation ${path} level out of reasonable range`);
                            severity = Math.max(severity, 2);
                        }
                        if (cult.experience < 0) {
                            issues.push(`Cultivation ${path} experience cannot be negative`);
                            severity = Math.max(severity, 1);
                        }
                    }
                }
            }

            // Check timestamp ranges
            const now = Date.now();
            const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
            const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);

            if (data.meta) {
                if (data.meta.createdAt < oneYearAgo || data.meta.createdAt > oneYearFromNow) {
                    issues.push('Meta createdAt timestamp is unreasonable');
                    severity = Math.max(severity, 2);
                }
                if (data.meta.lastPlayed > oneYearFromNow) {
                    issues.push('Meta lastPlayed timestamp is in the future');
                    severity = Math.max(severity, 2);
                }
            }

        } catch (error) {
            issues.push(`Range check error: ${error.message}`);
            severity = 3;
        }

        return { issues, severity };
    }

    /**
     * Perform structure checks on data
     * @param {Object} data - Data to check
     * @returns {Object} Structure check result
     */
    _performStructureChecks(data) {
        const issues = [];
        let severity = 0;

        try {
            // Check for circular references
            try {
                JSON.stringify(data);
            } catch (error) {
                if (error.message.includes('circular')) {
                    issues.push('Data contains circular references');
                    severity = 3;
                }
            }

            // Check cultivation path consistency
            if (data.cultivation) {
                const paths = ['qi', 'body', 'dual'];
                for (const path of paths) {
                    if (data.cultivation[path]) {
                        const cult = data.cultivation[path];
                        if (cult.experience >= cult.experienceRequired && cult.level === 0) {
                            issues.push(`Cultivation ${path} has inconsistent level/experience`);
                            severity = Math.max(severity, 1);
                        }
                    }
                }
            }

            // Check loadout consistency
            if (data.loadout && data.scriptures) {
                if (data.loadout.slots) {
                    for (const [slot, scriptureId] of Object.entries(data.loadout.slots)) {
                        if (scriptureId && !data.scriptures.collection.find(s => s.id === scriptureId)) {
                            issues.push(`Loadout references non-existent scripture: ${scriptureId}`);
                            severity = Math.max(severity, 2);
                        }
                    }
                }
            }

        } catch (error) {
            issues.push(`Structure check error: ${error.message}`);
            severity = 3;
        }

        return { issues, severity };
    }

    /**
     * Repair invalid data types
     * @param {Object} data - Data to repair
     * @returns {Array} List of repairs performed
     */
    _repairTypes(data) {
        const repairs = [];

        try {
            // Repair player types
            if (data.player) {
                if (typeof data.player.jade !== 'number') {
                    data.player.jade = Number(data.player.jade) || 0;
                    repairs.push('Repaired player jade type');
                }
                if (typeof data.player.spiritCrystals !== 'number') {
                    data.player.spiritCrystals = Number(data.player.spiritCrystals) || 0;
                    repairs.push('Repaired player spiritCrystals type');
                }
                if (typeof data.player.power !== 'number') {
                    data.player.power = Number(data.player.power) || 1.0;
                    repairs.push('Repaired player power type');
                }
            }

            // Repair cultivation types
            if (data.cultivation) {
                const paths = ['qi', 'body', 'dual'];
                for (const path of paths) {
                    if (data.cultivation[path]) {
                        const cult = data.cultivation[path];
                        if (typeof cult.level !== 'number') {
                            cult.level = Number(cult.level) || 0;
                            repairs.push(`Repaired cultivation ${path} level type`);
                        }
                        if (typeof cult.experience !== 'number') {
                            cult.experience = Number(cult.experience) || 0;
                            repairs.push(`Repaired cultivation ${path} experience type`);
                        }
                    }
                }
            }

        } catch (error) {
            repairs.push(`Type repair error: ${error.message}`);
        }

        return repairs;
    }

    /**
     * Repair invalid ranges
     * @param {Object} data - Data to repair
     * @returns {Array} List of repairs performed
     */
    _repairRanges(data) {
        const repairs = [];

        try {
            // Repair player ranges
            if (data.player) {
                if (data.player.jade < 0) {
                    data.player.jade = 0;
                    repairs.push('Repaired negative player jade');
                }
                if (data.player.power < 0) {
                    data.player.power = 1.0;
                    repairs.push('Repaired negative player power');
                }
            }

            // Repair cultivation ranges
            if (data.cultivation) {
                const paths = ['qi', 'body', 'dual'];
                for (const path of paths) {
                    if (data.cultivation[path]) {
                        const cult = data.cultivation[path];
                        if (cult.level < 0) {
                            cult.level = 0;
                            repairs.push(`Repaired negative cultivation ${path} level`);
                        }
                        if (cult.experience < 0) {
                            cult.experience = 0;
                            repairs.push(`Repaired negative cultivation ${path} experience`);
                        }
                    }
                }
            }

        } catch (error) {
            repairs.push(`Range repair error: ${error.message}`);
        }

        return repairs;
    }

    /**
     * Repair invalid relationships
     * @param {Object} data - Data to repair
     * @returns {Array} List of repairs performed
     */
    _repairRelationships(data) {
        const repairs = [];

        try {
            // Repair cultivation consistency
            if (data.cultivation) {
                const paths = ['qi', 'body', 'dual'];
                for (const path of paths) {
                    if (data.cultivation[path]) {
                        const cult = data.cultivation[path];
                        if (cult.experience >= cult.experienceRequired && cult.level === 0) {
                            cult.level = Math.floor(cult.experience / cult.experienceRequired);
                            cult.experience = cult.experience % cult.experienceRequired;
                            repairs.push(`Repaired cultivation ${path} level/experience consistency`);
                        }
                    }
                }
            }

            // Repair loadout references
            if (data.loadout && data.scriptures && data.loadout.slots) {
                for (const [slot, scriptureId] of Object.entries(data.loadout.slots)) {
                    if (scriptureId && !data.scriptures.collection.find(s => s.id === scriptureId)) {
                        data.loadout.slots[slot] = null;
                        repairs.push(`Removed invalid scripture reference from slot ${slot}`);
                    }
                }
            }

        } catch (error) {
            repairs.push(`Relationship repair error: ${error.message}`);
        }

        return repairs;
    }

    /**
     * Get default game state structure
     * @returns {Object} Default game state
     */
    _getDefaultGameState() {
        return {
            player: {
                jade: 500,
                spiritCrystals: 100,
                shards: 0,
                power: 1.0,
                offlineTime: 0
            },
            cultivation: {
                qi: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                body: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                dual: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 200,
                    baseRate: 0.5,
                    multiplier: 1.0,
                    unlocked: false
                }
            },
            realm: {
                current: "Body Refinement",
                stage: 1,
                maxStage: 10,
                breakthroughProgress: 0,
                breakthroughRequired: 1000
            },
            character: {
                origin: null,
                vow: null,
                mark: null,
                modifiers: {}
            },
            loadout: {
                slots: {
                    qi: null,
                    body: null,
                    dual: null,
                    extra1: null,
                    extra2: null
                },
                stats: {
                    flatDamage: 0,
                    damageMultiplier: 1.0,
                    attackSpeed: 1.0,
                    critChance: 0.05,
                    critMultiplier: 2.0,
                    lifesteal: 0,
                    damageReduction: 0
                }
            },
            scriptures: {
                collection: [],
                nextId: 1
            },
            gacha: {
                pityCounter: 0,
                currentBanner: 'standard'
            },
            combat: {
                wins: 0,
                losses: 0,
                streak: 0,
                rank: 1000
            },
            sect: {
                id: null,
                name: null,
                contribution: 0,
                buffs: [],
                lastDonation: 0
            },
            tutorial: {
                completed: false,
                currentStep: 0,
                completedSteps: []
            },
            settings: {
                autoSave: true,
                notifications: true,
                sound: true,
                theme: 'dark'
            },
            meta: {
                createdAt: Date.now(),
                lastPlayed: Date.now(),
                totalPlayTime: 0,
                version: '1.0.0'
            }
        };
    }

    /**
     * Get default section data
     * @param {string} section - Section name
     * @returns {Object} Default section data
     */
    _getDefaultSection(section) {
        const defaults = this._getDefaultGameState();
        return defaults[section] || {};
    }

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this._deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this._deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }
}

// Create singleton instance
const dataValidator = new DataValidator();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataValidator, dataValidator };
} else if (typeof window !== 'undefined') {
    window.DataValidator = DataValidator;
    window.dataValidator = dataValidator;
}