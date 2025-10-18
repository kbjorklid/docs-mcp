# Slash Command Best Practices

## Naming Conventions

### Command Names

**Use lowercase with hyphens**:
- ✓ `/check:syntax` - Readable, properly namespaced
- ✓ `/refactor:code` - Clear purpose with namespace
- ✓ `/format:imports` - Specific utility command
- ✗ `/CheckSyntax` - Avoid PascalCase
- ✗ `/check_syntax` - Avoid snake_case
- ✗ `/check syntax` - Avoid spaces

### Namespacing

Organize related commands with colons:
- `impl:` - Implementation commands (`impl:feature`, `impl:fix-bug`)
- `check:` - Verification commands (`check:syntax`, `check:types`)
- `refactor:` - Refactoring commands (`refactor:code`, `refactor:extract`)
- `doc:` - Documentation commands (`doc:api`, `doc:generate`)

### Naming for Clarity

Choose names that clearly describe what the command does:
- **Good**: `format:code`, `test:coverage`, `lint:style`
- **Vague**: `process`, `run`, `execute`
- **Better yet**: `lint:style`, `test:coverage`, `format:code`

## Prompt Structure and Consistency

### Clear Command Format

Start workflow commands with a clear structure:

```markdown
# [Clear Title Describing What Command Does]

## Overview
[1-3 sentence explanation of purpose and scope]

## Scope
This command handles:
- [What it does include]
- [What it does include]

This command does NOT handle:
- [What's explicitly out of scope]
- [Why certain things are excluded]

## Instructions
[Step-by-step guidance]
```

### Consistent Voice and Style

Maintain consistent language throughout:
- **Use imperative form**: "Analyze the code" not "Please analyze the code"
- **Be direct**: "Run tests" not "Consider running tests"
- **Use active voice**: "Implement the feature" not "The feature should be implemented"
- **Avoid personal pronouns**: "The code follows conventions" not "I notice your code follows conventions"

### Provide Context for Success

Include information that helps Claude succeed:

```markdown
## Context
- This is a [TypeScript/Python/etc] project
- Primary frameworks: [framework names]
- Code style: [relevant conventions]
- Testing framework: [test runner]

## Example
Input: [example input]
Expected output: [example output]
```

## Performance Optimization

### Keep Commands Focused

Overly broad commands are harder to execute well:
- ✗ `/impl:everything` - Too broad, unclear scope
- ✓ `/impl:feature` - Clear, focused process
- ✓ `/impl:fix-bug` - Specific workflow

### Avoid Unnecessary Complexity

Each decision point adds cognitive load:
- ✗ `/handle:all-scenarios` - Too many branches
- ✓ `/refactor:extract` - Clear, single purpose

### Provide Escape Hatches

Allow users to exit gracefully:

```markdown
## Exit Conditions
If at any point:
- The user requests to stop
- A critical error occurs that cannot be recovered
- Prerequisites are not met

Stop execution and report the issue clearly.
```

## Error Handling and User Feedback

### Clear Error Messages

When things go wrong, provide actionable feedback:

```markdown
## Error Handling

If [condition]:
1. Report the specific error
2. Explain why it occurred
3. Suggest a fix or next step
4. Ask if the user wants to continue or stop

Example:
"Build failed: TypeScript compilation error on line 42.
This likely means [reason].
To fix: [suggestion]"
```

### Progress Indicators

For longer-running commands, provide feedback:

```markdown
## Progress Feedback
- Mark each completed step with ✓
- Show what's currently being worked on
- Estimate remaining work if possible
```

### Success Validation

Help users know when the command succeeded:

```markdown
## Success Criteria
The command is complete when:
- ✓ All tests pass
- ✓ No linting errors remain
- ✓ Code coverage meets threshold
- ✓ Documentation is updated

Report clearly when all criteria are met.
```

## Team Collaboration Guidelines

### Documentation for Sharing

When sharing commands with a team, include:

```markdown
## Team Notes
- **Created by**: [Name]
- **Last updated**: [Date]
- **Maintenance**: [Who maintains this]
- **Dependencies**: [Any external tools needed]

## Usage Examples
Show how your team typically uses this command.

## Common Issues in Our Codebase
Document issues specific to your project.
```

### Versioning Commands

Track changes to important commands:

```markdown
---
version: 1.2
changes:
  - "1.2: Added support for TypeScript strict mode"
  - "1.1: Fixed issue with import ordering"
  - "1.0: Initial release"
---
```

### Review and Approval

For shared commands in a team:
1. Have teammates review the command logic
2. Test with real project scenarios
3. Document any team-specific customizations
4. Update regularly based on team feedback

## Advanced Patterns

### Conditional Workflows

Handle different scenarios based on project type:

```markdown
## Detect Project Type
First, identify if this is a:
- TypeScript project
- JavaScript (Node.js)
- Python project
- Other

Then adjust the implementation steps accordingly.
```

### Integration with Tools

When integrating with external tools:

```markdown
## Tool Integration

Before proceeding, verify:
- [Tool] is installed: `[command to check]`
- [Tool] is configured: `[how to verify]`
- [Tool] version is compatible: [version info]

If any check fails, provide installation instructions.
```

### Custom Output Formatting

Format results clearly for different scenarios:

```markdown
## Output Formatting

For success:
- Use ✓ for completed items
- Use → for next steps
- Use [ ] for optional items

For errors:
- Use ✗ for failures
- Use ⚠ for warnings
- Use ! for critical issues
```

## Testing Your Commands

### Manual Testing Checklist

Before sharing a command:
- [ ] Run the command from start to finish
- [ ] Test with different input scenarios
- [ ] Verify error messages are clear
- [ ] Check that examples work as documented
- [ ] Ensure command works across different operating systems if possible
- [ ] Have a teammate test without guidance

### Real-World Validation

Test with actual project scenarios:
- [ ] Run on a real project file, not a toy example
- [ ] Test with project's specific configuration
- [ ] Verify output matches project conventions
- [ ] Check compatibility with project's tools and frameworks

## Common Pitfalls

### ❌ Assumptions About Environment
**Problem**: Assuming tools are installed or configured
**Solution**: Check prerequisites explicitly and provide installation guidance

### ❌ Unclear Scoping
**Problem**: Commands that try to handle too many scenarios
**Solution**: Define clear scope and explicitly state what's out of scope

### ❌ Missing Context
**Problem**: Instructions that assume knowledge not provided
**Solution**: Include necessary context about the project, tools, and conventions

### ❌ No Error Recovery
**Problem**: Commands that fail without explanation or recovery steps
**Solution**: Anticipate failure modes and provide clear error handling

### ❌ Over-Engineering
**Problem**: Adding unnecessary complexity to simple tasks
**Solution**: Keep commands simple and focused on their core purpose

## Quick Reference: Command Templates

### Minimal Workflow Template
```markdown
# [Title]

## Steps
### 1. [Step Name]
[Instruction]

### 2. [Step Name]
[Instruction]

## Success Criteria
[How to know it worked]
```

### Minimal Utility Template
```markdown
# [Title]

## Purpose
[What it does in one sentence]

## Instructions
[How to do it]
```

### Minimal Integration Template
```markdown
# [Title]

## Prerequisites
[What's needed]

## Instructions
[How to integrate]

## Error Handling
[What to do if it fails]
```
