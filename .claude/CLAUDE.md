# Claude Code Configuration for Idle Cultivation Game

## Project Management Integration

This project uses Claude Code Project Management (CCPM) for structured development workflow.

### Available Commands

#### Project Management
- `/pm:init` - Initialize PM system
- `/pm:prd-new <feature>` - Create Product Requirements Document
- `/pm:prd-parse <feature>` - Convert PRD to implementation epic
- `/pm:epic-oneshot <feature>` - Decompose and sync epic in one step
- `/pm:issue-start <issue-number>` - Begin work on specific issue
- `/pm:issue-sync` - Push progress updates to GitHub

#### Context Management
- `/context:create` - Generate project context
- `/context:update` - Refresh project understanding

### Development Principles

#### Code Standards
- **No Partial Implementations**: Complete features before moving to next
- **No Code Duplication**: Extract common functionality
- **Consistent Naming**: Follow camelCase for JavaScript, kebab-case for CSS
- **Test Coverage**: Every function needs corresponding tests
- **Single Responsibility**: One concern per function/class

#### Game-Specific Guidelines
- **Idle Game Patterns**: Ensure continuous progression without active play
- **Wuxia/Xianxia Themes**: Maintain authentic cultivation terminology
- **Performance**: Optimize for long-running sessions
- **Save System**: Robust state persistence and migration
- **Balance**: Careful progression curve design

#### Error Handling
- **Fail Fast**: Critical configurations should error immediately
- **Graceful Degradation**: Optional features continue on failure
- **User-Friendly Messages**: Clear feedback for player actions
- **Recovery**: Auto-save and state validation

#### Testing Approach
- **Real Integration**: No mock services for game systems
- **Comprehensive Coverage**: Test game loops, save/load, progression
- **Performance Testing**: Validate long-running idle calculations
- **Balance Testing**: Verify progression curves and rewards

### File Organization

```
.claude/
├── commands/          # Available slash commands
├── context/           # Project understanding and context
├── epics/            # Implementation epics from PRDs
├── prds/             # Product Requirements Documents
├── rules/            # Development rules and guidelines
└── scripts/          # Automation scripts
```

### Tone and Behavior

- **Be Direct**: Clear, concise communication
- **Question Assumptions**: Challenge requirements when unclear
- **Welcome Feedback**: Iterate based on user input
- **Focus on Quality**: Prefer correct implementation over speed
- **Consider Balance**: Game design implications of features

### Integration Notes

This configuration enables parallel development using GitHub Issues as task management, with comprehensive tracking from idea to implementation. The system is optimized for the unique challenges of idle game development including long-term progression, balance considerations, and performance optimization.