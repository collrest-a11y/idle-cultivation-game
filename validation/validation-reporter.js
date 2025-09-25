import fs from 'fs-extra';
import path from 'path';

/**
 * ValidationReporter - Comprehensive reporting for fix validation results
 *
 * This class generates detailed reports on validation results in multiple
 * formats for different audiences (technical, summary, etc.).
 */
export class ValidationReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './validation-reports';
    this.includeCharts = options.includeCharts || false;
    this.timestampFormat = options.timestampFormat || 'YYYY-MM-DD_HH-mm-ss';
  }

  /**
   * Initialize the reporter
   */
  async initialize() {
    await fs.ensureDir(this.outputDir);
  }

  /**
   * Generates comprehensive validation report
   * @param {Object} validationResults - Complete validation results
   * @param {Object} options - Reporting options
   * @returns {Object} Generated report information
   */
  async generateReport(validationResults, options = {}) {
    const reportId = this.generateReportId();
    const reportDir = path.join(this.outputDir, reportId);

    await fs.ensureDir(reportDir);

    try {
      console.log(`Generating validation report ${reportId}...`);

      const report = {
        id: reportId,
        timestamp: new Date().toISOString(),
        validationResults,
        summary: this.generateSummary(validationResults),
        analysis: this.generateAnalysis(validationResults),
        recommendations: this.generateRecommendations(validationResults)
      };

      // Generate different report formats
      const outputs = await Promise.all([
        this.generateTechnicalReport(report, reportDir),
        this.generateExecutiveSummary(report, reportDir),
        this.generateHTMLReport(report, reportDir),
        this.generateJSONReport(report, reportDir)
      ]);

      // Generate charts if requested
      if (this.includeCharts && validationResults.stages.performance) {
        await this.generatePerformanceCharts(validationResults, reportDir);
      }

      console.log(`Validation report generated: ${reportDir}`);

      return {
        reportId,
        reportDir,
        outputs: outputs.flat(),
        summary: report.summary
      };
    } catch (error) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate technical report for developers
   */
  async generateTechnicalReport(report, reportDir) {
    const content = this.formatTechnicalReport(report);
    const filePath = path.join(reportDir, 'technical-report.md');

    await fs.writeFile(filePath, content);

    return {
      type: 'technical',
      format: 'markdown',
      path: filePath,
      size: content.length
    };
  }

  /**
   * Generate executive summary for stakeholders
   */
  async generateExecutiveSummary(report, reportDir) {
    const content = this.formatExecutiveSummary(report);
    const filePath = path.join(reportDir, 'executive-summary.md');

    await fs.writeFile(filePath, content);

    return {
      type: 'executive',
      format: 'markdown',
      path: filePath,
      size: content.length
    };
  }

  /**
   * Generate interactive HTML report
   */
  async generateHTMLReport(report, reportDir) {
    const content = this.formatHTMLReport(report);
    const filePath = path.join(reportDir, 'report.html');

    await fs.writeFile(filePath, content);

    return {
      type: 'interactive',
      format: 'html',
      path: filePath,
      size: content.length
    };
  }

  /**
   * Generate machine-readable JSON report
   */
  async generateJSONReport(report, reportDir) {
    const filePath = path.join(reportDir, 'validation-results.json');

    await fs.writeJSON(filePath, report, { spaces: 2 });

    return {
      type: 'data',
      format: 'json',
      path: filePath,
      size: JSON.stringify(report).length
    };
  }

  /**
   * Format technical report content
   */
  formatTechnicalReport(report) {
    const { validationResults, summary, analysis, recommendations } = report;
    const results = validationResults;

    return `# Fix Validation Technical Report

**Report ID:** ${report.id}
**Generated:** ${report.timestamp}
**Fix Description:** ${results.fix?.description || 'N/A'}
**Target Error:** ${results.error?.type || 'Unknown'}

## Overall Result

**Validation Score:** ${results.score}/100
**Recommendation:** ${results.recommendation.action}
**Confidence:** ${results.recommendation.confidence}

${results.recommendation.reasoning}

## Validation Stages

### 1. Syntax Validation
${this.formatStageResult('✅', '❌', results.stages.syntax.passed)}
- **Files Checked:** ${results.stages.syntax.filesChecked}
- **Errors:** ${results.stages.syntax.errors.length}

${results.stages.syntax.errors.length > 0 ? `
**Error Details:**
${results.stages.syntax.errors.map(e => `- ${e.file}: ${e.message}`).join('\n')}
` : ''}

### 2. Functional Validation
${this.formatStageResult('✅', '❌', results.stages.functional.passed)}
- **Original Error Fixed:** ${results.stages.functional.originalErrorFixed ? 'Yes' : 'No'}
- **Basic Functionality:** ${results.stages.functional.functionalityIntact ? 'Working' : 'Broken'}
- **New Errors Detected:** ${results.stages.functional.errorCount}

${results.stages.functional.newErrors?.length > 0 ? `
**New Errors:**
${results.stages.functional.newErrors.slice(0, 5).map(e => `- ${e.message || e}`).join('\n')}
` : ''}

### 3. Regression Testing
${this.formatStageResult('✅', '❌', results.stages.regression.passed)}
- **Tests Run:** ${results.stages.regression.total}
- **Passed:** ${results.stages.regression.passed}
- **Failed:** ${results.stages.regression.failed}

${results.stages.regression.failures?.length > 0 ? `
**Failed Tests:**
${results.stages.regression.failures.slice(0, 5).map(f => `- ${f.test}: ${f.error}`).join('\n')}
` : ''}

### 4. Performance Impact
${this.formatStageResult('✅', '❌', results.stages.performance.passed)}
- **Load Time:** ${results.stages.performance.loadTime}ms (threshold: ${results.stages.performance.thresholds?.maxLoadTime || 'N/A'}ms)
- **Average FPS:** ${Math.round(results.stages.performance.avgFps || 0)} (threshold: ${results.stages.performance.thresholds?.minAvgFps || 'N/A'})
- **Memory Usage:** ${Math.round(results.stages.performance.avgMemoryMB || 0)}MB (threshold: ${results.stages.performance.thresholds?.maxMemoryMB || 'N/A'}MB)

### 5. Side Effect Detection
${this.formatStageResult('✅', '❌', !results.stages.sideEffects.detected)}
- **Side Effects Detected:** ${results.stages.sideEffects.count}

${results.stages.sideEffects.sideEffects?.length > 0 ? `
**Side Effects:**
${results.stages.sideEffects.sideEffects.map(se => `- ${se.type}: ${se.severity}`).join('\n')}
` : ''}

## Detailed Analysis

${analysis.riskAssessment}

**Critical Issues:** ${analysis.criticalIssues.length}
${analysis.criticalIssues.map(issue => `- ${issue}`).join('\n')}

**Warnings:** ${analysis.warnings.length}
${analysis.warnings.map(warning => `- ${warning}`).join('\n')}

## Recommendations

${recommendations.immediate.length > 0 ? `
### Immediate Actions Required
${recommendations.immediate.map(rec => `- ${rec}`).join('\n')}
` : ''}

${recommendations.followUp.length > 0 ? `
### Follow-up Actions
${recommendations.followUp.map(rec => `- ${rec}`).join('\n')}
` : ''}

${recommendations.monitoring.length > 0 ? `
### Monitoring Recommendations
${recommendations.monitoring.map(rec => `- ${rec}`).join('\n')}
` : ''}

## Context Information

**Sandbox ID:** ${results.sandboxId}
**Fix Application Context:**
- **File:** ${results.context?.file || 'N/A'}
- **Line:** ${results.context?.line || 'N/A'}
- **Type:** ${results.fix?.type || 'N/A'}

**Environment:**
- **Timestamp:** ${results.timestamp}
- **Node Version:** ${process.version}
- **Platform:** ${process.platform}

---
*Generated by ValidationReporter v1.0*
`;
  }

  /**
   * Format executive summary content
   */
  formatExecutiveSummary(report) {
    const { validationResults, summary, recommendations } = report;

    return `# Fix Validation Executive Summary

**Report ID:** ${report.id}
**Date:** ${new Date(report.timestamp).toLocaleDateString()}
**Fix Target:** ${validationResults.error?.type || 'System Enhancement'}

## Key Findings

### Overall Assessment
- **Validation Score:** ${validationResults.score}/100 (${this.getScoreGrade(validationResults.score)})
- **Recommendation:** **${validationResults.recommendation.action}**
- **Confidence Level:** ${validationResults.recommendation.confidence}

### Risk Assessment
${summary.riskLevel === 'LOW' ? '🟢' : summary.riskLevel === 'MEDIUM' ? '🟡' : '🔴'} **${summary.riskLevel} RISK**

${validationResults.recommendation.reasoning}

## Validation Results Summary

| Stage | Result | Impact |
|-------|--------|--------|
| Syntax | ${validationResults.stages.syntax.passed ? '✅ Pass' : '❌ Fail'} | ${validationResults.stages.syntax.passed ? 'None' : 'High'} |
| Functionality | ${validationResults.stages.functional.passed ? '✅ Pass' : '❌ Fail'} | ${validationResults.stages.functional.passed ? 'None' : 'Critical'} |
| Regression | ${validationResults.stages.regression.passed ? '✅ Pass' : '❌ Fail'} | ${validationResults.stages.regression.passed ? 'None' : 'High'} |
| Performance | ${validationResults.stages.performance.passed ? '✅ Pass' : '❌ Fail'} | ${validationResults.stages.performance.passed ? 'None' : 'Medium'} |
| Side Effects | ${!validationResults.stages.sideEffects.detected ? '✅ Pass' : '❌ Fail'} | ${!validationResults.stages.sideEffects.detected ? 'None' : 'Medium'} |

## Key Metrics

- **Original Error Resolution:** ${validationResults.stages.functional.originalErrorFixed ? 'Fixed' : 'Not Fixed'}
- **Test Success Rate:** ${Math.round((validationResults.stages.regression.passed / validationResults.stages.regression.total) * 100)}%
- **Performance Impact:** ${validationResults.stages.performance.passed ? 'Minimal' : 'Significant'}

## Immediate Actions Required

${recommendations.immediate.length > 0 ?
  recommendations.immediate.map(rec => `- ${rec}`).join('\n') :
  '✅ No immediate actions required'
}

## Next Steps

${this.getNextStepsText(validationResults.recommendation.action)}

---
*This summary provides a high-level overview of the fix validation results. Refer to the technical report for detailed implementation guidance.*
`;
  }

  /**
   * Format interactive HTML report
   */
  formatHTMLReport(report) {
    const { validationResults, summary, analysis, recommendations } = report;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fix Validation Report - ${report.id}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .score-circle { display: inline-block; width: 80px; height: 80px; border-radius: 50%; text-align: center; line-height: 80px; font-size: 24px; font-weight: bold; margin-right: 20px; }
        .score-high { background: #4caf50; color: white; }
        .score-medium { background: #ff9800; color: white; }
        .score-low { background: #f44336; color: white; }
        .stage { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ccc; }
        .stage.passed { border-left-color: #4caf50; }
        .stage.failed { border-left-color: #f44336; }
        .stage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .stage-title { font-size: 18px; font-weight: 600; }
        .stage-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status-pass { background: #4caf50; color: white; }
        .status-fail { background: #f44336; color: white; }
        .metric { display: inline-block; margin: 5px 15px 5px 0; padding: 5px 10px; background: #e9ecef; border-radius: 3px; font-size: 14px; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0; }
        .critical-issues { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin: 20px 0; }
        .tabs { display: flex; border-bottom: 2px solid #e9ecef; margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.3s; }
        .tab.active { border-bottom-color: #667eea; color: #667eea; font-weight: 600; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .progress-bar { width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.5s; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Fix Validation Report</h1>
            <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
            <p>Report ID: ${report.id}</p>
        </div>

        <div class="content">
            <div style="display: flex; align-items: center; margin-bottom: 30px;">
                <div class="score-circle ${this.getScoreClass(validationResults.score)}">
                    ${validationResults.score}
                </div>
                <div>
                    <h2 style="margin: 0;">Overall Assessment</h2>
                    <p style="margin: 5px 0; font-size: 18px;"><strong>${validationResults.recommendation.action}</strong></p>
                    <p style="margin: 5px 0; color: #666;">${validationResults.recommendation.reasoning}</p>
                </div>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${validationResults.score}%"></div>
            </div>

            <div class="tabs">
                <div class="tab active" onclick="showTab('overview')">Overview</div>
                <div class="tab" onclick="showTab('stages')">Validation Stages</div>
                <div class="tab" onclick="showTab('analysis')">Analysis</div>
                <div class="tab" onclick="showTab('recommendations')">Recommendations</div>
            </div>

            <div id="overview" class="tab-content active">
                <h3>Validation Summary</h3>
                ${this.formatOverviewHTML(validationResults, summary)}
            </div>

            <div id="stages" class="tab-content">
                <h3>Detailed Validation Results</h3>
                ${this.formatStagesHTML(validationResults.stages)}
            </div>

            <div id="analysis" class="tab-content">
                <h3>Technical Analysis</h3>
                ${this.formatAnalysisHTML(analysis)}
            </div>

            <div id="recommendations" class="tab-content">
                <h3>Recommendations & Next Steps</h3>
                ${this.formatRecommendationsHTML(recommendations)}
            </div>
        </div>
    </div>

    <script>
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab content
            document.getElementById(tabName).classList.add('active');

            // Add active class to selected tab
            event.target.classList.add('active');
        }
    </script>
</body>
</html>`;
  }

  /**
   * Generate summary from validation results
   */
  generateSummary(validationResults) {
    const stages = validationResults.stages;
    const passedStages = Object.values(stages).filter(stage =>
      stage.passed || !stage.detected
    ).length;
    const totalStages = Object.keys(stages).length;

    return {
      score: validationResults.score,
      stagesPassed: passedStages,
      stagesTotal: totalStages,
      successRate: Math.round((passedStages / totalStages) * 100),
      riskLevel: this.assessRiskLevel(validationResults),
      recommendation: validationResults.recommendation.action,
      confidence: validationResults.recommendation.confidence,
      criticalIssues: this.extractCriticalIssues(stages),
      fixType: validationResults.fix?.type || 'unknown',
      targetError: validationResults.error?.type || 'unknown'
    };
  }

  /**
   * Generate detailed analysis
   */
  generateAnalysis(validationResults) {
    const stages = validationResults.stages;
    const criticalIssues = this.extractCriticalIssues(stages);
    const warnings = this.extractWarnings(stages);

    return {
      riskAssessment: this.generateRiskAssessment(validationResults),
      criticalIssues,
      warnings,
      impactAnalysis: this.generateImpactAnalysis(stages),
      technicalNotes: this.generateTechnicalNotes(validationResults)
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(validationResults) {
    const immediate = [];
    const followUp = [];
    const monitoring = [];

    const stages = validationResults.stages;

    // Immediate actions
    if (!stages.syntax.passed) {
      immediate.push('Fix syntax errors before deployment');
    }

    if (!stages.functional.passed) {
      if (!stages.functional.originalErrorFixed) {
        immediate.push('Fix does not resolve the original error - requires revision');
      }
      if (stages.functional.errorCount > 0) {
        immediate.push(`Address ${stages.functional.errorCount} new functional errors`);
      }
    }

    if (!stages.regression.passed) {
      immediate.push(`Fix ${stages.regression.failed} failed regression tests`);
    }

    // Follow-up actions
    if (!stages.performance.passed) {
      followUp.push('Optimize performance impact before production deployment');
    }

    if (stages.sideEffects.detected) {
      followUp.push(`Review and address ${stages.sideEffects.count} detected side effects`);
    }

    // Monitoring recommendations
    if (validationResults.recommendation.action === 'APPLY_WITH_MONITORING') {
      monitoring.push('Monitor application for 24 hours after deployment');
      monitoring.push('Set up alerts for error rates and performance metrics');
    }

    if (validationResults.score < 85) {
      monitoring.push('Perform additional testing in staging environment');
    }

    return {
      immediate,
      followUp,
      monitoring
    };
  }

  /**
   * Helper methods
   */

  generateReportId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const random = Math.random().toString(36).substr(2, 6);
    return `validation-${timestamp}-${random}`;
  }

  formatStageResult(passIcon, failIcon, passed) {
    return passed ? `${passIcon} **PASSED**` : `${failIcon} **FAILED**`;
  }

  getScoreGrade(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  }

  getScoreClass(score) {
    if (score >= 75) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  }

  assessRiskLevel(validationResults) {
    if (validationResults.score >= 85) return 'LOW';
    if (validationResults.score >= 60) return 'MEDIUM';
    return 'HIGH';
  }

  extractCriticalIssues(stages) {
    const issues = [];

    if (!stages.syntax.passed) {
      issues.push(`Syntax errors in ${stages.syntax.errors.length} files`);
    }

    if (!stages.functional.passed && !stages.functional.originalErrorFixed) {
      issues.push('Original error not resolved by fix');
    }

    if (!stages.regression.passed) {
      issues.push(`${stages.regression.failed} regression test failures`);
    }

    return issues;
  }

  extractWarnings(stages) {
    const warnings = [];

    if (!stages.performance.passed) {
      warnings.push('Performance degradation detected');
    }

    if (stages.sideEffects.detected) {
      warnings.push(`${stages.sideEffects.count} potential side effects`);
    }

    if (stages.functional.errorCount > 0) {
      warnings.push(`${stages.functional.errorCount} new errors introduced`);
    }

    return warnings;
  }

  generateRiskAssessment(validationResults) {
    const score = validationResults.score;
    const action = validationResults.recommendation.action;

    if (score >= 90 && action === 'APPLY') {
      return 'Low risk deployment. All validation stages passed with high confidence.';
    }

    if (score >= 75 && action === 'APPLY_WITH_MONITORING') {
      return 'Medium risk deployment. Most validation stages passed but monitoring recommended.';
    }

    if (action === 'MANUAL_REVIEW') {
      return 'High risk deployment. Manual review required before proceeding.';
    }

    if (action === 'REJECT') {
      return 'Critical issues detected. Fix must be revised before deployment.';
    }

    return 'Risk assessment pending further analysis.';
  }

  generateImpactAnalysis(stages) {
    const analysis = [];

    if (stages.performance.loadTime > 3000) {
      analysis.push(`Load time impact: +${stages.performance.loadTime - 3000}ms`);
    }

    if (stages.performance.avgMemoryMB > 100) {
      analysis.push(`Memory impact: ${Math.round(stages.performance.avgMemoryMB)}MB usage`);
    }

    return analysis.length > 0 ? analysis : ['No significant performance impact detected'];
  }

  generateTechnicalNotes(validationResults) {
    const notes = [];

    notes.push(`Validation completed in sandbox ${validationResults.sandboxId}`);
    notes.push(`Fix type: ${validationResults.fix?.type || 'unknown'}`);
    notes.push(`Target file: ${validationResults.context?.file || 'multiple'}`);

    return notes;
  }

  getNextStepsText(action) {
    switch (action) {
      case 'APPLY':
        return `
1. **Deploy Fix**: Apply fix to production environment
2. **Monitor**: Watch for any unexpected issues for 24 hours
3. **Verify**: Confirm original error is resolved in production
        `;
      case 'APPLY_WITH_MONITORING':
        return `
1. **Deploy with Caution**: Apply fix with enhanced monitoring
2. **Active Monitoring**: Monitor closely for first 48 hours
3. **Performance Tracking**: Watch performance metrics carefully
4. **Rollback Plan**: Be prepared to rollback if issues arise
        `;
      case 'MANUAL_REVIEW':
        return `
1. **Code Review**: Have senior developer review the fix
2. **Additional Testing**: Run extended test suite
3. **Staging Deployment**: Test in staging environment first
4. **Gradual Rollout**: Consider feature flags or gradual deployment
        `;
      case 'REJECT':
        return `
1. **Do Not Deploy**: Fix has critical issues
2. **Revise Fix**: Address all critical validation failures
3. **Re-validate**: Run validation again after fixes
4. **Consider Alternatives**: Explore different fix approaches
        `;
      default:
        return 'Refer to detailed recommendations for next steps.';
    }
  }

  formatOverviewHTML(validationResults, summary) {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="metric">
          <strong>Success Rate:</strong> ${summary.successRate}%
        </div>
        <div class="metric">
          <strong>Stages Passed:</strong> ${summary.stagesPassed}/${summary.stagesTotal}
        </div>
        <div class="metric">
          <strong>Risk Level:</strong> ${summary.riskLevel}
        </div>
        <div class="metric">
          <strong>Fix Type:</strong> ${summary.fixType}
        </div>
      </div>

      ${summary.criticalIssues.length > 0 ? `
      <div class="critical-issues">
        <h4>Critical Issues</h4>
        <ul>
          ${summary.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    `;
  }

  formatStagesHTML(stages) {
    return Object.entries(stages).map(([stageName, stageResult]) => {
      const passed = stageResult.passed || !stageResult.detected;
      return `
        <div class="stage ${passed ? 'passed' : 'failed'}">
          <div class="stage-header">
            <div class="stage-title">${this.capitalizeFirst(stageName.replace('-', ' '))}</div>
            <div class="stage-status ${passed ? 'status-pass' : 'status-fail'}">
              ${passed ? 'PASS' : 'FAIL'}
            </div>
          </div>
          ${this.formatStageDetails(stageName, stageResult)}
        </div>
      `;
    }).join('');
  }

  formatStageDetails(stageName, stageResult) {
    switch (stageName) {
      case 'syntax':
        return `
          <div class="metric">Files Checked: ${stageResult.filesChecked}</div>
          <div class="metric">Errors: ${stageResult.errors.length}</div>
        `;
      case 'functional':
        return `
          <div class="metric">Original Error Fixed: ${stageResult.originalErrorFixed ? 'Yes' : 'No'}</div>
          <div class="metric">New Errors: ${stageResult.errorCount}</div>
        `;
      case 'regression':
        return `
          <div class="metric">Tests Run: ${stageResult.total}</div>
          <div class="metric">Passed: ${stageResult.passed}</div>
          <div class="metric">Failed: ${stageResult.failed}</div>
        `;
      case 'performance':
        return `
          <div class="metric">Load Time: ${stageResult.loadTime}ms</div>
          <div class="metric">FPS: ${Math.round(stageResult.avgFps || 0)}</div>
          <div class="metric">Memory: ${Math.round(stageResult.avgMemoryMB || 0)}MB</div>
        `;
      case 'sideEffects':
        return `
          <div class="metric">Side Effects: ${stageResult.count}</div>
        `;
      default:
        return '<div class="metric">Details not available</div>';
    }
  }

  formatAnalysisHTML(analysis) {
    return `
      <div class="metric">
        <h4>Risk Assessment</h4>
        <p>${analysis.riskAssessment}</p>
      </div>

      ${analysis.criticalIssues.length > 0 ? `
      <div class="critical-issues">
        <h4>Critical Issues</h4>
        <ul>
          ${analysis.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${analysis.warnings.length > 0 ? `
      <div class="recommendations">
        <h4>Warnings</h4>
        <ul>
          ${analysis.warnings.map(warning => `<li>${warning}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    `;
  }

  formatRecommendationsHTML(recommendations) {
    return `
      ${recommendations.immediate.length > 0 ? `
      <div class="critical-issues">
        <h4>Immediate Actions Required</h4>
        <ul>
          ${recommendations.immediate.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${recommendations.followUp.length > 0 ? `
      <div class="recommendations">
        <h4>Follow-up Actions</h4>
        <ul>
          ${recommendations.followUp.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${recommendations.monitoring.length > 0 ? `
      <div class="recommendations">
        <h4>Monitoring Recommendations</h4>
        <ul>
          ${recommendations.monitoring.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    `;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate performance charts (placeholder for future implementation)
   */
  async generatePerformanceCharts(validationResults, reportDir) {
    // This would generate charts using a charting library
    // For now, just create a placeholder
    const chartData = {
      performanceMetrics: {
        loadTime: validationResults.stages.performance.loadTime,
        fps: validationResults.stages.performance.avgFps,
        memory: validationResults.stages.performance.avgMemoryMB
      }
    };

    const chartPath = path.join(reportDir, 'performance-charts.json');
    await fs.writeJSON(chartPath, chartData, { spaces: 2 });

    return {
      type: 'charts',
      format: 'json',
      path: chartPath,
      note: 'Chart data prepared - visualization requires frontend implementation'
    };
  }
}