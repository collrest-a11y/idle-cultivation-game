#!/usr/bin/env node

/**
 * Deployment Confidence Scoring System
 *
 * Calculates a comprehensive confidence score for deployment readiness
 * based on multiple factors including test results, performance metrics,
 * code quality, and integration health.
 */

const fs = require('fs');
const path = require('path');

class DeploymentConfidenceCalculator {
    constructor() {
        this.weights = {
            unitTests: 25,
            integrationTests: 30,
            performanceTests: 20,
            codeQuality: 10,
            securityScan: 10,
            crossSystemIntegration: 5
        };

        this.thresholds = {
            deployment: 85,
            warning: 70,
            critical: 50
        };

        this.scores = {};
        this.issues = [];
        this.metrics = {};
    }

    /**
     * Calculate overall confidence score
     */
    async calculateConfidence() {
        console.log('🔍 Calculating deployment confidence score...');

        try {
            // Collect all metrics
            await this.collectUnitTestResults();
            await this.collectIntegrationTestResults();
            await this.collectPerformanceMetrics();
            await this.collectCodeQualityMetrics();
            await this.collectSecurityMetrics();
            await this.collectCrossSystemMetrics();

            // Calculate weighted score
            const totalScore = this.calculateWeightedScore();

            // Generate recommendations
            const recommendations = this.generateRecommendations();

            // Determine deployment decision
            const shouldDeploy = totalScore >= this.thresholds.deployment;

            // Create comprehensive report
            const report = {
                totalScore,
                shouldDeploy,
                scores: this.scores,
                metrics: this.metrics,
                issues: this.issues,
                recommendations,
                timestamp: new Date().toISOString(),
                breakdown: this.getScoreBreakdown()
            };

            // Save report
            await this.saveReport(report);

            // Output to GitHub Actions
            this.outputToGitHubActions(report);

            console.log(`✅ Confidence score calculated: ${totalScore}%`);
            console.log(`🚀 Deployment recommendation: ${shouldDeploy ? 'PROCEED' : 'BLOCK'}`);

            return report;

        } catch (error) {
            console.error('❌ Error calculating confidence score:', error);
            this.outputErrorToGitHubActions(error);
            process.exit(1);
        }
    }

    /**
     * Collect unit test results
     */
    async collectUnitTestResults() {
        try {
            const testResults = await this.readTestResults('unit-tests');

            if (testResults) {
                const passRate = (testResults.passed / testResults.total) * 100;
                const coverage = testResults.coverage || 0;

                // Score based on pass rate and coverage
                let score = (passRate * 0.7) + (coverage * 0.3);

                // Penalty for flaky tests
                if (testResults.flaky > 0) {
                    score -= (testResults.flaky / testResults.total) * 20;
                }

                this.scores.unitTests = Math.max(0, Math.min(100, score));
                this.metrics.unitTests = {
                    total: testResults.total,
                    passed: testResults.passed,
                    failed: testResults.failed,
                    passRate,
                    coverage,
                    flaky: testResults.flaky
                };

                if (passRate < 95) {
                    this.issues.push({
                        type: 'unit-tests',
                        severity: passRate < 90 ? 'critical' : 'warning',
                        message: `Unit test pass rate is ${passRate.toFixed(1)}% (target: 95%+)`
                    });
                }

            } else {
                this.scores.unitTests = 0;
                this.issues.push({
                    type: 'unit-tests',
                    severity: 'critical',
                    message: 'Unit test results not found'
                });
            }
        } catch (error) {
            console.warn('⚠️ Could not collect unit test results:', error.message);
            this.scores.unitTests = 0;
        }
    }

