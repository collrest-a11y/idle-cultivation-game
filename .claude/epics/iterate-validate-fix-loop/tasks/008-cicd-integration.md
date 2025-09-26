---
name: CI/CD Integration
status: open
created: 2025-09-25T19:42:00Z
updated: 2025-09-25T20:15:00Z
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/129
priority: P2
effort: 1d
dependencies: [006]
---

# Task 008: CI/CD Integration

## Objective
Integrate the validation and fix loop into CI/CD pipelines to ensure code quality gates and automated deployment validation.

## Background
Making the validation system part of the development workflow ensures consistent quality and prevents regressions from reaching production.

## Acceptance Criteria

### Required
- [ ] Pre-commit hooks for local validation
- [ ] GitHub Actions workflow integration
- [ ] Pull request validation checks
- [ ] Deployment validation pipeline
- [ ] Production monitoring integration
- [ ] Rollback triggers on validation failure
- [ ] Status badges for repository
- [ ] Branch protection rules enforcement
- [ ] Automated fix PR creation
- [ ] Performance benchmarking in CI

### Nice to Have
- [ ] GitLab CI/CD support
- [ ] Jenkins pipeline integration
- [ ] Azure DevOps support
- [ ] Terraform deployment automation

## Technical Implementation

### 1. Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Running pre-commit validation..."

# Run quick validation
npx validate-fix check --quick

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Fix errors before committing."
  echo "Run 'npm run validate:fix' to auto-fix issues."
  exit 1
fi

echo "✅ Validation passed!"
exit 0
```

### 2. GitHub Actions Workflow
```yaml
# .github/workflows/validate-fix.yml
name: Validation & Fix Loop

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily validation
  workflow_dispatch:     # Manual trigger

