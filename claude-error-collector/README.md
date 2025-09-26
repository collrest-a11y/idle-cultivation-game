# 🤖 Claude Error Collection System

## Complete Error-to-Fix Workflow (No API Key Required!)

This system collects errors from your game and formats them for me (Claude) to fix directly in our conversation.

## How It Works

### 1. Error Collection
Errors are automatically captured from your game and sent to a collector window where they're formatted for our conversation.

### 2. Direct Claude Integration
Instead of using an API key, you simply:
- Copy the formatted errors
- Paste them to me in our conversation
- I fix them immediately with full context of your codebase

### 3. PM System Integration
For complex issues, errors can be converted to PM issues that I can work on systematically.

## Setup Instructions

### Step 1: Add to Your Game
Add this single line to your game's HTML:
```html
<script src="claude-error-collector/game-connector.js"></script>
```

### Step 2: Open Error Collector
Open `claude-error-collector/index.html` in a browser window (keep it open while testing).

### Step 3: When Errors Occur
1. Errors automatically appear in the collector
2. Click "Copy for Claude" button
3. Paste the formatted errors in our conversation
4. I'll provide fixes immediately

## Advanced Features

### Create PM Issues
Click "Create PM Issue" to generate a structured issue file that can be imported with:
```
/pm:issue-import <filename>
```

### Test System
Use `test-error-collection.html` to verify everything works:
1. Open the test page
2. Click buttons to generate test errors
3. Watch them appear in the collector
4. Practice the copy-paste workflow

## Complete Workflow Example

1. **You encounter an error in your game**
   - Error is automatically captured
   - Appears in the collector window with full context

2. **You copy the formatted error**
   ```
   🔴 GAME ERRORS TO FIX

   ERROR 1:
   - Message: Cannot read property 'level' of undefined
   - File: js/game.js
   - Line: 142, Column: 15
   - Stack trace: [full stack]
   - User actions: [what user did before error]
   ```

3. **You paste it to me (Claude)**
   - I analyze the error with your codebase context
   - I provide the exact fix
   - You apply the fix
   - Error resolved!

## Why This Is Better

- **No API Key Required**: Works directly with me in our conversation
- **Full Context**: I already know your entire codebase
- **Immediate Fixes**: No waiting for automated systems
- **Human Oversight**: You control what gets fixed and when
- **PM Integration**: Complex issues become trackable tasks

## Files

- `index.html` - The error collector dashboard
- `game-connector.js` - Script that captures errors from your game
- `README.md` - This file
- `../test-error-collection.html` - Test page to verify system works

## Keyboard Shortcuts

- **Ctrl+C** after clicking "Copy for Claude" - Copy to clipboard
- **Ctrl+Shift+D** in your game - Open error collector (if configured)

## Tips

1. Keep the collector window open while developing
2. Clear errors periodically to avoid clutter
3. Use "Create PM Issue" for complex multi-error problems
4. Test the system with the test page first

## The Complete Loop

```
Your Game → Error Occurs → Captured by Connector → Shown in Collector
    ↓                                                     ↓
    ↓                                          Copy Formatted Error
    ↓                                                     ↓
    ↓                                          Paste to Claude (me)
    ↓                                                     ↓
    ←←←←←←←←← Apply Fix ←←←←←←← I Provide Fix ←←←←←←←←←←
```

That's it! No complex setup, no API keys, just simple error collection and direct fixes from me.