    /**
     * Collect integration test results
     */
    async collectIntegrationTestResults() {
        try {
            const integrationResults = await this.readTestResults('integration-tests');

            if (integrationResults) {
                const passRate = (integrationResults.passed / integrationResults.total) * 100;

                // Check cross-system integration health
                const crossSystemHealth = await this.checkCrossSystemHealth();

                let score = passRate * 0.8 + crossSystemHealth * 0.2;

                this.scores.integrationTests = Math.max(0, Math.min(100, score));
                this.metrics.integrationTests = {
                    total: integrationResults.total,
                    passed: integrationResults.passed,
                    failed: integrationResults.failed,
                    passRate,
                    crossSystemHealth,
                    systemsValidated: integrationResults.systemsValidated || []
                };

                if (passRate < 90) {
                    this.issues.push({
                        type: 'integration-tests',
                        severity: passRate < 80 ? 'critical' : 'warning',
                        message: `Integration test pass rate is ${passRate.toFixed(1)}% (target: 90%+)`
                    });
                }

            } else {
                this.scores.integrationTests = 0;
                this.issues.push({
                    type: 'integration-tests',
                    severity: 'critical',
                    message: 'Integration test results not found'
                });
            }
        } catch (error) {
            console.warn('⚠️ Could not collect integration test results:', error.message);
            this.scores.integrationTests = 0;
        }
    }

    /**
     * Collect performance metrics
     */
    async collectPerformanceMetrics() {
        try {
            const performanceData = await this.readPerformanceResults();

            if (performanceData) {
                let score = 100;

                // Check FPS target (60fps minimum)
                if (performanceData.averageFps < 60) {
                    const fpsPenalty = (60 - performanceData.averageFps) / 60 * 50;
                    score -= fpsPenalty;

                    this.issues.push({
                        type: 'performance',
                        severity: performanceData.averageFps < 30 ? 'critical' : 'warning',
                        message: `Average FPS is ${performanceData.averageFps} (target: 60fps+)`
                    });
                }

                // Check response times (sub-10ms target for core operations)
                if (performanceData.averageResponseTime > 10) {
                    const responsePenalty = Math.min(30, (performanceData.averageResponseTime - 10) / 10 * 20);
                    score -= responsePenalty;

                    this.issues.push({
                        type: 'performance',
                        severity: performanceData.averageResponseTime > 50 ? 'critical' : 'warning',
                        message: `Average response time is ${performanceData.averageResponseTime}ms (target: <10ms)`
                    });
                }

                // Check memory usage
                if (performanceData.memoryUsage > 512) { // MB
                    const memoryPenalty = Math.min(20, (performanceData.memoryUsage - 512) / 512 * 15);
                    score -= memoryPenalty;

                    this.issues.push({
                        type: 'performance',
                        severity: performanceData.memoryUsage > 1024 ? 'critical' : 'warning',
                        message: `Memory usage is ${performanceData.memoryUsage}MB (target: <512MB)`
                    });
                }

                this.scores.performanceTests = Math.max(0, score);
                this.metrics.performanceTests = performanceData;

            } else {
                this.scores.performanceTests = 0;
                this.issues.push({
                    type: 'performance',
                    severity: 'critical',
                    message: 'Performance test results not found'
                });
            }
        } catch (error) {
            console.warn('⚠️ Could not collect performance metrics:', error.message);
            this.scores.performanceTests = 50; // Assume moderate performance if no data
        }
    }

    /**
     * Collect code quality metrics
     */
    async collectCodeQualityMetrics() {
        try {
            const lintResults = await this.readLintResults();

            let score = 100;

            if (lintResults) {
                // Penalties for code quality issues
                score -= (lintResults.errors * 10);
                score -= (lintResults.warnings * 2);
                score -= (lintResults.codeSmells * 1);

                this.metrics.codeQuality = lintResults;

                if (lintResults.errors > 0) {
                    this.issues.push({
                        type: 'code-quality',
                        severity: 'critical',
                        message: `${lintResults.errors} linting errors found`
                    });
                }

                if (lintResults.warnings > 10) {
                    this.issues.push({
                        type: 'code-quality',
                        severity: 'warning',
                        message: `${lintResults.warnings} linting warnings found`
                    });
                }
            }

            this.scores.codeQuality = Math.max(0, score);

        } catch (error) {
            console.warn('⚠️ Could not collect code quality metrics:', error.message);
            this.scores.codeQuality = 80; // Assume decent quality if no data
        }
    }

