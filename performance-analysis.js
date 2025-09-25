/**
 * Performance Analysis Script for Issue #119
 * Analyzes the game files for potential performance issues and console errors
 */

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
    constructor() {
        this.results = {
            loadingSequence: [],
            potentialErrors: [],
            performanceIssues: [],
            recommendations: []
        };
    }

    analyzeProject() {
        console.log('🔍 Starting Performance Analysis...\n');

        // Analyze HTML loading sequence
        this.analyzeLoadingSequence();

        // Analyze JavaScript files for common issues
        this.analyzeJavaScriptFiles();

        // Generate report
        this.generateReport();
    }

    analyzeLoadingSequence() {
        console.log('📋 Analyzing Loading Sequence...');

        const htmlContent = fs.readFileSync('index.html', 'utf8');
        const scriptMatches = htmlContent.match(/<script[^>]*src="([^"]*)"[^>]*><\/script>/g);

        if (scriptMatches) {
            scriptMatches.forEach((script, index) => {
                const srcMatch = script.match(/src="([^"]*)"/);
                if (srcMatch) {
                    const src = srcMatch[1];
                    this.results.loadingSequence.push({
                        order: index + 1,
                        file: src,
                        exists: fs.existsSync(src)
                    });

                    if (!fs.existsSync(src)) {
                        this.results.potentialErrors.push({
                            type: 'Missing File',
                            file: src,
                            severity: 'high'
                        });
                    }
                }
            });
        }

        console.log(`   Found ${this.results.loadingSequence.length} script files to load`);
    }

    analyzeJavaScriptFiles() {
        console.log('📊 Analyzing JavaScript Files...');

        const jsFiles = this.getJSFiles('js');

        jsFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                this.analyzeFileContent(file, content);
            } catch (error) {
                this.results.potentialErrors.push({
                    type: 'File Read Error',
                    file: file,
                    error: error.message,
                    severity: 'medium'
                });
            }
        });
    }

    analyzeFileContent(file, content) {
        // Check for common error patterns
        const errorPatterns = [
            { pattern: /undefined is not a function/gi, issue: 'Undefined function calls' },
            { pattern: /Cannot read propert(y|ies) of (null|undefined)/gi, issue: 'Null/undefined property access' },
            { pattern: /console\.error/gi, issue: 'Error logging present' },
            { pattern: /console\.warn/gi, issue: 'Warning logging present' },
            { pattern: /throw new Error/gi, issue: 'Error throwing present' },
            { pattern: /\btry\s*\{[^}]*\}\s*catch/gi, issue: 'Try-catch blocks (error handling)' }
        ];

        // Check for performance issues
        const performancePatterns = [
            { pattern: /setInterval/gi, issue: 'setInterval usage (potential memory leak)' },
            { pattern: /setTimeout/gi, issue: 'setTimeout usage' },
            { pattern: /document\.querySelector/gi, issue: 'DOM queries (cache if repeated)' },
            { pattern: /document\.getElementById/gi, issue: 'DOM queries (cache if repeated)' },
            { pattern: /for\s*\([^)]*in\s+/gi, issue: 'for...in loops (slower than for...of)' },
            { pattern: /JSON\.parse/gi, issue: 'JSON parsing' },
            { pattern: /JSON\.stringify/gi, issue: 'JSON stringification' }
        ];

        errorPatterns.forEach(({ pattern, issue }) => {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                this.results.potentialErrors.push({
                    type: issue,
                    file: file.replace(/^.*[\\\/]/, ''), // Just filename
                    count: matches.length,
                    severity: issue.includes('Error') ? 'high' : 'medium'
                });
            }
        });

        performancePatterns.forEach(({ pattern, issue }) => {
            const matches = content.match(pattern);
            if (matches && matches.length > 2) { // Only report if many occurrences
                this.results.performanceIssues.push({
                    type: issue,
                    file: file.replace(/^.*[\\\/]/, ''), // Just filename
                    count: matches.length,
                    severity: 'medium'
                });
            }
        });

        // Check file size
        const stats = fs.statSync(file);
        if (stats.size > 50000) { // > 50KB
            this.results.performanceIssues.push({
                type: 'Large file size',
                file: file.replace(/^.*[\\\/]/, ''),
                size: `${Math.round(stats.size / 1024)}KB`,
                severity: 'low'
            });
        }
    }

    getJSFiles(dir) {
        let files = [];

        try {
            const items = fs.readdirSync(dir);

            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    files = files.concat(this.getJSFiles(fullPath));
                } else if (item.endsWith('.js')) {
                    files.push(fullPath);
                }
            });
        } catch (error) {
            // Directory might not exist
        }

        return files;
    }

    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📈 PERFORMANCE ANALYSIS REPORT');
        console.log('='.repeat(50));

        // Loading Sequence Report
        console.log('\n🔄 LOADING SEQUENCE:');
        this.results.loadingSequence.forEach(item => {
            const status = item.exists ? '✅' : '❌';
            console.log(`   ${item.order}. ${status} ${item.file}`);
        });

        // Missing Files
        const missingFiles = this.results.potentialErrors.filter(e => e.type === 'Missing File');
        if (missingFiles.length > 0) {
            console.log('\n❌ MISSING FILES:');
            missingFiles.forEach(error => {
                console.log(`   - ${error.file}`);
            });
        }

        // Error Analysis
        const errorsByType = {};
        this.results.potentialErrors.forEach(error => {
            if (error.type !== 'Missing File') {
                if (!errorsByType[error.type]) {
                    errorsByType[error.type] = [];
                }
                errorsByType[error.type].push(error);
            }
        });

        if (Object.keys(errorsByType).length > 0) {
            console.log('\n⚠️ POTENTIAL ERROR SOURCES:');
            Object.entries(errorsByType).forEach(([type, errors]) => {
                console.log(`\n   ${type}:`);
                errors.forEach(error => {
                    console.log(`   - ${error.file}: ${error.count || 1} occurrence(s)`);
                });
            });
        }

        // Performance Issues
        if (this.results.performanceIssues.length > 0) {
            console.log('\n⚡ PERFORMANCE CONCERNS:');
            this.results.performanceIssues.forEach(issue => {
                const detail = issue.count ? `${issue.count} occurrences` : issue.size || '';
                console.log(`   - ${issue.file}: ${issue.type} (${detail})`);
            });
        }

        // Generate Recommendations
        this.generateRecommendations();

        console.log('\n' + '='.repeat(50));
    }

    generateRecommendations() {
        const recs = [];

        // Missing files
        const missingFiles = this.results.potentialErrors.filter(e => e.type === 'Missing File');
        if (missingFiles.length > 0) {
            recs.push('🔧 Fix missing file references in index.html');
        }

        // Large files
        const largeFiles = this.results.performanceIssues.filter(i => i.type === 'Large file size');
        if (largeFiles.length > 0) {
            recs.push('📦 Consider code splitting or minification for large files');
        }

        // DOM queries
        const domQueries = this.results.performanceIssues.filter(i => i.type.includes('DOM queries'));
        if (domQueries.length > 0) {
            recs.push('🏎️ Cache DOM query results to improve performance');
        }

        // Error handling
        const errorHandling = this.results.potentialErrors.filter(e => e.type.includes('Error'));
        if (errorHandling.length > 0) {
            recs.push('🛡️ Review error handling and console.error usage');
        }

        // Timers
        const timers = this.results.performanceIssues.filter(i => i.type.includes('setInterval'));
        if (timers.length > 0) {
            recs.push('⏰ Audit timer usage for potential memory leaks');
        }

        if (recs.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            recs.forEach(rec => {
                console.log(`   ${rec}`);
            });
        }

        // Performance metrics
        console.log('\n📊 METRICS:');
        console.log(`   Total script files: ${this.results.loadingSequence.length}`);
        console.log(`   Missing files: ${missingFiles.length}`);
        console.log(`   Potential error sources: ${this.results.potentialErrors.filter(e => e.type !== 'Missing File').length}`);
        console.log(`   Performance concerns: ${this.results.performanceIssues.length}`);
    }
}

// Run the analysis
const analyzer = new PerformanceAnalyzer();
analyzer.analyzeProject();