#!/bin/bash
# Install git hooks script

echo "📦 Installing git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-commit hook
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Set up git config to use custom hooks path (for future hooks)
git config core.hooksPath .githooks

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will now:"
echo "  • Run validation checks before each commit"
echo "  • Prevent commits with critical errors"
echo "  • Provide helpful fix suggestions"
echo ""
echo "To bypass the hook (not recommended):"
echo "  git commit --no-verify"
echo ""