jobs:
  validate:
    name: Run Validation
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps
      
      - name: Start test server
        run: |
          python -m http.server 8080 &
          echo $! > server.pid
          sleep 5
      
      - name: Run validation
        id: validation
        env:
          MCP_API_KEY: ${{ secrets.MCP_API_KEY }}
        run: |
          npx validate-fix run \
            --max-iterations 5 \
            --confidence 80 \
            --output json \
            --output-file validation-report.json
      
      - name: Upload validation report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: |
            validation-report.json
            validation-reports/*.html
            playwright-report/
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('validation-report.json', 'utf8'));
            
            const comment = `## 📄 Validation Report
            
            **Status:** ${report.summary.status === 'success' ? '✅ Passed' : '❌ Failed'}
            **Errors Found:** ${report.summary.totalErrors}
            **Errors Fixed:** ${report.summary.fixedErrors}
            **Fix Success Rate:** ${report.summary.fixSuccessRate}
            
            ### Error Distribution
            ${Object.entries(report.metrics.errorsBySeverity || {})
              .map(([severity, count]) => `- **${severity}:** ${count}`)
              .join('\n')}
            
            ${report.recommendations.length > 0 ? `
            ### Recommendations
            ${report.recommendations.map(r => `- ${r.message}`).join('\n')}
            ` : ''}
            
            [View Full Report](https://github.com/${{github.repository}}/actions/runs/${{github.run_id}})`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
      
      - name: Stop test server
        if: always()
        run: |
          if [ -f server.pid ]; then
            kill $(cat server.pid) || true
          fi
      
      - name: Check validation status
        run: |
          STATUS=$(jq -r '.summary.status' validation-report.json)
          if [ "$STATUS" != "success" ]; then
            echo "Validation failed!"
            exit 1
          fi

  auto-fix:
    name: Auto-Fix Issues
    runs-on: ubuntu-latest
    needs: validate
    if: failure() && github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run auto-fix
        env:
          MCP_API_KEY: ${{ secrets.MCP_API_KEY }}
        run: |
          npx validate-fix fix \
            --auto-apply \
            --confidence 85
      
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: '🤖 Auto-fix validation errors'
          title: '🤖 Automated Fixes for Validation Errors'
          body: |
            This PR contains automated fixes for validation errors detected in the codebase.
            
            ## Changes
            - Applied automated fixes for detected errors
            - Validated fixes pass all tests
            
            ## Review Checklist
            - [ ] Review code changes
            - [ ] Verify no regressions
            - [ ] Test critical functionality
            
            _Generated by Validation & Fix Loop_
          branch: auto-fix/validation-errors
          delete-branch: true

  performance-check:
    name: Performance Validation
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Run performance tests
        run: |
          npx validate-fix perf \
            --threshold-fps 30 \
            --threshold-memory 200 \
            --threshold-load 3000
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance-report.json
```

### 3. Pull Request Validation
```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  quick-validation:
    name: Quick Validation
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      
      - name: Syntax check
        run: npx validate-fix check --syntax-only
      
      - name: Critical path testing
        run: |
          npx playwright test \
            --grep "@critical" \
            --reporter=github
      
      - name: Set PR status
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const status = '${{ job.status }}';
            const state = status === 'success' ? 'success' : 'failure';
            
            await github.rest.repos.createCommitStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: context.sha,
              state: state,
              target_url: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
              description: `Validation ${state}`,
              context: 'validation/quick-check'
            });
```

### 4. Deployment Validation
```yaml
# .github/workflows/deploy-validation.yml
name: Deployment Validation

on:
  workflow_run:
    workflows: ["Deploy to Production"]
    types: [completed]

jobs:
  post-deployment-validation:
    name: Post-Deployment Validation
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Validate production
        env:
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
        run: |
          npx validate-fix validate-deployment \
            --url $PRODUCTION_URL \
            --timeout 60000
      
      - name: Rollback on failure
        if: failure()
        run: |
          echo "Triggering rollback..."
          curl -X POST \
            -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/${{ github.repository }}/actions/workflows/rollback.yml/dispatches \
            -d '{"ref":"main"}'
```

### 5. Package.json Scripts
```json
{
  "scripts": {
    "validate": "validate-fix run",
    "validate:quick": "validate-fix check --quick",
    "validate:fix": "validate-fix fix --auto-apply",
    "validate:report": "validate-fix report",
    "precommit": "npm run validate:quick",
    "prepush": "npm run validate",
    "ci:validate": "validate-fix run --ci --max-iterations 10",
    "ci:performance": "validate-fix perf --ci"
  }
}
```

### 6. Branch Protection Rules
```javascript
// scripts/setup-branch-protection.js
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function setupBranchProtection() {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  
  await octokit.repos.updateBranchProtection({
    owner,
    repo,
    branch: 'main',
    required_status_checks: {
      strict: true,
      contexts: [
        'validation/quick-check',
        'validation/full',
        'performance/check'
      ]
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false
  });
  
  console.log('✅ Branch protection rules configured');
}

setupBranchProtection().catch(console.error);
```

### 7. Status Badge
```markdown
# README.md

# Idle Cultivation Game

[![Validation Status](https://github.com/USER/REPO/actions/workflows/validate-fix.yml/badge.svg)](https://github.com/USER/REPO/actions/workflows/validate-fix.yml)
[![Code Quality](https://img.shields.io/badge/errors-0-brightgreen)]()
[![Fix Rate](https://img.shields.io/badge/fix%20rate-95%25-success)]()
```

### 8. CLI Integration
```javascript
// cli/ci-commands.js
import { program } from 'commander';

program
  .command('ci')
  .description('CI/CD specific commands')
  .option('--json', 'Output JSON format')
  .option('--junit', 'Output JUnit XML')
  .option('--github', 'GitHub Actions annotations')
  .action(async (options) => {
    const orchestrator = new LoopOrchestrator({
      ci: true,
      outputFormat: options.json ? 'json' : 'text',
      annotations: options.github
    });
    
    const result = await orchestrator.run();
    
    if (options.junit) {
      await generateJUnitReport(result);
    }
    
    if (options.github) {
      generateGitHubAnnotations(result);
    }
    
    process.exit(result.status === 'success' ? 0 : 1);
  });

function generateGitHubAnnotations(result) {
  result.errors.forEach(error => {
    const level = error.severity === 'CRITICAL' ? 'error' : 'warning';
    console.log(
      `::\${level} file=\${error.location?.file},line=\${error.location?.line}:::\${error.message}`
    );
  });
}
```

### 9. Docker Support
```dockerfile
# Dockerfile.validation
FROM node:18-slim

# Install browsers for Playwright
RUN npx playwright install-deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Install Playwright browsers
RUN npx playwright install

# Run validation
CMD ["npm", "run", "ci:validate"]
```

### 10. Monitoring Integration
```javascript
// monitoring/datadog-integration.js
import { StatsD } from 'node-statsd';

const client = new StatsD({
  host: process.env.DATADOG_HOST,
  port: 8125,
  prefix: 'validation.'
});

export function reportMetrics(result) {
  client.gauge('errors.total', result.totalErrors);
  client.gauge('errors.fixed', result.fixedErrors);
  client.gauge('fix.success_rate', result.fixSuccessRate);
  client.gauge('iterations', result.iterations);
  client.timing('duration', result.duration);
  
  // Report by severity
  Object.entries(result.errorsBySeverity).forEach(([severity, count]) => {
    client.gauge(`errors.severity.${severity.toLowerCase()}`, count);
  });
}
```

## Success Metrics
- Pre-commit validation < 30 seconds
- CI validation completes < 10 minutes
- Zero false positive build failures
- Automated fix PRs have > 90% merge rate
- Deployment validation prevents 100% of critical bugs

## Notes
- Cache Playwright browsers in CI for faster runs
- Use matrix builds for parallel browser testing
- Consider using act for local GitHub Actions testing
- Implement incremental validation for large codebases