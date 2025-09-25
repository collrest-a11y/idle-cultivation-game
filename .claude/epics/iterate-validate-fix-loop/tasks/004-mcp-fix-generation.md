---
name: MCP Integration for Automated Fix Generation
status: completed
created: 2025-09-25T19:38:00Z
updated: 2025-09-25T21:00:00Z
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/125
priority: P1
effort: 2d
dependencies: [003]
---

# Task 004: MCP Integration for Automated Fix Generation

## Objective
Integrate MCP (Model Context Protocol) to enable AI-assisted automatic fix generation for detected errors, creating a self-healing codebase.

## Background
Manual bug fixing is slow and error-prone. By leveraging AI through MCP, we can automatically generate, validate, and apply fixes for common error patterns.

## Acceptance Criteria

### Required
- [ ] MCP API connection established
- [ ] Error-to-fix mapping system implemented
- [ ] Fix suggestion pipeline created
- [ ] Code generation templates developed
- [ ] Fix confidence scoring system
- [ ] Context-aware fix generation
- [ ] Multi-fix strategy support
- [ ] Fix explanation generation
- [ ] Rollback mechanism for failed fixes
- [ ] Fix history tracking

### Nice to Have
- [ ] Learning from successful fixes
- [ ] Custom fix strategies per error type
- [ ] Fix optimization suggestions
- [ ] Automated refactoring recommendations

## Technical Implementation

### 1. MCP Client Setup
```javascript
// fix-generation/mcp-client.js
import { MCPClient } from '@anthropic/mcp-sdk';

export class MCPFixGenerator {
  constructor(apiKey) {
    this.client = new MCPClient({
      apiKey,
      model: 'claude-3-opus',
      maxTokens: 4000,
      temperature: 0.2  // Lower temperature for more deterministic fixes
    });
    
    this.fixTemplates = this.loadFixTemplates();
    this.fixHistory = [];
  }

  async generateFix(error, context) {
    const prompt = this.buildFixPrompt(error, context);
    
    try {
      const response = await this.client.complete({
        prompt,
        systemPrompt: this.getSystemPrompt(),
        stopSequences: ['</fix>']
      });

      const fix = this.parseFixResponse(response);
      fix.confidence = this.calculateConfidence(fix, error);
      
      return fix;
    } catch (err) {
      console.error('MCP fix generation failed:', err);
      return this.getFallbackFix(error);
    }
  }

  buildFixPrompt(error, context) {
    return `
## Error Details
Type: ${error.type}
Severity: ${error.severity}
Message: ${error.message}
Location: ${error.location || 'Unknown'}
Stack Trace:
${error.stack || 'Not available'}

## Code Context
${context.relevantCode}

## Current State
- File: ${context.fileName}
- Function: ${context.functionName}
- Line: ${context.line}

## Game Context
- Component: ${error.component}
- User Action: ${context.userAction}
- Expected Behavior: ${context.expectedBehavior}

## Task
Generate a fix for this error that:
1. Resolves the immediate issue
2. Doesn't break existing functionality
3. Follows the codebase patterns
4. Includes error handling

Provide the fix in the following format:
<fix>
<code>
// Your fix code here
</code>
<explanation>
// Explain what the fix does and why
</explanation>
<confidence>0-100</confidence>
</fix>
`;
  }

  getSystemPrompt() {
    return `You are an expert JavaScript developer fixing bugs in an idle cultivation game.
Key principles:
- Preserve existing game mechanics
- Maintain save compatibility
- Follow existing code patterns
- Add defensive programming
- Consider performance implications
- Test edge cases

The game uses vanilla JavaScript with these key systems:
- GameState for state management
- EventManager for event handling
- ViewManager for UI navigation
- Save/load system using localStorage

