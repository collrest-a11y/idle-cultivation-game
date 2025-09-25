import fs from 'fs-extra';
import path from 'path';
import { createReport } from './html-generator.js';

/**
 * Report Generator - Multi-format report generation system
 *
 * Generates comprehensive reports in various formats including HTML, PDF,
 * Markdown, JSON, CSV, and XML for different audiences and use cases.
 */
export class ReportGenerator {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || './validation-reports/generated',
      defaultFormats: config.defaultFormats || ['html', 'json', 'markdown'],
      includeCharts: config.includeCharts || false,
      branding: config.branding || {
        title: 'Validation & Fix Loop Report',
        company: 'Idle Cultivation Game',
        logo: null
      },
      templates: config.templates || {},
      ...config
    };

    this.supportedFormats = ['html', 'json', 'markdown', 'csv', 'xml', 'pdf'];
  }

  /**
   * Initialize report generator
   */
  async initialize() {
    console.log('📄 Initializing Report Generator...');

    await fs.ensureDir(this.config.outputDir);
    await fs.ensureDir(path.join(this.config.outputDir, 'templates'));
    await fs.ensureDir(path.join(this.config.outputDir, 'assets'));

    console.log('✅ Report Generator initialized');
  }

  /**
   * Generate reports in multiple formats
   */
  async generateReports(reportData, options = {}) {
    const formats = options.formats || this.config.defaultFormats;
    const timestamp = Date.now();
    const reportId = reportData.session?.id || `report_${timestamp}`;

    const generatedReports = {
      reportId,
      timestamp,
      formats: {},
      summary: {
        totalReports: 0,
        successfulReports: 0,
        failedReports: 0
      }
    };

    console.log(`📋 Generating reports in formats: ${formats.join(', ')}`);

    for (const format of formats) {
      if (!this.supportedFormats.includes(format)) {
        console.warn(`⚠️ Unsupported format: ${format}`);
        continue;
      }

      try {
        generatedReports.summary.totalReports++;

        const reportResult = await this.generateReport(reportData, format, options);
        generatedReports.formats[format] = reportResult;
        generatedReports.summary.successfulReports++;

        console.log(`✅ Generated ${format.toUpperCase()} report: ${reportResult.path}`);
      } catch (error) {
        console.error(`❌ Failed to generate ${format} report:`, error.message);
        generatedReports.formats[format] = {
          success: false,
          error: error.message
        };
        generatedReports.summary.failedReports++;
      }
    }

    // Generate consolidated report summary
    const summaryPath = path.join(this.config.outputDir, `report-summary-${reportId}.json`);
    await fs.writeJson(summaryPath, generatedReports, { spaces: 2 });

    console.log(`📊 Report generation completed: ${generatedReports.summary.successfulReports}/${generatedReports.summary.totalReports} successful`);

    return generatedReports;
  }

  /**
   * Generate a single report in specified format
   */
  async generateReport(reportData, format, options = {}) {
    const reportId = reportData.session?.id || `report_${Date.now()}`;
    const timestamp = Date.now();

    switch (format) {
      case 'html':
        return await this.generateHTMLReport(reportData, reportId, options);
      case 'json':
        return await this.generateJSONReport(reportData, reportId, options);
      case 'markdown':
        return await this.generateMarkdownReport(reportData, reportId, options);
      case 'csv':
        return await this.generateCSVReport(reportData, reportId, options);
      case 'xml':
        return await this.generateXMLReport(reportData, reportId, options);
      case 'pdf':
        return await this.generatePDFReport(reportData, reportId, options);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate HTML report with interactive dashboard
   */
  async generateHTMLReport(reportData, reportId, options = {}) {
    const filename = `${reportId}-dashboard.html`;
    const filePath = path.join(this.config.outputDir, filename);

    const htmlContent = createReport(reportData);
    await fs.writeFile(filePath, htmlContent);

    return {
      success: true,
      format: 'html',
      path: filePath,
      filename,
      size: htmlContent.length,
      type: 'interactive-dashboard'
    };
  }

  /**
   * Generate JSON report for machine consumption
   */
  async generateJSONReport(reportData, reportId, options = {}) {
    const filename = `${reportId}-data.json`;
    const filePath = path.join(this.config.outputDir, filename);

    const jsonData = {
      metadata: {
        reportId,
        generated: Date.now(),
        generator: 'ValidationReportGenerator',
        version: '1.0.0',
        format: 'json'
      },
      ...reportData
    };

    await fs.writeJson(filePath, jsonData, { spaces: options.compact ? 0 : 2 });

    return {
      success: true,
      format: 'json',
      path: filePath,
      filename,
      size: JSON.stringify(jsonData).length,
      type: 'structured-data'
    };
  }

  /**
   * Generate Markdown report for documentation
   */
  async generateMarkdownReport(reportData, reportId, options = {}) {
    const filename = `${reportId}-report.md`;
    const filePath = path.join(this.config.outputDir, filename);

    const content = await this.createMarkdownContent(reportData, options);
    await fs.writeFile(filePath, content);

    return {
      success: true,
      format: 'markdown',
      path: filePath,
      filename,
      size: content.length,
      type: 'documentation'
    };
  }

  /**
   * Generate CSV report for data analysis
   */
  async generateCSVReport(reportData, reportId, options = {}) {
    const filename = `${reportId}-metrics.csv`;
    const filePath = path.join(this.config.outputDir, filename);

    const csvContent = await this.createCSVContent(reportData, options);
    await fs.writeFile(filePath, csvContent);

    return {
      success: true,
      format: 'csv',
      path: filePath,
      filename,
      size: csvContent.length,
      type: 'data-export'
    };
  }

  /**
   * Generate XML report for system integration
   */
  async generateXMLReport(reportData, reportId, options = {}) {
    const filename = `${reportId}-report.xml`;
    const filePath = path.join(this.config.outputDir, filename);

    const xmlContent = await this.createXMLContent(reportData, options);
    await fs.writeFile(filePath, xmlContent);

    return {
      success: true,
      format: 'xml',
      path: filePath,
      filename,
      size: xmlContent.length,
      type: 'structured-export'
    };
  }

  /**
   * Generate PDF report (placeholder - requires PDF library)
   */
  async generatePDFReport(reportData, reportId, options = {}) {
    // For now, generate HTML and suggest PDF conversion
    const htmlResult = await this.generateHTMLReport(reportData, reportId, options);

    return {
      success: true,
      format: 'pdf',
      path: htmlResult.path,
      filename: htmlResult.filename,
      size: htmlResult.size,
      type: 'print-ready',
      note: 'PDF generation requires additional library - HTML generated instead'
    };
  }

  /**
   * Create Markdown content
   */
  async createMarkdownContent(reportData, options = {}) {
    const { session, summary, metrics, analysis, trends } = reportData;

    const content = `# ${this.config.branding.title}

**Session ID:** ${session?.id || 'N/A'}
**Generated:** ${new Date().toLocaleString()}
**Duration:** ${summary?.duration || 'N/A'}

## Executive Summary

- **Total Iterations:** ${summary?.iterations || 0}
- **Errors Found:** ${summary?.totalErrors || 0}
- **Errors Fixed:** ${summary?.fixedErrors || 0}
- **Fix Success Rate:** ${summary?.fixSuccessRate || '0%'}
- **Convergence Rate:** ${summary?.convergenceRate || '0%'}

## Key Metrics

### Performance Overview
- **Average Iteration Time:** ${Math.round(metrics?.avgIterationTime || 0)}ms
- **Memory Usage:** ${Math.round((metrics?.avgMemoryUsage || 0) / 1024 / 1024)}MB
- **Error Trend:** ${metrics?.errorTrend || 'stable'}

### Error Analysis
${this.formatErrorAnalysisMarkdown(metrics)}

### Fix Effectiveness
- **Total Fix Attempts:** ${metrics?.totalFixes || 0}
- **Successful Fixes:** ${metrics?.successfulFixes || 0}
- **Failed Fixes:** ${metrics?.failedFixes || 0}
- **Success Rate:** ${metrics?.fixSuccessRate || 0}%

## Detailed Analysis

### Patterns Detected
${analysis?.patterns?.map(p => `- **${p.type}:** ${p.description} (${p.severity} severity)`)?.join('\n') || 'No patterns detected'}

### Performance Bottlenecks
${analysis?.bottlenecks?.map(b => `- **${b.type}:** ${b.description}`)?.join('\n') || 'No bottlenecks identified'}

### Risk Areas
${analysis?.riskAreas?.map(r => `- **${r.level.toUpperCase()}:** ${r.description}`)?.join('\n') || 'No risk areas identified'}

## Trend Analysis

### System Health
- **Score:** ${trends?.systemHealth?.score || 0}/100
- **Grade:** ${trends?.systemHealth?.grade || 'N/A'}
- **Recommendation:** ${trends?.systemHealth?.recommendation || 'N/A'}

### Historical Comparison
${this.formatHistoricalComparisonMarkdown(trends)}

## Recommendations

### Immediate Actions
${analysis?.improvements?.filter(i => i.priority === 'immediate')?.map(i => `- **${i.area}:** ${i.suggestion}`)?.join('\n') || 'No immediate actions required'}

### Short-term Improvements
${analysis?.improvements?.filter(i => i.priority === 'short-term')?.map(i => `- **${i.area}:** ${i.suggestion}`)?.join('\n') || 'No short-term improvements identified'}

### Long-term Optimizations
${analysis?.improvements?.filter(i => i.priority === 'long-term')?.map(i => `- **${i.area}:** ${i.suggestion}`)?.join('\n') || 'No long-term optimizations identified'}

## Technical Details

### Session Information
- **Start Time:** ${summary?.startTime || 'N/A'}
- **End Time:** ${summary?.endTime || 'N/A'}
- **Total Duration:** ${summary?.duration || 'N/A'}

### System Configuration
- **Platform:** ${process.platform}
- **Node Version:** ${process.version}
- **Memory Limit:** ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB

---
*Report generated by ${this.config.branding.company} Validation System*
*Generated on: ${new Date().toLocaleString()}*
`;

    return content;
  }

  /**
   * Create CSV content for data export
   */
  async createCSVContent(reportData, options = {}) {
    const { session, metrics } = reportData;
    const csv = [];

    // Headers
    csv.push('timestamp,metric_category,metric_name,metric_value,session_id');

    // Session metrics
    const timestamp = Date.now();
    const sessionId = session?.id || 'unknown';

    // Add summary metrics
    if (reportData.summary) {
      Object.entries(reportData.summary).forEach(([key, value]) => {
        if (typeof value === 'number') {
          csv.push(`${timestamp},summary,${key},${value},${sessionId}`);
        }
      });
    }

    // Add performance metrics
    if (metrics) {
      Object.entries(metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          csv.push(`${timestamp},metrics,${key},${value},${sessionId}`);
        } else if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (typeof subValue === 'number') {
              csv.push(`${timestamp},metrics,${key}_${subKey},${subValue},${sessionId}`);
            }
          });
        }
      });
    }

    // Add iteration data if available
    if (session?.iterations) {
      session.iterations.forEach(iteration => {
        csv.push(`${iteration.timestamp},iteration,duration,${iteration.duration},${sessionId}`);
        csv.push(`${iteration.timestamp},iteration,errors_found,${iteration.errorsFound || 0},${sessionId}`);
        csv.push(`${iteration.timestamp},iteration,fixes_applied,${iteration.fixesApplied || 0},${sessionId}`);

        if (iteration.memoryUsage) {
          csv.push(`${iteration.timestamp},memory,heap_used,${iteration.memoryUsage.heapUsed},${sessionId}`);
          csv.push(`${iteration.timestamp},memory,heap_total,${iteration.memoryUsage.heapTotal},${sessionId}`);
        }
      });
    }

    return csv.join('\n');
  }

  /**
   * Create XML content for structured export
   */
  async createXMLContent(reportData, options = {}) {
    const { session, summary, metrics, analysis } = reportData;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ValidationReport>
  <Metadata>
    <ReportId>${session?.id || 'unknown'}</ReportId>
    <Generated>${new Date().toISOString()}</Generated>
    <Generator>ValidationReportGenerator</Generator>
    <Version>1.0.0</Version>
  </Metadata>

  <Session>
    <Id>${session?.id || 'unknown'}</Id>
    <StartTime>${summary?.startTime || ''}</StartTime>
    <EndTime>${summary?.endTime || ''}</EndTime>
    <Duration>${summary?.duration || ''}</Duration>
    <Status>${session?.status || 'unknown'}</Status>
  </Session>

  <Summary>
    <TotalIterations>${summary?.iterations || 0}</TotalIterations>
    <TotalErrors>${summary?.totalErrors || 0}</TotalErrors>
    <FixedErrors>${summary?.fixedErrors || 0}</FixedErrors>
    <RemainingErrors>${summary?.remainingErrors || 0}</RemainingErrors>
    <FixSuccessRate>${summary?.fixSuccessRate || '0%'}</FixSuccessRate>
    <ConvergenceRate>${summary?.convergenceRate || '0%'}</ConvergenceRate>
  </Summary>

  <Metrics>
    <Performance>
      <AvgIterationTime>${Math.round(metrics?.avgIterationTime || 0)}</AvgIterationTime>
      <AvgMemoryUsage>${Math.round((metrics?.avgMemoryUsage || 0) / 1024 / 1024)}</AvgMemoryUsage>
      <ErrorTrend>${metrics?.errorTrend || 'stable'}</ErrorTrend>
    </Performance>

    <Errors>
      ${this.formatErrorsXML(metrics?.errorsBySeverity)}
    </Errors>

    <Fixes>
      <Total>${metrics?.totalFixes || 0}</Total>
      <Successful>${metrics?.successfulFixes || 0}</Successful>
      <Failed>${metrics?.failedFixes || 0}</Failed>
      <SuccessRate>${metrics?.fixSuccessRate || 0}</SuccessRate>
    </Fixes>
  </Metrics>

  <Analysis>
    <Patterns>
      ${analysis?.patterns?.map(p => `
      <Pattern>
        <Type>${p.type}</Type>
        <Description>${this.escapeXML(p.description)}</Description>
        <Severity>${p.severity}</Severity>
      </Pattern>`).join('') || ''}
    </Patterns>

    <Bottlenecks>
      ${analysis?.bottlenecks?.map(b => `
      <Bottleneck>
        <Type>${b.type}</Type>
        <Description>${this.escapeXML(b.description)}</Description>
      </Bottleneck>`).join('') || ''}
    </Bottlenecks>
  </Analysis>
</ValidationReport>`;

    return xml;
  }

  /**
   * Helper methods for content formatting
   */

  formatErrorAnalysisMarkdown(metrics) {
    if (!metrics?.errorsBySeverity) return 'No error data available';

    return Object.entries(metrics.errorsBySeverity)
      .map(([severity, count]) => `- **${severity}:** ${count}`)
      .join('\n');
  }

  formatHistoricalComparisonMarkdown(trends) {
    if (!trends) return 'No historical data available';

    const items = [];

    if (trends.errorTrends?.trend) {
      items.push(`- **Error Trend:** ${trends.errorTrends.trend}`);
    }

    if (trends.performanceTrends?.iterationTime?.trend) {
      items.push(`- **Performance Trend:** ${trends.performanceTrends.iterationTime.trend}`);
    }

    if (trends.fixEffectiveness?.trend) {
      items.push(`- **Fix Effectiveness:** ${trends.fixEffectiveness.trend}`);
    }

    return items.length > 0 ? items.join('\n') : 'No trend data available';
  }

  formatErrorsXML(errorsBySeverity) {
    if (!errorsBySeverity) return '';

    return Object.entries(errorsBySeverity)
      .map(([severity, count]) => `
      <Error>
        <Severity>${severity}</Severity>
        <Count>${count}</Count>
      </Error>`).join('');
  }

  escapeXML(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Template management
   */

  async loadTemplate(templateName) {
    const templatePath = path.join(this.config.outputDir, 'templates', `${templateName}.template`);

    try {
      if (await fs.pathExists(templatePath)) {
        return await fs.readFile(templatePath, 'utf-8');
      }
    } catch (error) {
      console.warn(`⚠️ Could not load template ${templateName}:`, error.message);
    }

    return null;
  }

  async saveTemplate(templateName, content) {
    const templatePath = path.join(this.config.outputDir, 'templates', `${templateName}.template`);
    await fs.writeFile(templatePath, content);
  }

  /**
   * Custom report generation with templates
   */
  async generateCustomReport(reportData, templateName, options = {}) {
    const template = await this.loadTemplate(templateName);

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Simple template variable replacement
    let content = template;
    const variables = this.extractTemplateVariables(reportData);

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(placeholder, String(value));
    });

    const filename = `${reportData.session?.id || 'report'}-${templateName}.html`;
    const filePath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filePath, content);

    return {
      success: true,
      format: 'custom',
      template: templateName,
      path: filePath,
      filename,
      size: content.length
    };
  }

  extractTemplateVariables(reportData) {
    return {
      sessionId: reportData.session?.id || 'N/A',
      timestamp: new Date().toLocaleString(),
      totalIterations: reportData.summary?.iterations || 0,
      totalErrors: reportData.summary?.totalErrors || 0,
      fixedErrors: reportData.summary?.fixedErrors || 0,
      fixSuccessRate: reportData.summary?.fixSuccessRate || '0%',
      convergenceRate: reportData.summary?.convergenceRate || '0%',
      avgIterationTime: Math.round(reportData.metrics?.avgIterationTime || 0),
      errorTrend: reportData.metrics?.errorTrend || 'stable',
      systemHealthScore: reportData.trends?.systemHealth?.score || 0,
      systemHealthGrade: reportData.trends?.systemHealth?.grade || 'N/A'
    };
  }

  /**
   * Batch report generation
   */
  async generateBatchReports(reportDataArray, options = {}) {
    const results = [];

    for (const reportData of reportDataArray) {
      try {
        const result = await this.generateReports(reportData, options);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to generate batch report:`, error.message);
        results.push({
          success: false,
          error: error.message,
          sessionId: reportData.session?.id
        });
      }
    }

    return results;
  }
}