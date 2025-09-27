/**
 * Error Security and Compliance Module
 *
 * Comprehensive security implementation for error handling including data sanitization,
 * PII protection, secure transmission, access control, audit logging, and compliance
 * with privacy regulations.
 *
 * @version 1.0.0
 * @since 2025-09-26
 */

class ErrorSecurity {
    constructor() {
        this.config = window.ProductionConfig || null;
        this.encryptionKey = this.generateEncryptionKey();
        this.auditLog = [];
        this.accessLog = [];
        this.piiPatterns = this.initializePiiPatterns();
        this.sanitizationRules = this.initializeSanitizationRules();
        this.complianceSettings = this.initializeComplianceSettings();

        // Security state
        this.securityState = {
            encryptionEnabled: this.config?.get('security.encryption', false),
            sanitizationEnabled: this.config?.get('security.sanitization', true),
            auditLoggingEnabled: this.config?.get('security.auditLogging', false),
            accessControlEnabled: this.config?.get('security.accessControl', false),
            anonymizationEnabled: this.config?.get('security.anonymization', false)
        };

        // Initialize security subsystems
        this.initializeEncryption();
        this.initializeAccessControl();
        this.initializeAuditLogging();
        this.initializePiiDetection();
        this.initializeComplianceChecks();

        console.log('[ErrorSecurity] Security module initialized with configuration:', this.securityState);
    }

    /**
     * Initialize PII detection patterns
     */
    initializePiiPatterns() {
        return {
            // Email patterns
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

            // Phone number patterns
            phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,

            // Credit card patterns
            creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

            // Social Security Number (US)
            ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,

            // IP Address patterns
            ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,

            // URL patterns with sensitive info
            sensitiveUrl: /https?:\/\/[^\s]*(?:password|token|key|secret)[^\s]*/gi,

            // Authentication tokens
            authToken: /(?:bearer|token|jwt|auth)[\s:=]+([a-zA-Z0-9+/=]{20,})/gi,

            // API keys
            apiKey: /(?:api[_-]?key|access[_-]?key|secret[_-]?key)[\s:=]+([a-zA-Z0-9+/=]{20,})/gi,

            // User IDs (common patterns)
            userId: /(?:user[_-]?id|uid)[\s:=]+([a-zA-Z0-9-]{8,})/gi,

            // Session IDs
            sessionId: /(?:session[_-]?id|sid)[\s:=]+([a-zA-Z0-9+/=]{20,})/gi
        };
    }

    /**
     * Initialize sanitization rules
     */
    initializeSanitizationRules() {
        return {
            // Remove sensitive data patterns
            removePii: true,
            removeCredentials: true,
            removeTokens: true,

            // Replace patterns
            replacements: {
                email: '[EMAIL_REDACTED]',
                phone: '[PHONE_REDACTED]',
                creditCard: '[CARD_REDACTED]',
                ssn: '[SSN_REDACTED]',
                ipAddress: '[IP_REDACTED]',
                authToken: '[TOKEN_REDACTED]',
                apiKey: '[API_KEY_REDACTED]',
                userId: '[USER_ID_REDACTED]',
                sessionId: '[SESSION_ID_REDACTED]',
                sensitiveUrl: '[SENSITIVE_URL_REDACTED]'
            },

            // Additional sanitization
            truncateLength: 1000,
            removeStackTraces: false, // Keep for debugging in non-production
            removeFileSystem: true,
            removeEnvironmentVars: true
        };
    }

    /**
     * Initialize compliance settings
     */
    initializeComplianceSettings() {
        return {
            gdpr: {
                enabled: this.config?.get('compliance.regulations.gdpr', false),
                dataRetention: this.config?.get('compliance.dataPrivacy.dataRetention', 30),
                rightToErasure: this.config?.get('compliance.dataPrivacy.rightToErasure', false),
                dataMinimization: true,
                consentRequired: false // For error handling, implied consent
            },

            ccpa: {
                enabled: this.config?.get('compliance.regulations.ccpa', false),
                dataCategories: ['error_logs', 'performance_metrics', 'user_interactions'],
                optOutRights: true,
                dataDisclosure: true
            },

            general: {
                dataAnonymization: this.config?.get('compliance.dataPrivacy.dataAnonymization', false),
                dataEncryption: this.config?.get('compliance.security.dataEncryption', false),
                accessLogging: this.config?.get('compliance.audit.accessControl', false),
                dataAudit: this.config?.get('compliance.audit.dataChanges', false)
            }
        };
    }