Always ensure character creation works correctly as it's critical for gameplay.`;
  }

  parseFixResponse(response) {
    const fixMatch = response.match(/<fix>([\s\S]*?)<\/fix>/);
    if (!fixMatch) {
      throw new Error('Invalid fix response format');
    }

    const fixContent = fixMatch[1];
    const codeMatch = fixContent.match(/<code>([\s\S]*?)<\/code>/);
    const explanationMatch = fixContent.match(/<explanation>([\s\S]*?)<\/explanation>/);
    const confidenceMatch = fixContent.match(/<confidence>(\d+)<\/confidence>/);

    return {
      code: codeMatch ? codeMatch[1].trim() : '',
      explanation: explanationMatch ? explanationMatch[1].trim() : '',
      confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 50,
      timestamp: Date.now()
    };
  }

  calculateConfidence(fix, error) {
    let confidence = fix.confidence || 50;

    // Adjust based on error type
    if (error.type === 'syntax-error') {
      confidence += 20;  // Syntax errors are straightforward
    } else if (error.type === 'functional-error') {
      confidence -= 10;  // Functional errors are complex
    }

    // Adjust based on fix complexity
    const lineCount = fix.code.split('\n').length;
    if (lineCount < 5) {
      confidence += 10;  // Simple fixes more reliable
    } else if (lineCount > 20) {
      confidence -= 10;  // Complex fixes riskier
    }

    // Check if we've fixed similar before
    const similarFixes = this.fixHistory.filter(h => 
      h.error.type === error.type && h.success
    );
    if (similarFixes.length > 0) {
      confidence += 15;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  getFallbackFix(error) {
    // Template-based fixes for common errors
    const templates = {
      'undefined-variable': (varName) => ({
        code: `if (typeof ${varName} === 'undefined') { var ${varName} = null; }`,
        explanation: `Added undefined check for ${varName}`,
        confidence: 60
      }),
      'null-reference': (obj) => ({
        code: `if (${obj}) { /* existing code */ }`,
        explanation: `Added null check for ${obj}`,
        confidence: 70
      }),
      'missing-function': (funcName) => ({
        code: `function ${funcName}() { console.warn('${funcName} not implemented'); }`,
        explanation: `Added stub function for ${funcName}`,
        confidence: 40
      })
    };

    // Try to match error to template
    for (const [pattern, template] of Object.entries(templates)) {
      if (error.type.includes(pattern) || error.message.includes(pattern)) {
        return template(error.details);
      }
    }

    // Generic fallback
    return {
      code: `try { /* problematic code */ } catch (e) { console.error('Error handled:', e); }`,
      explanation: 'Wrapped in try-catch for safety',
      confidence: 30
    };
  }

  async generateMultipleFixes(error, context, count = 3) {
    const fixes = [];
    
    for (let i = 0; i < count; i++) {
      const fix = await this.generateFix(error, {
        ...context,
        attempt: i + 1,
        previousFixes: fixes
      });
      fixes.push(fix);
    }

    return fixes.sort((a, b) => b.confidence - a.confidence);
  }

  recordFixResult(error, fix, success) {
    this.fixHistory.push({
      error: { type: error.type, severity: error.severity },
      fix: { confidence: fix.confidence },
      success,
      timestamp: Date.now()
    });

    // Keep only last 100 fixes
    if (this.fixHistory.length > 100) {
      this.fixHistory.shift();
    }
  }
}
```

### 2. Fix Application System
```javascript
// fix-generation/fix-applier.js
export class FixApplier {
  constructor() {
    this.appliedFixes = [];
    this.rollbackStack = [];
  }

  async applyFix(fix, targetFile, location) {
    // Create backup
    const backup = await this.createBackup(targetFile);
    this.rollbackStack.push(backup);

    try {
      // Parse the fix
      const fixAst = this.parseFix(fix.code);
      
      // Find insertion point
      const insertionPoint = this.findInsertionPoint(targetFile, location);
      
      // Apply the fix
      const modifiedCode = this.insertFix(targetFile, fixAst, insertionPoint);
      
      // Validate syntax
      await this.validateSyntax(modifiedCode);
      
      // Write the fixed code
      await this.writeFile(targetFile.path, modifiedCode);
      
      // Record application
      this.appliedFixes.push({
        fix,
        file: targetFile.path,
        location,
        timestamp: Date.now(),
        backup: backup.id
      });
      
      return { success: true, modifiedCode };
    } catch (error) {
      await this.rollback(backup);
      return { success: false, error: error.message };
    }
  }

  async createBackup(file) {
    const backup = {
      id: `backup_${Date.now()}`,
      path: file.path,
      content: file.content,
      timestamp: Date.now()
    };
    
    // Store backup (in memory or filesystem)
    await this.storeBackup(backup);
    return backup;
  }

  async rollback(backup) {
    await this.writeFile(backup.path, backup.content);
    this.rollbackStack = this.rollbackStack.filter(b => b.id !== backup.id);
  }

  async rollbackAll() {
    while (this.rollbackStack.length > 0) {
      const backup = this.rollbackStack.pop();
      await this.rollback(backup);
    }
  }

  parseFix(code) {
    // Parse JavaScript code to AST
    // This would use a parser like @babel/parser
    return {
      type: 'Program',
      body: [/* parsed AST nodes */]
    };
  }

  findInsertionPoint(file, location) {
    // Determine where to insert the fix
    if (location.line) {
      return { type: 'line', value: location.line };
    } else if (location.function) {
      return { type: 'function', value: location.function };
    } else {
      return { type: 'end', value: -1 };
    }
  }

  insertFix(file, fixAst, insertionPoint) {
    const lines = file.content.split('\n');
    
    switch (insertionPoint.type) {
      case 'line':
        lines.splice(insertionPoint.value, 0, fix.code);
        break;
      case 'function':
        // Find function and insert
        const funcIndex = lines.findIndex(line => 
          line.includes(`function ${insertionPoint.value}`)
        );
        if (funcIndex !== -1) {
          lines.splice(funcIndex + 1, 0, fix.code);
        }
        break;
      case 'end':
        lines.push(fix.code);
        break;
    }
    
    return lines.join('\n');
  }

  async validateSyntax(code) {
    try {
      new Function(code);  // Basic syntax check
      return true;
    } catch (error) {
      throw new Error(`Syntax error in fix: ${error.message}`);
    }
  }
}
```

### 3. Error Pattern Mapper
```javascript
// fix-generation/error-pattern-mapper.js
export class ErrorPatternMapper {
  constructor() {
    this.patterns = this.initializePatterns();
  }

  initializePatterns() {
    return [
      {
        pattern: /Cannot read prop(?:erty|erties) '(\w+)' of undefined/,
        type: 'undefined-property',
        fixStrategy: 'add-null-check',
        extract: (match) => ({ property: match[1] })
      },
      {
        pattern: /(\w+) is not defined/,
        type: 'undefined-variable',
        fixStrategy: 'declare-variable',
        extract: (match) => ({ variable: match[1] })
      },
      {
        pattern: /(\w+) is not a function/,
        type: 'not-a-function',
        fixStrategy: 'create-function-stub',
        extract: (match) => ({ function: match[1] })
      },
      {
        pattern: /Begin button not enabled/,
        type: 'character-creation-bug',
        fixStrategy: 'fix-character-creation',
        extract: () => ({ component: 'character-creation' })
      }
    ];
  }

  mapErrorToPattern(error) {
    const errorText = error.message || error.type;
    
    for (const pattern of this.patterns) {
      const match = errorText.match(pattern.pattern);
      if (match) {
        return {
          ...pattern,
          extracted: pattern.extract(match),
          originalError: error
        };
      }
    }
    
    return {
      type: 'unknown',
      fixStrategy: 'generic-fix',
      extracted: {},
      originalError: error
    };
  }

  getFixStrategy(mappedError) {
    const strategies = {
      'add-null-check': (data) => `
if (${data.object} && ${data.object}.${data.property}) {
  // Original code using ${data.object}.${data.property}
}`,
      
      'declare-variable': (data) => `
let ${data.variable} = null; // TODO: Initialize properly`,
      
      'create-function-stub': (data) => `
function ${data.function}() {
  console.warn('Function ${data.function} called but not implemented');
  // TODO: Implement function logic
}`,
      
      'fix-character-creation': () => `
// Fix character creation button enablement
function updateBeginButton() {
  const beginBtn = document.getElementById('begin-cultivation');
  if (!beginBtn) return;
  
  const hasAllSelections = 
    characterState.origin && 
    characterState.vow && 
    characterState.mark;
  
  beginBtn.disabled = !hasAllSelections;
  beginBtn.classList.toggle('enabled', hasAllSelections);
}

// Ensure button updates on selection
document.querySelectorAll('.fragment-choice').forEach(btn => {
  btn.addEventListener('click', updateBeginButton);
});`,
      
      'generic-fix': () => `
try {
  // Wrapped problematic code in try-catch
  // TODO: Add specific error handling
} catch (error) {
  console.error('Handled error:', error);
  // Graceful degradation
}`
    };
    
    return strategies[mappedError.fixStrategy] || strategies['generic-fix'];
  }
}
```

## Integration Example
```javascript
// fix-generation/auto-fixer.js
import { MCPFixGenerator } from './mcp-client';
import { FixApplier } from './fix-applier';
import { ErrorPatternMapper } from './error-pattern-mapper';

export class AutoFixer {
  constructor(apiKey) {
    this.generator = new MCPFixGenerator(apiKey);
    this.applier = new FixApplier();
    this.mapper = new ErrorPatternMapper();
  }

  async fixError(error, context) {
    // Map error to pattern
    const mappedError = this.mapper.mapErrorToPattern(error);
    
    // Generate fixes
    const fixes = await this.generator.generateMultipleFixes(
      error, 
      { ...context, pattern: mappedError }
    );
    
    // Try fixes in order of confidence
    for (const fix of fixes) {
      if (fix.confidence < 50) continue;  // Skip low confidence
      
      const result = await this.applier.applyFix(
        fix,
        context.file,
        context.location
      );
      
      if (result.success) {
        this.generator.recordFixResult(error, fix, true);
        return { success: true, fix, result };
      }
    }
    
    return { success: false, error: 'No suitable fix found' };
  }
}
```

## Success Metrics
- Fix generation success rate > 85%
- Fix application success rate > 90%
- Average fix confidence > 70%
- Character creation bug fixed automatically
- No regressions from applied fixes
- Fix generation time < 30 seconds

## Notes
- Prioritize safety over speed
- Always create backups before applying fixes
- Learn from successful fixes to improve future generation
- Consider manual review for critical fixes