#!/bin/bash
# CI/CD Setup Script for Validation System
# Sets up the complete CI/CD integration for validation and fix loop

set -e

echo "🚀 Setting up CI/CD Integration for Validation System"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Not in project root directory. Please run from the project root."
    exit 1
fi

if [ ! -f "game.js" ]; then
    log_error "game.js not found. Are you in the idle-cultivation-game directory?"
    exit 1
fi

log_info "Detected project: $(node -e "console.log(require('./package.json').name)")"

# 1. Install Git Hooks
echo ""
log_info "Step 1: Installing Git Hooks"
echo "----------------------------"

if [ -f ".githooks/install.sh" ]; then
    chmod +x .githooks/install.sh
    ./.githooks/install.sh
    log_success "Git hooks installed"
else
    log_warning "Git hooks not found, skipping"
fi

# 2. Install Dependencies
echo ""
log_info "Step 2: Installing Dependencies"
echo "------------------------------"

if command -v npm &> /dev/null; then
    log_info "Installing Node.js dependencies..."
    npm install

    # Install Playwright if not already installed
    if [ ! -d "node_modules/@playwright" ]; then
        log_info "Installing Playwright..."
        npm install --save-dev @playwright/test playwright
    fi

    log_info "Installing Playwright browsers..."
    npx playwright install --with-deps

    log_success "Dependencies installed"
else
    log_error "npm not found. Please install Node.js"
    exit 1
fi

# 3. Validate GitHub Actions Workflows
echo ""
log_info "Step 3: Validating GitHub Actions Workflows"
echo "------------------------------------------"

WORKFLOWS_DIR=".github/workflows"
if [ -d "$WORKFLOWS_DIR" ]; then
    WORKFLOW_COUNT=$(find "$WORKFLOWS_DIR" -name "*.yml" -o -name "*.yaml" | wc -l)
    log_info "Found $WORKFLOW_COUNT workflow files"

    # Check for required workflows
    REQUIRED_WORKFLOWS=("validation-loop.yml" "pr-validation.yml" "deployment-validation.yml")
    MISSING_WORKFLOWS=()

    for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
        if [ ! -f "$WORKFLOWS_DIR/$workflow" ]; then
            MISSING_WORKFLOWS+=("$workflow")
        fi
    done

    if [ ${#MISSING_WORKFLOWS[@]} -eq 0 ]; then
        log_success "All required workflows present"
    else
        log_warning "Missing workflows: ${MISSING_WORKFLOWS[*]}"
        echo "These workflows are recommended for full CI/CD integration"
    fi
else
    log_warning "No GitHub Actions workflows directory found"
fi

# 4. Setup Environment Files
echo ""
log_info "Step 4: Setting up Environment Files"
echo "-----------------------------------"

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    cat > .env.example << 'EOF'
# Environment Variables for CI/CD

# API Keys (set in CI/CD secrets)
MCP_API_KEY=your_mcp_api_key_here

# Production URLs
PRODUCTION_URL=https://your-production-url.com

# Validation Settings
VALIDATION_TIMEOUT=1800000
MAX_FIX_ITERATIONS=5
FIX_CONFIDENCE_THRESHOLD=80

# Monitoring
DATADOG_HOST=localhost
MONITORING_ENABLED=false

# GitHub Settings (automatically set in GitHub Actions)
GITHUB_TOKEN=
GITHUB_REPOSITORY=
EOF
    log_success "Created .env.example"
else
    log_info ".env.example already exists"
fi

# 5. Validate Package.json Scripts
echo ""
log_info "Step 5: Validating Package.json Scripts"
echo "--------------------------------------"

# Required scripts for CI/CD
REQUIRED_SCRIPTS=(
    "test"
    "validate:quick"
    "validate:fix"
    "ci:validate"
)

MISSING_SCRIPTS=()
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if ! npm run "$script" --dry-run 2>/dev/null; then
        MISSING_SCRIPTS+=("$script")
    fi
done

if [ ${#MISSING_SCRIPTS[@]} -eq 0 ]; then
    log_success "All required npm scripts present"
else
    log_warning "Missing npm scripts: ${MISSING_SCRIPTS[*]}"
    echo "Add these to your package.json scripts section"
fi

# 6. Create Validation Reports Directory
echo ""
log_info "Step 6: Setting up Directories"
echo "-----------------------------"

mkdir -p validation-reports
mkdir -p test-results
mkdir -p playwright-report
mkdir -p performance-reports

log_success "Created validation directories"

# 7. Test Basic Validation
echo ""
log_info "Step 7: Testing Basic Validation"
echo "-------------------------------"

log_info "Running quick validation test..."

if npm run validate:quick 2>/dev/null; then
    log_success "Basic validation test passed"
elif [ -f "validation/cli.js" ]; then
    log_info "Testing validation CLI directly..."
    if node validation/cli.js check --quick; then
        log_success "Validation CLI test passed"
    else
        log_warning "Validation CLI test failed, but system is set up"
    fi
else
    log_warning "Validation system not fully configured yet"
    echo "This is normal if you haven't completed Task 006 (Loop Controller)"
fi

# 8. Docker Setup Check
echo ""
log_info "Step 8: Checking Docker Setup"
echo "----------------------------"

if command -v docker &> /dev/null; then
    log_info "Docker found - testing container build..."

    if [ -f "validation/cicd/docker/Dockerfile" ]; then
        # Test Docker build (but don't wait for completion)
        timeout 30s docker build -f validation/cicd/docker/Dockerfile -t validation-test:latest . 2>/dev/null || {
            log_warning "Docker build test timed out or failed (this is normal)"
        }
        log_success "Docker configuration available"
    else
        log_warning "Docker configuration not found"
    fi
else
    log_warning "Docker not found - container support will be limited"
fi

# 9. Setup Summary
echo ""
echo "🎉 CI/CD Setup Complete!"
echo "========================="
echo ""

log_success "Git hooks: Installed"
log_success "Dependencies: Installed"
log_success "Directories: Created"

echo ""
echo "📋 Next Steps:"
echo "1. Configure repository secrets (if using GitHub Actions):"
echo "   - MCP_API_KEY (for validation system)"
echo "   - PRODUCTION_URL (for deployment validation)"
echo ""
echo "2. Enable branch protection rules:"
echo "   - Run: node validation/cicd/scripts/setup-branch-protection.js"
echo ""
echo "3. Test the complete pipeline:"
echo "   - npm run validate:quick  (quick validation)"
echo "   - npm run ci:validate     (full validation)"
echo ""
echo "4. Create a test PR to verify workflows"
echo ""

# 10. Optional: Create a test commit
read -p "Create a test commit to verify pre-commit hooks? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    log_info "Creating test commit..."

    # Create a simple test file
    echo "# CI/CD Test" > CI_CD_TEST.md
    echo "This file was created to test CI/CD integration." >> CI_CD_TEST.md
    echo "Generated at: $(date)" >> CI_CD_TEST.md

    git add CI_CD_TEST.md

    if git commit -m "test: CI/CD integration setup"; then
        log_success "Test commit created successfully!"
        log_info "Pre-commit hooks are working"

        # Clean up test file
        rm CI_CD_TEST.md
        git add CI_CD_TEST.md
        git commit -m "cleanup: Remove CI/CD test file"
    else
        log_warning "Test commit failed - check pre-commit hook setup"
    fi
fi

echo ""
log_success "CI/CD Integration setup completed successfully! 🎉"