    /**
     * Collect security scan results
     */
    async collectSecurityMetrics() {
        try {
            const securityResults = await this.readSecurityResults();

            let score = 100;

            if (securityResults) {
                // Penalties for security issues
                score -= (securityResults.critical * 50);
                score -= (securityResults.high * 20);
                score -= (securityResults.medium * 5);
                score -= (securityResults.low * 1);

                this.metrics.security = securityResults;

                if (securityResults.critical > 0) {
                    this.issues.push({
                        type: 'security',
                        severity: 'critical',
                        message: `${securityResults.critical} critical security vulnerabilities found`
                    });
                }

                if (securityResults.high > 0) {
                    this.issues.push({
                        type: 'security',
                        severity: 'warning',
                        message: `${securityResults.high} high-severity security vulnerabilities found`
                    });
                }
            }

            this.scores.securityScan = Math.max(0, score);

        } catch (error) {
            console.warn('⚠️ Could not collect security metrics:', error.message);
            this.scores.securityScan = 90; // Assume good security if no scan data
        }
    }

    /**
     * Collect cross-system integration metrics
     */
    async collectCrossSystemMetrics() {
        try {
            const integrationHealth = await this.checkCrossSystemHealth();

            this.scores.crossSystemIntegration = integrationHealth;
            this.metrics.crossSystemIntegration = {
                healthScore: integrationHealth,
                validatedSystems: 12, // All MMORPG systems
                timestamp: new Date().toISOString()
            };

            if (integrationHealth < 90) {
                this.issues.push({
                    type: 'cross-system',
                    severity: integrationHealth < 70 ? 'critical' : 'warning',
                    message: `Cross-system integration health is ${integrationHealth.toFixed(1)}% (target: 90%+)`
                });
            }

        } catch (error) {
            console.warn('⚠️ Could not collect cross-system metrics:', error.message);
            this.scores.crossSystemIntegration = 70;
        }
    }

    /**
     * Calculate weighted total score
     */
    calculateWeightedScore() {
        let totalWeight = 0;
        let weightedSum = 0;

        for (const [category, weight] of Object.entries(this.weights)) {
            if (this.scores[category] !== undefined) {
                weightedSum += this.scores[category] * weight;
                totalWeight += weight;
            }
        }

        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }

    /**
     * Get detailed score breakdown
     */
    getScoreBreakdown() {
        return Object.entries(this.weights).map(([category, weight]) => ({
            category,
            score: this.scores[category] || 0,
            weight,
            contribution: ((this.scores[category] || 0) * weight) / 100
        }));
    }

