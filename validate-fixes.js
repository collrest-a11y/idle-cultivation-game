const fs = require('fs');
const path = require('path');

console.log('=== Validating Epic: doesnt-load Implementation ===\n');

// Check actual fixes vs simulated
const results = {
    actual: [],
    simulated: [],
    partial: []
};

// Issue #132: Typo fix
console.log('Checking Issue #132: Typo fixes...');
const mainJs = fs.readFileSync('js/main.js', 'utf8');
if (mainJs.includes('_initializeCoreSystems')) {
    results.actual.push('#132: Typo fixed in main.js');
    console.log('✅ ACTUAL: Typo fixed (_initializeCoreSystems)');
} else {
    console.log('❌ Typo NOT fixed');
}

// Check for new core files
console.log('\nChecking new core files...');
const newFiles = [
    'js/core/LoadingSystem.js',
    'js/core/ModuleValidator.js',
    'js/core/DependencyGraph.js',
    'js/core/ErrorRecovery.js'
];

newFiles.forEach(file => {
    if (fs.existsSync(file)) {
        results.actual.push(`File created: ${file}`);
        console.log(`✅ ACTUAL: ${file} exists`);
    } else {
        results.simulated.push(`File missing: ${file}`);
        console.log(`❌ SIMULATED: ${file} does not exist`);
    }
});

// Check error collector integration
console.log('\nChecking error collector integration...');
const indexHtml = fs.readFileSync('index.html', 'utf8');
if (indexHtml.includes('claude-error-collector') || indexHtml.includes('game-connector.js')) {
    results.actual.push('#137: Error collector integrated');
    console.log('✅ ACTUAL: Error collector integrated in index.html');
} else {
    results.simulated.push('#137: Error collector NOT integrated');
    console.log('❌ SIMULATED: Error collector not in index.html');
}

// Check for test files
console.log('\nChecking test files...');
const testDirs = ['tests/playwright', 'tests/e2e'];
testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        if (files.length > 0) {
            results.actual.push(`Test directory ${dir} has ${files.length} files`);
            console.log(`✅ ACTUAL: ${dir} exists with ${files.length} files`);
        }
    } else {
        results.simulated.push(`Test directory ${dir} missing`);
        console.log(`❌ SIMULATED: ${dir} does not exist`);
    }
});

// Check git commits
console.log('\nChecking git commits...');
const { execSync } = require('child_process');
const commits = execSync('git log --oneline -5', { encoding: 'utf8' });
console.log('Recent commits:');
console.log(commits);

// Summary
console.log('\n=== VALIDATION SUMMARY ===\n');
console.log(`ACTUAL FIXES: ${results.actual.length}`);
results.actual.forEach(fix => console.log(`  ✅ ${fix}`));

console.log(`\nSIMULATED (Not Implemented): ${results.simulated.length}`);
results.simulated.forEach(sim => console.log(`  ❌ ${sim}`));

// Overall assessment
const actualPercentage = (results.actual.length / (results.actual.length + results.simulated.length)) * 100;
console.log(`\n=== FINAL VERDICT ===`);
console.log(`Implementation: ${actualPercentage.toFixed(1)}% ACTUAL, ${(100 - actualPercentage).toFixed(1)}% SIMULATED`);

if (actualPercentage < 20) {
    console.log('\n⚠️ MOSTLY SIMULATED: The parallel agents provided designs and code but did not create actual files.');
    console.log('The code needs to be manually created in the worktree to be functional.');
} else if (actualPercentage < 80) {
    console.log('\n⚠️ PARTIALLY IMPLEMENTED: Some fixes are real, but key components are missing.');
} else {
    console.log('\n✅ MOSTLY IMPLEMENTED: The majority of fixes are actual and functional.');
}