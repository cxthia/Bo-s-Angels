#!/bin/bash

# Hackathon Submission Verification Script
# Run this before submitting to ensure everything is ready

echo "🔍 Bo's Angels - Submission Verification"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 is MISSING"
        ((checks_failed++))
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/ directory exists"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}✗${NC} $1/ directory is MISSING"
        ((checks_failed++))
        return 1
    fi
}

echo "📄 Checking Required Files..."
check_file "manifest.json"
check_file "README.md"
check_file "test-page.html"
check_file "LICENSE"
check_file ".gitignore"

echo ""
echo "📁 Checking Directory Structure..."
check_dir "background"
check_dir "content"
check_dir "icons"
check_dir "offscreen"
check_dir "popup"
check_dir "options"
check_dir "permission"

echo ""
echo "🎨 Checking Icon Files..."
check_file "icons/icon-16.png"
check_file "icons/icon-48.png"
check_file "icons/icon-128.png"

echo ""
echo " Checking Core Scripts..."
check_file "background/service-worker.js"
check_file "content/content-script.js"
check_file "content/candidates.js"
check_file "content/pointer.js"
check_file "content/ranking.js"
check_file "content/risk.js"
check_file "content/overlay.js"
check_file "content/input.js"
check_file "content/logging.js"

echo ""
echo "🎤 Checking Voice Recognition..."
check_file "offscreen/offscreen.html"
check_file "offscreen/offscreen.js"

echo ""
echo "🖥️ Checking UI Files..."
check_file "popup/popup.html"
check_file "popup/popup.js"
check_file "popup/popup.css"
check_file "options/options.html"
check_file "options/options.js"
check_file "options/options.css"

echo ""
echo "🔒 Checking for Sensitive Data..."
if grep -r "API_KEY\|api_key\|apiKey\|SECRET\|password\|token" --exclude-dir=.git --exclude="*.md" --exclude="verify-submission.sh" . > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Warning: Potential API keys or secrets found. Please verify these are not sensitive."
    ((checks_failed++))
else
    echo -e "${GREEN}✓${NC} No obvious API keys or secrets found"
    ((checks_passed++))
fi

echo ""
echo "📦 Checking for Unwanted Files..."
unwanted_found=0
for pattern in ".DS_Store" "node_modules" "*.log" "*.tmp" ".env"; do
    if find . -name "$pattern" -not -path "./.git/*" 2>/dev/null | grep -q .; then
        echo -e "${YELLOW}⚠${NC} Found unwanted files matching: $pattern"
        unwanted_found=1
    fi
done

if [ $unwanted_found -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No unwanted files found"
    ((checks_passed++))
else
    ((checks_failed++))
fi

echo ""
echo "📊 Verification Summary"
echo "========================================"
echo -e "Checks Passed: ${GREEN}$checks_passed${NC}"
echo -e "Checks Failed: ${RED}$checks_failed${NC}"

echo ""
if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your project is ready for submission! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Commit and push to GitHub"
    echo "2. Ensure repository is public"
    echo "3. Test installation from a fresh clone"
    echo "4. Submit your GitHub repository URL"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the issues above before submitting."
    exit 1
fi