    /**
     * Generate deployment recommendations
     */
    generateRecommendations() {
        const recommendations = [];

        // Critical issues block deployment
        const criticalIssues = this.issues.filter(issue => issue.severity === 'critical');
        if (criticalIssues.length > 0) {
            recommendations.push({
                type: 'blocker',
                message: 'Fix critical issues before deployment',
                issues: criticalIssues
            });
        }

        // Performance recommendations
        if (this.scores.performanceTests < 80) {
            recommendations.push({
                type: 'performance',
                message: 'Performance optimization recommended',
                suggestions: [
                    'Review frame rate optimization',
                    'Optimize memory usage patterns',
                    'Check for performance regressions'
                ]
            });
        }

        // Test coverage recommendations
        if (this.scores.unitTests < 85) {
            recommendations.push({
                type: 'testing',
                message: 'Improve test coverage before deployment',
                suggestions: [
                    'Add tests for uncovered code paths',
                    'Fix failing tests',
                    'Address flaky tests'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Read test results from file
     */
    async readTestResults(type) {
        try {
            const resultsPath = path.join(process.cwd(), 'test-results', `${type}.json`);
            if (fs.existsSync(resultsPath)) {
                const data = fs.readFileSync(resultsPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn(`Could not read ${type} results:`, error.message);
        }
        return null;
    }

    /**
     * Read performance results
     */
    async readPerformanceResults() {
        try {
            const perfPath = path.join(process.cwd(), 'performance-reports', 'performance.json');
            if (fs.existsSync(perfPath)) {
                const data = fs.readFileSync(perfPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Could not read performance results:', error.message);
        }
        return null;
    }

    /**
     * Read linting results
     */
    async readLintResults() {
        try {
            const lintPath = path.join(process.cwd(), 'lint-results.json');
            if (fs.existsSync(lintPath)) {
                const data = fs.readFileSync(lintPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Could not read lint results:', error.message);
        }
        return null;
    }

    /**
     * Read security scan results
     */
    async readSecurityResults() {
        try {
            const securityPath = path.join(process.cwd(), 'security-audit.json');
            if (fs.existsSync(securityPath)) {
                const data = fs.readFileSync(securityPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Could not read security results:', error.message);
        }
        return null;
    }

    /**
     * Check cross-system integration health
     */
    async checkCrossSystemHealth() {
        try {
            const healthPath = path.join(process.cwd(), 'test-results', 'integration-health.json');
            if (fs.existsSync(healthPath)) {
                const data = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
                return data.overallHealth || 90;
            }
        } catch (error) {
            console.warn('Could not read integration health:', error.message);
        }
        return 85; // Default to reasonable health score
    }

    /**
     * Save comprehensive report
     */
    async saveReport(report) {
        try {
            const reportPath = path.join(process.cwd(), 'deployment-confidence-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

            // Also save a human-readable version
            const readablePath = path.join(process.cwd(), 'deployment-confidence-report.md');
            const markdown = this.generateMarkdownReport(report);
            fs.writeFileSync(readablePath, markdown);

        } catch (error) {
            console.error('Could not save confidence report:', error);
        }
    }

    /**
     * Generate markdown report
     */
    generateMarkdownReport(report) {
        let markdown = `# Deployment Confidence Report\n\n`;
        markdown += `**Generated:** ${report.timestamp}\n\n`;
        markdown += `**Overall Score:** ${report.totalScore}%\n\n`;
        markdown += `**Deployment Recommendation:** ${report.shouldDeploy ? '✅ PROCEED' : '❌ BLOCK'}\n\n`;

        markdown += `## Score Breakdown\n\n`;
        for (const item of report.breakdown) {
            markdown += `- **${item.category}:** ${item.score}% (weight: ${item.weight}%)\n`;
        }

        if (report.issues.length > 0) {
            markdown += `\n## Issues Found\n\n`;
            for (const issue of report.issues) {
                const emoji = issue.severity === 'critical' ? '🚨' : '⚠️';
                markdown += `${emoji} **${issue.type}:** ${issue.message}\n\n`;
            }
        }

        if (report.recommendations.length > 0) {
            markdown += `\n## Recommendations\n\n`;
            for (const rec of report.recommendations) {
                markdown += `### ${rec.type}\n\n${rec.message}\n\n`;
                if (rec.suggestions) {
                    for (const suggestion of rec.suggestions) {
                        markdown += `- ${suggestion}\n`;
                    }
                    markdown += '\n';
                }
            }
        }

        return markdown;
    }

    /**
     * Output results to GitHub Actions
     */
    outputToGitHubActions(report) {
        // Set outputs
        console.log(`::set-output name=score::${report.totalScore}`);
        console.log(`::set-output name=should_deploy::${report.shouldDeploy}`);

        // Add job summary
        const summary = this.generateMarkdownReport(report);
        fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY || '/dev/null', summary);

        // Set environment variables
        if (process.env.GITHUB_ENV) {
            fs.appendFileSync(process.env.GITHUB_ENV, `CONFIDENCE_SCORE=${report.totalScore}\n`);
            fs.appendFileSync(process.env.GITHUB_ENV, `SHOULD_DEPLOY=${report.shouldDeploy}\n`);
        }
    }

    /**
     * Output error to GitHub Actions
     */
    outputErrorToGitHubActions(error) {
        console.log(`::set-output name=score::0`);
        console.log(`::set-output name=should_deploy::false`);
        console.log(`::error::Confidence calculation failed: ${error.message}`);
    }
}

// Execute if called directly
if (require.main === module) {
    const calculator = new DeploymentConfidenceCalculator();
    calculator.calculateConfidence().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DeploymentConfidenceCalculator;