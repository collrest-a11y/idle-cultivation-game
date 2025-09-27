#!/usr/bin/env node

/**
 * PM Error Import Command
 * Imports error reports from the error collector and creates PM issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function importErrorReport(filePath) {
    try {
        // Read the error report
        const reportData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Create issue structure
        const issue = {
            title: reportData.title || 'Fix Game Errors',
            labels: ['bug', 'auto-generated', reportData.priority || 'high'],
            body: generateIssueBody(reportData),
            assignees: [],
            milestone: null
        };

        // Save to issues directory
        const issuesDir = path.join(__dirname, '..', 'issues');
        if (!fs.existsSync(issuesDir)) {
            fs.mkdirSync(issuesDir, { recursive: true });
        }

        const issueFile = path.join(issuesDir, `error-${Date.now()}.json`);
        fs.writeFileSync(issueFile, JSON.stringify(issue, null, 2));

        console.log(`✅ Error report imported as issue: ${issueFile}`);
        console.log(`\nTo fix these errors, run:`);
        console.log(`/pm:issue-start ${path.basename(issueFile, '.json')}`);

        return issue;
    } catch (error) {
        console.error('Failed to import error report:', error);
        throw error;
    }
}

function generateIssueBody(reportData) {
    let body = `# Error Report\n\n`;
    body += `**Session ID:** ${reportData.sessionId}\n`;
    body += `**Timestamp:** ${reportData.timestamp}\n`;
    body += `**Total Errors:** ${reportData.errors?.length || 0}\n\n`;

    body += `## Errors to Fix\n\n`;

    if (reportData.errors) {
        reportData.errors.forEach((error, index) => {
            body += `### Error ${index + 1}: ${error.message}\n\n`;
            body += `- **File:** \`${error.file}\`\n`;
            body += `- **Location:** Line ${error.line}, Column ${error.column}\n`;
            body += `- **Occurrences:** ${error.count || 1}\n`;

            if (error.stack) {
                body += `\n**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`\n`;
            }

            if (error.userActions?.length > 0) {
                body += `\n**User Actions Before Error:**\n`;
                error.userActions.forEach(action => {
                    body += `- ${action}\n`;
                });
            }

            body += '\n---\n\n';
        });
    }

    body += `## Fix Instructions\n\n`;
    body += `1. Analyze each error and identify root cause\n`;
    body += `2. Implement fixes with proper error handling\n`;
    body += `3. Add tests to prevent regression\n`;
    body += `4. Validate fixes using the error collector\n`;

    return body;
}

// CLI interface
if (import.meta.url === `file://${__filename}`) {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('Usage: pm-error-import <error-report.json>');
        process.exit(1);
    }

    importErrorReport(args[0])
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}