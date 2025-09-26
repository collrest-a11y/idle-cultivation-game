#!/usr/bin/env node
/**
 * Branch Protection Setup Script
 * Configures GitHub branch protection rules for validation CI/CD
 */

const { Octokit } = require('@octokit/rest');

// Configuration
const BRANCH_PROTECTION_CONFIG = {
  main: {
    required_status_checks: {
      strict: true,
      contexts: [
        'validation/quick-check',
        'validation/critical-path',
        'validation/security'
      ]
    },
    enforce_admins: false, // Set to true for stricter enforcement
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      restrict_pushes_that_create_files: false
    },
    restrictions: null, // No push restrictions
    allow_force_pushes: false,
    allow_deletions: false,
    required_linear_history: false,
    allow_auto_merge: false,
    delete_head_branches: true
  },
  master: {
    // Same config as main for compatibility
    required_status_checks: {
      strict: true,
      contexts: [
        'validation/quick-check',
        'validation/critical-path',
        'validation/security'
      ]
    },
    enforce_admins: false,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      restrict_pushes_that_create_files: false
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
    required_linear_history: false,
    allow_auto_merge: false,
    delete_head_branches: true
  }
};

/**
 * Setup branch protection for a repository
 */
async function setupBranchProtection() {
  console.log('🔒 Setting up branch protection rules...\n');

  // Check for required environment variables
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || process.env.REPO;

  if (!token) {
    console.error('❌ Error: GITHUB_TOKEN environment variable not set');
    console.log('Please set GITHUB_TOKEN with a personal access token or use GitHub Actions');
    console.log('Required scopes: repo');
    process.exit(1);
  }

  if (!repository) {
    console.error('❌ Error: Repository not specified');
    console.log('Set GITHUB_REPOSITORY environment variable (format: owner/repo)');
    console.log('Or set REPO environment variable');
    process.exit(1);
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    console.error('❌ Error: Invalid repository format');
    console.log('Expected format: owner/repository-name');
    process.exit(1);
  }

  console.log(`🏗️  Repository: ${owner}/${repo}`);
  console.log(`🔑 Token: ${token.substring(0, 8)}...`);

  const octokit = new Octokit({
    auth: token
  });

  try {
    // Check if repository exists and we have access
    console.log('\n📡 Checking repository access...');
    const { data: repoData } = await octokit.repos.get({
      owner,
      repo
    });

    console.log(`✅ Repository found: ${repoData.full_name}`);
    console.log(`🔄 Default branch: ${repoData.default_branch}`);

    // Determine which branches to protect
    const branchesToProtect = [];

    // Always try to protect the default branch
    branchesToProtect.push(repoData.default_branch);

    // Also protect main/master if they're different from default
    if (repoData.default_branch !== 'main') {
      branchesToProtect.push('main');
    }
    if (repoData.default_branch !== 'master') {
      branchesToProtect.push('master');
    }

    console.log(`\n🛡️  Branches to protect: ${branchesToProtect.join(', ')}`);

    // Setup protection for each branch
    for (const branch of branchesToProtect) {
      try {
        console.log(`\n🔧 Setting up protection for ${branch}...`);

        // Check if branch exists
        try {
          await octokit.repos.getBranch({
            owner,
            repo,
            branch
          });
        } catch (error) {
          if (error.status === 404) {
            console.log(`⏭️  Branch ${branch} does not exist, skipping...`);
            continue;
          }
          throw error;
        }

        // Get configuration for this branch
        const config = BRANCH_PROTECTION_CONFIG[branch] || BRANCH_PROTECTION_CONFIG.main;

        // Update branch protection
        await octokit.repos.updateBranchProtection({
          owner,
          repo,
          branch,
          ...config
        });

        console.log(`✅ Branch protection enabled for ${branch}`);

        // Log the configuration applied
        console.log(`   📋 Status checks: ${config.required_status_checks.contexts.length} required`);
        console.log(`   👥 Required reviews: ${config.required_pull_request_reviews.required_approving_review_count}`);
        console.log(`   🚫 Force pushes: ${config.allow_force_pushes ? 'Allowed' : 'Blocked'}`);
        console.log(`   🗑️  Branch deletion: ${config.allow_deletions ? 'Allowed' : 'Blocked'}`);

      } catch (error) {
        if (error.status === 403) {
          console.log(`❌ Permission denied for ${branch}. Admin access required.`);
        } else if (error.status === 404) {
          console.log(`⏭️  Branch ${branch} not found, skipping...`);
        } else {
          console.log(`❌ Error setting up ${branch}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Branch protection setup completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Validation status checks are now required');
    console.log('   ✅ Pull request reviews are required');
    console.log('   ✅ Force pushes are blocked');
    console.log('   ✅ Branch deletion is blocked');

    console.log('\n💡 Next steps:');
    console.log('   1. Create a test PR to verify protection rules');
    console.log('   2. Ensure GitHub Actions workflows are working');
    console.log('   3. Add team members as reviewers if needed');

  } catch (error) {
    console.error('\n❌ Failed to setup branch protection:', error.message);

    if (error.status === 401) {
      console.log('\n🔑 Authentication Error:');
      console.log('   - Check that GITHUB_TOKEN is set correctly');
      console.log('   - Ensure token has "repo" scope');
      console.log('   - Verify token is not expired');
    } else if (error.status === 403) {
      console.log('\n🚫 Permission Error:');
      console.log('   - Admin access to repository required');
      console.log('   - Check repository permissions');
      console.log('   - Organization may restrict branch protection settings');
    } else if (error.status === 404) {
      console.log('\n🔍 Not Found Error:');
      console.log('   - Verify repository name is correct');
      console.log('   - Check repository exists and is accessible');
    }

    process.exit(1);
  }
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
🔒 Branch Protection Setup Script

Usage:
  node setup-branch-protection.js [options]

Environment Variables:
  GITHUB_TOKEN      Personal access token with 'repo' scope (required)
  GITHUB_REPOSITORY Repository in format 'owner/repo' (required)
  REPO              Alternative to GITHUB_REPOSITORY

Options:
  --help, -h        Show this help message
  --dry-run         Show what would be done without making changes
  --config          Show current configuration

Examples:
  # Setup branch protection (in GitHub Actions)
  GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} GITHUB_REPOSITORY=${{ github.repository }} node setup-branch-protection.js

  # Setup branch protection (locally)
  GITHUB_TOKEN=ghp_xxx REPO=username/repository-name node setup-branch-protection.js

Required GitHub Token Scopes:
  - repo (full repository access)
  - admin:repo_hook (if setting up webhooks)

Branch Protection Rules Applied:
  ✅ Required status checks for validation workflows
  ✅ Required pull request reviews (1 reviewer minimum)
  ✅ Dismiss stale reviews when new commits are pushed
  ✅ Block force pushes to protected branches
  ✅ Block branch deletion for protected branches
  ✅ Require branches to be up to date before merging

Status Checks Required:
  - validation/quick-check      (PR validation)
  - validation/critical-path    (Critical path tests)
  - validation/security         (Security checks)
`);
}

/**
 * Show current configuration
 */
function showConfig() {
  console.log('📋 Current Branch Protection Configuration:\n');

  Object.entries(BRANCH_PROTECTION_CONFIG).forEach(([branch, config]) => {
    console.log(`🌿 Branch: ${branch}`);
    console.log(`   Status checks: ${config.required_status_checks.contexts.join(', ')}`);
    console.log(`   Required reviews: ${config.required_pull_request_reviews.required_approving_review_count}`);
    console.log(`   Dismiss stale reviews: ${config.required_pull_request_reviews.dismiss_stale_reviews}`);
    console.log(`   Force pushes: ${config.allow_force_pushes ? 'Allowed' : 'Blocked'}`);
    console.log(`   Branch deletion: ${config.allow_deletions ? 'Allowed' : 'Blocked'}`);
    console.log('');
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--config')) {
    showConfig();
    return;
  }

  if (args.includes('--dry-run')) {
    console.log('🧪 Dry run mode - would setup branch protection with:');
    showConfig();
    return;
  }

  await setupBranchProtection();
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});

// Check if this is being run as a module
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupBranchProtection, BRANCH_PROTECTION_CONFIG };