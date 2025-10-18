# Slash Command Structure Guide

## Overview

Slash commands in Claude Code are custom commands that execute specialized prompts to extend Claude's capabilities. Each command is a markdown file that contains the instructions Claude should follow when the command is invoked.

## File Location and Naming

- **Location**: `.claude/commands/` directory (relative to project root)
- **Format**: Markdown files (`.md` extension)
- **Naming**: Use lowercase with hyphens, optionally with colon-separated namespaces
  - Good: `my-command.md`, `impl:feature.md`, `check:types.md`
  - Avoid: `MyCommand.md`, `my_command.md`, `my command.md`

## Command Types and Patterns

### 1. Workflow Commands

**Purpose**: Guide Claude through multi-step processes with decision points and branching logic.

**Characteristics**:
- Multiple sequential steps
- Branching logic (if/then scenarios)
- Guided user interaction
- Progress tracking and feedback
- Context building across steps

**Example invocation**: `/impl:feature`, `/git:commit`, `/refactor:code`

**Basic structure**:
```markdown
# [Command Title]

## Overview
[Brief description of what this command does]

## Steps

### Step 1: [Step Name]
[Instructions for Claude to follow]

### Step 2: [Step Name]
[Instructions for Claude to follow]

### Step 3: [Step Name with Decision]
If [condition]:
  - [Action A]
  - [Action B]
Else:
  - [Alternative action]

## Success Criteria
[How to know if the workflow completed successfully]

## Common Issues
[Known problems and how to handle them]
```

### 2. Utility Commands

**Purpose**: Perform quick, single-purpose tasks that don't require multi-step guidance.

**Characteristics**:
- Single focused task
- Quick execution
- Minimal user interaction
- Direct output/results
- Reusable for common operations

**Example invocation**: `/check:syntax`, `/format:code`, `/count:lines`

**Basic structure**:
```markdown
# [Command Title]

## Purpose
[One-sentence description of what this command does]

## Instructions
1. [Primary action to take]
2. [Secondary action if needed]
3. [Format and present results]

## Output Format
[Describe what the output should look like]
```

### 3. Integration Commands

**Purpose**: Connect Claude Code with external services, APIs, or specialized tools.

**Characteristics**:
- External system interaction
- Configuration or credentials handling
- Data transformation between systems
- Error handling for external failures
- Documentation of prerequisites

**Example invocation**: `/api:fetch`, `/deploy:staging`, `/notify:slack`

**Basic structure**:
```markdown
# [Command Title]

## Purpose
[Description of what this command integrates with and why]

## Prerequisites
- [Required tool/service]
- [Required configuration]
- [Required permissions]

## Instructions
1. [Prepare/validate prerequisites]
2. [Make external call]
3. [Process response]
4. [Handle errors]

## Configuration
[How to set up the integration]

## Error Handling
[Common error scenarios and recovery steps]
```

## Context Variables

Commands can reference special variables that Claude Code injects:

- `{user_request}` - The original user request that triggered the command
- `{code_context}` - Current file or code context
- `{project_root}` - Path to project root
- `{timestamp}` - Current timestamp

## Metadata and Front Matter

While not always required, front matter can provide metadata:

```yaml
---
name: my-command
namespace: my
description: Brief description of the command
version: 1.0
---
```

## Best Practices

1. **Keep commands focused**: One command should have one primary purpose
2. **Use clear language**: Write instructions as if speaking to a capable assistant
3. **Provide examples**: Include concrete examples of expected input/output
4. **Handle errors gracefully**: Anticipate failure modes and provide recovery steps
5. **Document prerequisites**: Clearly state any requirements or setup needed
6. **Use consistent formatting**: Follow markdown conventions for readability
7. **Test thoroughly**: Verify the command works as intended before sharing
8. **Version your commands**: Update documentation when command logic changes

## Command Execution Model

When a user invokes a slash command:

1. Claude Code reads the command file from `.claude/commands/`
2. Claude Code expands any context variables
3. The command prompt is sent to Claude along with the user's full project context
4. Claude executes the instructions defined in the command file
5. Results are returned to the user in Claude Code

## Example: Simple Workflow Command

```markdown
# Implement Feature

## Overview
This command guides the process of implementing a complete feature, including planning, coding, testing, and documentation.

## Steps

### Step 1: Understand Requirements
Analyze the feature request and ask clarifying questions if needed:
- What is the primary goal?
- What are the acceptance criteria?
- Are there any constraints or dependencies?

### Step 2: Plan Implementation
Create a detailed implementation plan considering:
- Affected files and components
- API changes or new interfaces
- Testing strategy
- Documentation needs

### Step 3: Implement
Write the code following the project's conventions and style guide.

### Step 4: Test
Ensure all tests pass and coverage is adequate.

### Step 5: Document
Update relevant documentation for end users and developers.

## Success Criteria
- Feature is fully implemented
- All tests pass
- Documentation is updated
- Code follows project conventions
```

## Example: Simple Utility Command

```markdown
# Check Code Syntax

## Purpose
Verify that code in the current file has valid syntax without runtime errors.

## Instructions
1. Identify the file type (JavaScript, Python, TypeScript, etc.)
2. Run appropriate linter/syntax checker
3. Report any syntax errors with line numbers
4. Provide suggestions for fixing issues

## Output Format
Format results as a checklist:
- ✓ [File] - Syntax OK
- ✗ [File] - [Error count] errors found
  - Line X: [Error description]
```
