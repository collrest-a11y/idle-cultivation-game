import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

export class ClaudeFixService {
  constructor(config = {}) {
    this.logger = new Logger('ClaudeService');

    // Initialize Claude client
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.config = {
      model: config.model || process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      maxTokens: parseInt(config.maxTokens || process.env.CLAUDE_MAX_TOKENS || '4000'),
      temperature: parseFloat(config.temperature || process.env.CLAUDE_TEMPERATURE || '0.2'),
      confidenceThreshold: parseInt(config.confidenceThreshold || process.env.CONFIDENCE_THRESHOLD || '75')
    };

    // Track fixes for deduplication
    this.recentFixes = new Map();
    this.fixHistory = [];

    // Rate limiting
    this.requestCount = 0;
    this.resetRequestCount();
  }

  resetRequestCount() {
    setInterval(() => {
      this.requestCount = 0;
      this.logger.info('Request count reset');
    }, 3600000); // Reset every hour
  }

  async analyzeAndFix(error) {
    try {
      // Check rate limit
      if (this.requestCount >= parseInt(process.env.MAX_FIXES_PER_HOUR || '100')) {
        throw new Error('Rate limit exceeded');
      }

      // Check if we've recently fixed this
      const errorKey = this.getErrorKey(error);
      if (this.recentFixes.has(errorKey)) {
        this.logger.info(`Skipping duplicate error: ${errorKey}`);
        return this.recentFixes.get(errorKey);
      }

      // Get code context
      const context = await this.getCodeContext(error);

      // Prepare the prompt
      const prompt = this.buildFixPrompt(error, context);

      // Call Claude API
      this.logger.info(`Requesting fix from Claude for: ${error.message}`);
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      this.requestCount++;

      // Parse the response
      const fix = this.parseFixResponse(response.content[0].text);

      // Cache the fix
      this.recentFixes.set(errorKey, fix);
      setTimeout(() => this.recentFixes.delete(errorKey), 300000); // Cache for 5 minutes

      // Add to history
      this.fixHistory.push({
        timestamp: new Date(),
        error: error.message,
        fix: fix.description,
        confidence: fix.confidence
      });

      return fix;

    } catch (error) {
      this.logger.error('Failed to get fix from Claude:', error);
      throw error;
    }
  }

  buildFixPrompt(error, context) {
    return `You are fixing a JavaScript error in an idle cultivation game. Provide a complete, working fix.

ERROR DETAILS:
- Message: ${error.message}
- File: ${error.file}
- Line: ${error.line}
- Column: ${error.column || 'unknown'}

STACK TRACE:
${error.stack || 'No stack trace available'}

CODE CONTEXT (lines ${context.startLine} to ${context.endLine}):
\`\`\`javascript
${context.code}
\`\`\`

USER ACTIONS BEFORE ERROR:
${error.userActions ? error.userActions.join(' -> ') : 'No action history'}

GAME STATE:
${error.gameState ? JSON.stringify(error.gameState, null, 2).substring(0, 500) : 'No state available'}

INSTRUCTIONS:
1. Identify the exact cause of the error
2. Provide a complete fix that replaces the problematic code
3. Ensure the fix maintains all existing functionality
4. Include error handling to prevent future occurrences
5. Follow the existing code style and patterns

RESPONSE FORMAT (JSON):
{
  "confidence": <number 0-100>,
  "description": "<brief description of the fix>",
  "reasoning": "<why this fix works>",
  "code": "<complete fixed code to replace the problematic section>",
  "startLine": <line number where replacement starts>,
  "endLine": <line number where replacement ends>,
  "tests": ["<test case 1>", "<test case 2>"]
}

Respond with ONLY the JSON object, no additional text.`;
  }

  parseFixResponse(responseText) {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const fix = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!fix.code || !fix.confidence) {
        throw new Error('Invalid fix format');
      }

      // Add metadata
      fix.timestamp = new Date();
      fix.applied = false;
      fix.tested = false;

      return fix;

    } catch (error) {
      this.logger.error('Failed to parse fix response:', error);

      // Return a default fix structure
      return {
        confidence: 0,
        description: 'Failed to parse fix',
        reasoning: 'Parse error',
        code: '',
        error: error.message
      };
    }
  }

  async getCodeContext(error, contextLines = 20) {
    try {
      // Resolve file path
      const filePath = this.resolveFilePath(error.file);

      if (!await fs.pathExists(filePath)) {
        this.logger.warn(`File not found: ${filePath}`);
        return {
          code: 'File not found',
          startLine: 1,
          endLine: 1
        };
      }

      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');

      // Calculate context range
      const errorLine = error.line || 1;
      const startLine = Math.max(1, errorLine - contextLines);
      const endLine = Math.min(lines.length, errorLine + contextLines);

      // Extract context with line numbers
      const contextLines = [];
      for (let i = startLine - 1; i < endLine; i++) {
        const lineNum = i + 1;
        const marker = lineNum === errorLine ? '>>> ' : '    ';
        contextLines.push(`${lineNum.toString().padStart(4)}: ${marker}${lines[i]}`);
      }

      return {
        code: contextLines.join('\n'),
        startLine,
        endLine,
        filePath
      };

    } catch (error) {
      this.logger.error('Failed to get code context:', error);
      return {
        code: 'Failed to read file',
        startLine: 1,
        endLine: 1
      };
    }
  }

  resolveFilePath(file) {
    // Handle different file path formats
    if (!file) return '';

    // Remove URL prefix if present
    file = file.replace(/^(file:\/\/\/|http:\/\/[^\/]+\/)/, '');

    // Convert to local path
    const gamePath = path.resolve(process.env.GAME_PATH || '../');

    if (path.isAbsolute(file)) {
      return file;
    }

    return path.join(gamePath, file);
  }

  getErrorKey(error) {
    return `${error.file}:${error.line}:${error.message}`.substring(0, 100);
  }

  async applyFix(fix, error) {
    try {
      const filePath = this.resolveFilePath(error.file);

      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copy(filePath, backupPath);
      this.logger.info(`Created backup: ${backupPath}`);

      // Read current file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');

      // Apply the fix
      const startLine = (fix.startLine || error.line - 5) - 1;
      const endLine = (fix.endLine || error.line + 5) - 1;
      const fixLines = fix.code.split('\n');

      // Replace lines
      lines.splice(startLine, endLine - startLine + 1, ...fixLines);

      // Write fixed file
      await fs.writeFile(filePath, lines.join('\n'));
      this.logger.info(`Applied fix to: ${filePath}`);

      // Mark as applied
      fix.applied = true;
      fix.appliedAt = new Date();
      fix.backupPath = backupPath;

      return {
        success: true,
        filePath,
        backupPath
      };

    } catch (error) {
      this.logger.error('Failed to apply fix:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async rollbackFix(fix) {
    try {
      if (!fix.backupPath) {
        throw new Error('No backup path available');
      }

      const filePath = this.resolveFilePath(fix.filePath);

      // Restore from backup
      await fs.copy(fix.backupPath, filePath);
      this.logger.info(`Rolled back fix from: ${fix.backupPath}`);

      // Clean up backup
      await fs.remove(fix.backupPath);

      return {
        success: true,
        message: 'Fix rolled back successfully'
      };

    } catch (error) {
      this.logger.error('Failed to rollback fix:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      recentFixes: this.recentFixes.size,
      totalFixes: this.fixHistory.length,
      averageConfidence: this.fixHistory.length > 0
        ? this.fixHistory.reduce((sum, f) => sum + f.confidence, 0) / this.fixHistory.length
        : 0
    };
  }
}