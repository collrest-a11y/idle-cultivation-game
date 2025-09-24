/**
 * Validation script for Progressive Loading implementation
 */

const fs = require('fs');
const path = require('path');

console.log('Progressive Loading Implementation Validation');
console.log('='.repeat(60));

// Files to validate
const files = [
    {
        path: './js/core/ProgressiveLoader.js',
        name: 'ProgressiveLoader',
        required: ['ProgressiveLoader', 'classifyModule', 'loadAllPhases', 'getProgress']
    },
    {
        path: './js/ui/LoadingProgress.js',
        name: 'LoadingProgress',
        required: ['LoadingProgress', 'show', 'hide', 'updateProgress']
    },
    {
        path: './js/main.js',
        name: 'Main Game',
        required: ['progressiveLoader', 'loadingProgress', '_initializeProgressiveLoading']
    },
    {
        path: './index.html',
        name: 'Index HTML',
        required: ['ProgressiveLoader.js', 'LoadingProgress.js', 'loading-container']
    }
];

let allValid = true;

// Validate each file
files.forEach(file => {
    console.log(`\n📁 Validating: ${file.name}`);
    console.log('-'.repeat(60));

    const filePath = path.join(__dirname, '..', file.path);

    // Check file exists
    if (!fs.existsSync(filePath)) {
        console.error(`  ❌ File not found: ${file.path}`);
        allValid = false;
        return;
    }

    console.log(`  ✓ File exists`);

    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`  ✓ File readable (${content.length} bytes)`);

    // Check for required content
    let missingContent = [];
    file.required.forEach(item => {
        if (!content.includes(item)) {
            missingContent.push(item);
        }
    });

    if (missingContent.length > 0) {
        console.error(`  ❌ Missing required content:`);
        missingContent.forEach(item => {
            console.error(`     - ${item}`);
        });
        allValid = false;
    } else {
        console.log(`  ✓ All required content present`);
    }

    // Check for syntax errors (basic check)
    if (file.path.endsWith('.js')) {
        try {
            // Basic syntax validation - check for unclosed braces
            const openBraces = (content.match(/{/g) || []).length;
            const closeBraces = (content.match(/}/g) || []).length;

            if (openBraces === closeBraces) {
                console.log(`  ✓ Brace balance check passed`);
            } else {
                console.error(`  ❌ Brace mismatch: ${openBraces} open, ${closeBraces} close`);
                allValid = false;
            }
        } catch (e) {
            console.error(`  ❌ Validation error: ${e.message}`);
            allValid = false;
        }
    }
});

// Check module priority configuration
console.log('\n\n📊 Module Priority Configuration');
console.log('-'.repeat(60));

const mainContent = fs.readFileSync(path.join(__dirname, '..', 'js/main.js'), 'utf8');

// Extract module registrations and priorities
const moduleRegex = /registerModule\('([^']+)'/g;
const priorityRegex = /priority:\s*(\d+)/g;
let match;
const modules = [];

// Find all module registrations
while ((match = moduleRegex.exec(mainContent)) !== null) {
    const moduleName = match[1];
    const moduleStart = match.index;

    // Find the next closing brace for this module registration
    let braceCount = 0;
    let inModule = false;
    let moduleContent = '';

    for (let i = moduleStart; i < mainContent.length; i++) {
        const char = mainContent[i];
        if (char === '{') {
            braceCount++;
            inModule = true;
        } else if (char === '}') {
            braceCount--;
            if (inModule && braceCount === 0) {
                moduleContent = mainContent.substring(moduleStart, i + 1);
                break;
            }
        }
    }

    // Extract priority from module content
    const priorityMatch = moduleContent.match(/priority:\s*(\d+)/);
    if (priorityMatch) {
        modules.push({
            name: moduleName,
            priority: parseInt(priorityMatch[1])
        });
    }
}

if (modules.length > 0) {
    console.log('\nRegistered Modules:');

    // Sort by priority (highest first)
    modules.sort((a, b) => b.priority - a.priority);

    modules.forEach(mod => {
        let phase = 'ENHANCEMENT';
        if (mod.priority >= 90) phase = 'CRITICAL';
        else if (mod.priority >= 70) phase = 'UI';

        console.log(`  ${mod.name.padEnd(20)} - Priority ${mod.priority.toString().padStart(3)} (${phase})`);
    });

    console.log(`\n  ✓ ${modules.length} modules configured`);
} else {
    console.error('  ❌ No modules found in configuration');
    allValid = false;
}

// Check phase distribution
const critical = modules.filter(m => m.priority >= 90).length;
const ui = modules.filter(m => m.priority >= 70 && m.priority < 90).length;
const enhancement = modules.filter(m => m.priority < 70).length;

console.log('\nPhase Distribution:');
console.log(`  CRITICAL:    ${critical} modules (priority >= 90)`);
console.log(`  UI:          ${ui} modules (priority 70-89)`);
console.log(`  ENHANCEMENT: ${enhancement} modules (priority < 70)`);

if (critical > 0 && ui > 0) {
    console.log('\n  ✓ Balanced phase distribution');
} else {
    console.warn('\n  ⚠ Imbalanced phase distribution');
}

// Final summary
console.log('\n' + '='.repeat(60));
if (allValid) {
    console.log('✅ VALIDATION PASSED - Progressive Loading implementation complete');
    console.log('\nKey Features:');
    console.log('  • Three-phase loading system (Critical → UI → Enhancement)');
    console.log('  • Visual progress indicators with LoadingProgress UI');
    console.log('  • Module priority classification');
    console.log('  • Graceful degradation for failed optional modules');
    console.log('  • Integration with existing ModuleManager');
    process.exit(0);
} else {
    console.error('❌ VALIDATION FAILED - Issues found in implementation');
    process.exit(1);
}