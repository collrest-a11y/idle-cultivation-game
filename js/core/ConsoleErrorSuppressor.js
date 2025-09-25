
/**
 * Console Error Suppressor - Created by Performance Optimization
 * Reduces console noise while preserving important error information
 */
class ConsoleErrorSuppressor {
    constructor() {
        this.suppressedPatterns = [
            /Font loading/i,
            /Failed to load resource.*\.(woff|ttf|eot)/i,
            /Non-critical warning/i
        ];
        this.originalConsole = {
            error: console.error,
            warn: console.warn,
            log: console.log
        };
        this.errorCounts = {
            errors: 0,
            warnings: 0,
            suppressed: 0
        };
        this.init();
    }

    init() {
        console.error = (...args) => {
            const message = args.join(' ');
            if (this.shouldSuppress(message)) {
                this.errorCounts.suppressed++;
                return;
            }
            this.errorCounts.errors++;
            this.originalConsole.error.apply(console, args);
        };

        console.warn = (...args) => {
            const message = args.join(' ');
            if (this.shouldSuppress(message)) {
                this.errorCounts.suppressed++;
                return;
            }
            this.errorCounts.warnings++;
            this.originalConsole.warn.apply(console, args);
        };
    }

    shouldSuppress(message) {
        return this.suppressedPatterns.some(pattern => pattern.test(message));
    }

    getStats() {
        return { ...this.errorCounts };
    }

    restore() {
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.log = this.originalConsole.log;
    }
}

// Initialize suppressor for production
if (typeof window !== 'undefined' && !window.location.search.includes('debug=true')) {
    window.consoleErrorSuppressor = new ConsoleErrorSuppressor();
}
