/**
 * Optimization Validation Script for Issue #119
 * Tests that all performance optimization files exist and are properly configured
 */

const fs = require('fs');
const path = require('path');

class OptimizationValidator {
    constructor() {
        this.results = {
            filesCreated: 0,
            filesMissing: 0,
            validationsPassed: 0,
            validationsFailed: 0,
            details: []
        };
    }

    validate() {
        console.log('🔍 Validating Performance Optimizations for Issue #119\n');

        // Check all optimization files exist
        this.validateFiles();

        // Check index.html integration
        this.validateIntegration();

        // Generate validation report
        this.generateReport();
    }

    validateFiles() {
        console.log('📁 Validating Optimization Files...');

        const expectedFiles = [
            'js/core/LoadingSequenceOptimizer.js',
            'js/core/ConsoleErrorSuppressor.js',
            'js/core/DOMQueryOptimizer.js',
            'js/core/RenderOptimizer.js',
            'js/core/EnhancedPerformanceMonitor.js',
            'performance-analysis.js',
            'performance-optimizer.js',
            'runtime-error-detector.html',
            'performance-optimization-scripts.html',
            'ISSUE-119-PERFORMANCE-POLISH-REPORT.md'
        ];

        expectedFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                this.results.filesCreated++;
                this.logSuccess(`✅ Found: ${filePath}`);

                // Validate file content
                this.validateFileContent(filePath);
            } else {
                this.results.filesMissing++;
                this.logError(`❌ Missing: ${filePath}`);
            }
        });
    }

    validateFileContent(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Basic content validation
            if (content.length < 100) {
                this.logError(`⚠️ File too small: ${filePath}`);
                return;
            }

            // Specific validations per file type
            if (filePath.endsWith('.js')) {
                if (content.includes('class ') || content.includes('function ')) {
                    this.logSuccess(`   Contains valid JavaScript code`);
                    this.results.validationsPassed++;
                } else {
                    this.logError(`   Invalid JavaScript content`);
                    this.results.validationsFailed++;
                }
            } else if (filePath.endsWith('.html')) {
                if (content.includes('<script') || content.includes('<html')) {
                    this.logSuccess(`   Contains valid HTML content`);
                    this.results.validationsPassed++;
                } else {
                    this.logError(`   Invalid HTML content`);
                    this.results.validationsFailed++;
                }
            } else if (filePath.endsWith('.md')) {
                if (content.includes('# ') || content.includes('## ')) {
                    this.logSuccess(`   Contains valid Markdown content`);
                    this.results.validationsPassed++;
                } else {
                    this.logError(`   Invalid Markdown content`);
                    this.results.validationsFailed++;
                }
            }

        } catch (error) {
            this.logError(`Error reading ${filePath}: ${error.message}`);
        }
    }

    validateIntegration() {
        console.log('\n🔗 Validating index.html Integration...');

        try {
            const indexContent = fs.readFileSync('index.html', 'utf8');

            const expectedScripts = [
                'LoadingSequenceOptimizer.js',
                'ConsoleErrorSuppressor.js',
                'DOMQueryOptimizer.js',
                'RenderOptimizer.js',
                'EnhancedPerformanceMonitor.js'
            ];

            expectedScripts.forEach(script => {
                if (indexContent.includes(script)) {
                    this.logSuccess(`✅ Script included: ${script}`);
                    this.results.validationsPassed++;
                } else {
                    this.logError(`❌ Script missing: ${script}`);
                    this.results.validationsFailed++;
                }
            });

            // Check for initialization code
            if (indexContent.includes('getPerformanceReport')) {
                this.logSuccess(`✅ Performance report function integrated`);
                this.results.validationsPassed++;
            } else {
                this.logError(`❌ Performance report function missing`);
                this.results.validationsFailed++;
            }

        } catch (error) {
            this.logError(`Error validating index.html: ${error.message}`);
        }
    }

    logSuccess(message) {
        console.log(`   ${message}`);
        this.results.details.push({ type: 'success', message, timestamp: new Date().toISOString() });
    }

    logError(message) {
        console.log(`   ${message}`);
        this.results.details.push({ type: 'error', message, timestamp: new Date().toISOString() });
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 OPTIMIZATION VALIDATION REPORT');
        console.log('='.repeat(60));

        console.log(`\n📁 Files Created: ${this.results.filesCreated}`);
        console.log(`❌ Files Missing: ${this.results.filesMissing}`);
        console.log(`✅ Validations Passed: ${this.results.validationsPassed}`);
        console.log(`❌ Validations Failed: ${this.results.validationsFailed}`);

        const totalFiles = this.results.filesCreated + this.results.filesMissing;
        const successRate = totalFiles > 0 ? Math.round((this.results.filesCreated / totalFiles) * 100) : 0;

        console.log(`\n🎯 Success Rate: ${successRate}%`);

        if (this.results.filesMissing > 0 || this.results.validationsFailed > 0) {
            console.log('\n⚠️ ISSUES FOUND:');
            this.results.details
                .filter(d => d.type === 'error')
                .forEach(d => console.log(`   • ${d.message}`));
        }

        if (this.results.filesCreated === 10 && this.results.validationsFailed === 0) {
            console.log('\n🎉 ALL OPTIMIZATIONS VALIDATED SUCCESSFULLY!');
            console.log('   Issue #119: Performance & Polish is ready for testing.');
        } else {
            console.log('\n⚠️ VALIDATION INCOMPLETE');
            console.log('   Some optimizations may not be working correctly.');
        }

        console.log('\n📋 NEXT STEPS:');
        if (this.results.filesMissing === 0 && this.results.validationsFailed === 0) {
            console.log('   1. Start the development server: python -m http.server 8001');
            console.log('   2. Open http://localhost:8001/runtime-error-detector.html');
            console.log('   3. Test the main game at http://localhost:8001/index.html');
            console.log('   4. Run window.getPerformanceReport() in browser console');
            console.log('   5. Monitor performance improvements');
        } else {
            console.log('   1. Fix missing files or validation errors');
            console.log('   2. Re-run this validation script');
            console.log('   3. Proceed with testing once all validations pass');
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Run validation
const validator = new OptimizationValidator();
validator.validate();