    /**
     * Initialize encryption subsystem
     */
    initializeEncryption() {
        if (this.securityState.encryptionEnabled && typeof crypto !== 'undefined') {
            this.encryption = {
                algorithm: 'AES-GCM',
                keyLength: 256,
                ivLength: 12,
                enabled: true
            };
        } else {
            this.encryption = {
                enabled: false,
                fallback: 'base64' // Simple encoding as fallback
            };
        }
    }

    /**
     * Initialize access control
     */
    initializeAccessControl() {
        this.accessControl = {
            enabled: this.securityState.accessControlEnabled,
            roles: ['admin', 'developer', 'operator', 'viewer'],
            permissions: {
                admin: ['read', 'write', 'delete', 'configure', 'audit'],
                developer: ['read', 'write', 'configure'],
                operator: ['read', 'configure'],
                viewer: ['read']
            },
            sessions: new Map(),
            defaultRole: 'viewer'
        };
    }

    /**
     * Initialize audit logging
     */
    initializeAuditLogging() {
        this.auditLogging = {
            enabled: this.securityState.auditLoggingEnabled,
            maxLogSize: 10000, // Maximum number of audit entries
            retentionDays: 90,
            categories: [
                'access',
                'configuration',
                'data_access',
                'error_handling',
                'security_event'
            ]
        };

        // Setup periodic audit log cleanup
        setInterval(() => {
            this.cleanupAuditLogs();
        }, 24 * 60 * 60 * 1000); // Daily cleanup
    }

    /**
     * Initialize PII detection system
     */
    initializePiiDetection() {
        this.piiDetection = {
            enabled: true,
            confidence: {
                high: 0.9,
                medium: 0.7,
                low: 0.5
            },
            scanDepth: 3 // How deep to scan object properties
        };
    }

    /**
     * Initialize compliance checks
     */
    initializeComplianceChecks() {
        // Setup compliance monitoring
        setInterval(() => {
            this.performComplianceCheck();
        }, 60 * 60 * 1000); // Hourly compliance checks
    }

    /**
     * Sanitize error data before processing or transmission
     */
    sanitizeErrorData(errorData) {
        if (!this.securityState.sanitizationEnabled) {
            return errorData;
        }

        const sanitized = JSON.parse(JSON.stringify(errorData)); // Deep clone

        try {
            this.auditAction('data_sanitization', 'Error data sanitization started');

            // Sanitize string properties
            this.sanitizeObject(sanitized);

            // Remove sensitive properties
            this.removeSensitiveProperties(sanitized);

            // Apply truncation
            this.applyTruncation(sanitized);

            // Anonymize if required
            if (this.securityState.anonymizationEnabled) {
                this.anonymizeData(sanitized);
            }

            this.auditAction('data_sanitization', 'Error data sanitization completed');

            return sanitized;

        } catch (error) {
            console.error('[ErrorSecurity] Sanitization failed:', error);
            this.auditAction('security_event', 'Sanitization failure', { error: error.message });

            // Return minimal safe data on sanitization failure
            return {
                message: '[SANITIZATION_ERROR]',
                timestamp: Date.now(),
                sanitizationError: true
            };
        }
    }

    /**
     * Detect PII in data
     */
    detectPii(data) {
        const detections = [];

        if (typeof data === 'string') {
            Object.entries(this.piiPatterns).forEach(([type, pattern]) => {
                const matches = data.match(pattern);
                if (matches) {
                    detections.push({
                        type,
                        matches: matches.length,
                        confidence: this.calculatePiiConfidence(type, matches),
                        data: matches
                    });
                }
            });
        } else if (typeof data === 'object' && data !== null) {
            this.detectPiiInObject(data, detections);
        }

        return detections;
    }

    /**
     * Encrypt sensitive data
     */
    async encryptData(data) {
        if (!this.encryption.enabled) {
            return this.fallbackEncoding(data);
        }

        try {
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataString);

            const iv = crypto.getRandomValues(new Uint8Array(this.encryption.ivLength));
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: this.encryption.algorithm,
                    iv: iv
                },
                this.encryptionKey,
                dataBuffer
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);

            return {
                encrypted: Array.from(combined),
                algorithm: this.encryption.algorithm,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('[ErrorSecurity] Encryption failed:', error);
            this.auditAction('security_event', 'Encryption failure', { error: error.message });
            return this.fallbackEncoding(data);
        }
    }

    /**
     * Decrypt sensitive data
     */
    async decryptData(encryptedData) {
        if (!this.encryption.enabled || !encryptedData.encrypted) {
            return this.fallbackDecoding(encryptedData);
        }

        try {
            const combined = new Uint8Array(encryptedData.encrypted);
            const iv = combined.slice(0, this.encryption.ivLength);
            const encrypted = combined.slice(this.encryption.ivLength);

            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: this.encryption.algorithm,
                    iv: iv
                },
                this.encryptionKey,
                encrypted
            );

            const decoder = new TextDecoder();
            const decryptedString = decoder.decode(decryptedData);

            try {
                return JSON.parse(decryptedString);
            } catch {
                return decryptedString;
            }

        } catch (error) {
            console.error('[ErrorSecurity] Decryption failed:', error);
            this.auditAction('security_event', 'Decryption failure', { error: error.message });
            return this.fallbackDecoding(encryptedData);
        }
    }

    /**
     * Check access permissions for error dashboard
     */
    checkAccess(operation, userId = null, role = null) {
        if (!this.accessControl.enabled) {
            return true; // Access control disabled
        }

        const userRole = role || this.getUserRole(userId);
        const permissions = this.accessControl.permissions[userRole] || [];

        const hasPermission = permissions.includes(operation);

        this.auditAction('access', 'Access check', {
            operation,
            userId,
            role: userRole,
            granted: hasPermission
        });

        return hasPermission;
    }

    /**
     * Create audit log entry
     */
    auditAction(category, action, details = {}) {
        if (!this.auditLogging.enabled) {
            return;
        }

        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: Date.now(),
            category,
            action,
            details,
            userId: this.getCurrentUserId(),
            sessionId: this.getCurrentSessionId(),
            ipAddress: this.getClientIpAddress(),
            userAgent: navigator.userAgent
        };

        this.auditLog.push(auditEntry);

        // Trim audit log if it exceeds maximum size
        if (this.auditLog.length > this.auditLogging.maxLogSize) {
            this.auditLog.splice(0, this.auditLog.length - this.auditLogging.maxLogSize);
        }

        // Store in persistent storage if available
        this.persistAuditLog(auditEntry);
    }

    /**
     * Perform compliance check
     */
    performComplianceCheck() {
        const complianceReport = {
            timestamp: Date.now(),
            gdpr: this.checkGdprCompliance(),
            ccpa: this.checkCcpaCompliance(),
            dataRetention: this.checkDataRetention(),
            securityRequirements: this.checkSecurityCompliance(),
            overall: 'compliant'
        };

        // Determine overall compliance
        const violations = Object.values(complianceReport)
            .filter(check => typeof check === 'object' && check.status !== 'compliant')
            .length;

        if (violations > 0) {
            complianceReport.overall = 'violations_detected';
            this.auditAction('security_event', 'Compliance violations detected', {
                violations,
                report: complianceReport
            });
        }

        return complianceReport;
    }

    /**
     * Get security dashboard data
     */
    getSecurityDashboard() {
        return {
            securityState: this.securityState,
            complianceSettings: this.complianceSettings,
            auditLogSize: this.auditLog.length,
            recentAudits: this.auditLog.slice(-10),
            encryptionStatus: this.encryption.enabled,
            accessControlStatus: this.accessControl.enabled,
            lastComplianceCheck: this.getLastComplianceCheck(),
            securityMetrics: this.getSecurityMetrics()
        };
    }

    // Private helper methods
    sanitizeObject(obj, depth = 0) {
        if (depth > this.piiDetection.scanDepth) return;

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                obj[key] = this.sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                this.sanitizeObject(value, depth + 1);
            }
        }
    }

    sanitizeString(str) {
        let sanitized = str;

        Object.entries(this.piiPatterns).forEach(([type, pattern]) => {
            const replacement = this.sanitizationRules.replacements[type];
            sanitized = sanitized.replace(pattern, replacement);
        });

        return sanitized;
    }

    removeSensitiveProperties(obj) {
        const sensitiveKeys = [
            'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'auth',
            'authorization', 'cookie', 'session', 'csrf', 'api_key', 'apikey'
        ];

        const removeSensitive = (current) => {
            if (typeof current !== 'object' || current === null) return;

            Object.keys(current).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                    current[key] = '[REDACTED]';
                } else if (typeof current[key] === 'object') {
                    removeSensitive(current[key]);
                }
            });
        };

        removeSensitive(obj);
    }

    applyTruncation(obj) {
        const truncate = (current) => {
            if (typeof current !== 'object' || current === null) return;

            Object.keys(current).forEach(key => {
                if (typeof current[key] === 'string' &&
                    current[key].length > this.sanitizationRules.truncateLength) {
                    current[key] = current[key].substring(0, this.sanitizationRules.truncateLength) + '[TRUNCATED]';
                } else if (typeof current[key] === 'object') {
                    truncate(current[key]);
                }
            });
        };

        truncate(obj);
    }

    anonymizeData(obj) {
        // Simple anonymization - replace identifiers with hashed versions
        const anonymize = (current) => {
            if (typeof current !== 'object' || current === null) return;

            Object.keys(current).forEach(key => {
                if (key.toLowerCase().includes('id') || key.toLowerCase().includes('user')) {
                    if (typeof current[key] === 'string') {
                        current[key] = this.hashString(current[key]);
                    }
                } else if (typeof current[key] === 'object') {
                    anonymize(current[key]);
                }
            });
        };

        anonymize(obj);
    }

    detectPiiInObject(obj, detections, depth = 0) {
        if (depth > this.piiDetection.scanDepth) return;

        Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'string') {
                const piiFound = this.detectPii(value);
                if (piiFound.length > 0) {
                    detections.push(...piiFound.map(pii => ({
                        ...pii,
                        location: key,
                        depth
                    })));
                }
            } else if (typeof value === 'object' && value !== null) {
                this.detectPiiInObject(value, detections, depth + 1);
            }
        });
    }

    calculatePiiConfidence(type, matches) {
        // Simple confidence calculation based on pattern type and matches
        const baseConfidence = {
            email: 0.9,
            phone: 0.8,
            creditCard: 0.95,
            ssn: 0.95,
            authToken: 0.85,
            apiKey: 0.85
        };

        return baseConfidence[type] || 0.7;
    }

    generateEncryptionKey() {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            return crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );
        }
        return null;
    }

    fallbackEncoding(data) {
        try {
            const str = typeof data === 'string' ? data : JSON.stringify(data);
            return {
                encoded: btoa(str),
                method: 'base64',
                timestamp: Date.now()
            };
        } catch (error) {
            return { error: 'Encoding failed', timestamp: Date.now() };
        }
    }

    fallbackDecoding(encodedData) {
        try {
            if (encodedData.encoded && encodedData.method === 'base64') {
                const decoded = atob(encodedData.encoded);
                try {
                    return JSON.parse(decoded);
                } catch {
                    return decoded;
                }
            }
            return encodedData;
        } catch (error) {
            return { error: 'Decoding failed' };
        }
    }

    getUserRole(userId) {
        // In production, this would lookup user role from backend
        // For now, return default role
        return this.accessControl.defaultRole;
    }

    getCurrentUserId() {
        return localStorage.getItem('userId') || 'anonymous';
    }

    getCurrentSessionId() {
        return sessionStorage.getItem('sessionId') || 'no-session';
    }

    getClientIpAddress() {
        // In production, this would be provided by backend
        return 'client-ip-hidden';
    }

    generateAuditId() {
        return 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    }

    persistAuditLog(entry) {
        try {
            const stored = JSON.parse(localStorage.getItem('security-audit-log') || '[]');
            stored.push(entry);

            // Keep only recent entries
            if (stored.length > 1000) {
                stored.splice(0, stored.length - 1000);
            }

            localStorage.setItem('security-audit-log', JSON.stringify(stored));
        } catch (error) {
            console.warn('[ErrorSecurity] Failed to persist audit log:', error);
        }
    }

    cleanupAuditLogs() {
        const cutoff = Date.now() - (this.auditLogging.retentionDays * 24 * 60 * 60 * 1000);

        // Clean in-memory logs
        this.auditLog = this.auditLog.filter(entry => entry.timestamp > cutoff);

        // Clean persistent logs
        try {
            const stored = JSON.parse(localStorage.getItem('security-audit-log') || '[]');
            const cleaned = stored.filter(entry => entry.timestamp > cutoff);
            localStorage.setItem('security-audit-log', JSON.stringify(cleaned));
        } catch (error) {
            console.warn('[ErrorSecurity] Failed to cleanup audit logs:', error);
        }
    }

    checkGdprCompliance() {
        if (!this.complianceSettings.gdpr.enabled) {
            return { status: 'not_applicable' };
        }

        const violations = [];

        // Check data retention
        if (!this.complianceSettings.gdpr.dataRetention) {
            violations.push('No data retention policy configured');
        }

        // Check right to erasure
        if (!this.complianceSettings.gdpr.rightToErasure) {
            violations.push('Right to erasure not implemented');
        }

        return {
            status: violations.length === 0 ? 'compliant' : 'violations',
            violations
        };
    }

    checkCcpaCompliance() {
        if (!this.complianceSettings.ccpa.enabled) {
            return { status: 'not_applicable' };
        }

        const violations = [];

        // Check opt-out rights
        if (!this.complianceSettings.ccpa.optOutRights) {
            violations.push('Opt-out rights not implemented');
        }

        return {
            status: violations.length === 0 ? 'compliant' : 'violations',
            violations
        };
    }

    checkDataRetention() {
        // Check if data retention policies are enforced
        const retentionDays = this.complianceSettings.gdpr.dataRetention || 30;
        const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

        // Count old audit entries (should be cleaned up)
        const oldEntries = this.auditLog.filter(entry => entry.timestamp < cutoff).length;

        return {
            status: oldEntries === 0 ? 'compliant' : 'violations',
            oldEntries,
            retentionDays
        };
    }

    checkSecurityCompliance() {
        const violations = [];

        // Check encryption
        if (this.complianceSettings.general.dataEncryption && !this.encryption.enabled) {
            violations.push('Data encryption required but not enabled');
        }

        // Check access logging
        if (this.complianceSettings.general.accessLogging && !this.auditLogging.enabled) {
            violations.push('Access logging required but not enabled');
        }

        return {
            status: violations.length === 0 ? 'compliant' : 'violations',
            violations
        };
    }

    getLastComplianceCheck() {
        // Find last compliance check in audit log
        const complianceAudits = this.auditLog
            .filter(entry => entry.action === 'Compliance violations detected')
            .sort((a, b) => b.timestamp - a.timestamp);

        return complianceAudits.length > 0 ? complianceAudits[0].timestamp : null;
    }

    getSecurityMetrics() {
        return {
            auditEntriesCount: this.auditLog.length,
            piiDetections: this.auditLog.filter(e => e.category === 'data_sanitization').length,
            accessDenials: this.auditLog.filter(e => e.details?.granted === false).length,
            securityEvents: this.auditLog.filter(e => e.category === 'security_event').length,
            encryptionOperations: this.auditLog.filter(e => e.action?.includes('ncryption')).length
        };
    }

    hashString(str) {
        // Simple hash for anonymization (in production, use proper crypto)
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(36);
    }
}

// Global security instance
window.ErrorSecurity = new ErrorSecurity();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorSecurity;
}