---
name: slash-command-creator
description: This skill provides comprehensive guidance for creating custom slash commands in Claude Code. It supports designing workflow commands (multi-step processes), utility commands (single-purpose tools), and integration commands. The skill includes templates, best practices, and structural patterns to follow when implementing slash commands.
---

# Slash Command Creator Skill

## Purpose

This skill enables creation of effective custom slash commands for Claude Code. Slash commands extend Claude Code's functionality by executing specialized workflows defined in `.claude/commands/` directory. They can automate complex multi-step tasks, integrate with external services, or provide quick utilities.

## When to Use This Skill

Use this skill when:
- Creating a new custom slash command for a Claude Code project
- Designing workflow commands that guide complex processes (e.g., `/impl:feature`, `/git:commit`)
- Building utility commands that provide single-purpose functionality
- Implementing integration commands that work with external tools or services
- Documenting reusable command patterns for a team or project

## How Claude Should Use This Skill

### 1. Understanding the Command Type

Start by identifying which command type matches the use case by referencing `references/slash-command-structure.md`:
- **Workflow commands**: Multi-step processes with branching logic and guided execution
- **Utility commands**: Simple, direct commands that perform a specific task
- **Integration commands**: Commands that interact with external services or APIs

### 2. Planning the Command

Review the templates in `assets/templates/` that match the command type:
- `workflow-template.md` - For multi-step guided processes
- `utility-template.md` - For single-purpose commands
- `integration-template.md` - For external service integration

Examine real examples in `assets/examples/` to understand concrete patterns:
- `impl-feature.md` - Workflow command example
- `check-syntax.md` - Utility command example
- `api-fetch.md` - Integration command example

### 3. Implementing the Command

To create the command:

1. **Create the file** in `.claude/commands/` with filename matching the command name (e.g., `my-command.md` - for commands such as `/impl:feature` (where there is a colon as part of the command name), you MUST create the command under directory for the part before the colon - in the example's case `impl` - and create the .md file of the part after the colon - in example's case `feature.md`.

2. **Include metadata** at the top in the proper format (see `references/best-practices.md` for details)

3. **Follow the structural pattern** for your command type from `references/slash-command-structure.md`

4. **Use context variables** if needed (e.g., `{user_request}`, `{code_context}`)

5. **Test the command** by running it in Claude Code and validating the output matches expectations

### 4. Best Practices

Reference `references/best-practices.md` for:
- Clear command naming conventions
- Proper prompt structure for consistency
- Performance optimization techniques
- Error handling and user feedback patterns
- Team collaboration guidelines

## Key Concepts

- **Command File Location**: All custom commands live in `.claude/commands/` directory relative to the project root
- **File Format**: Commands are markdown (`.md`) files with structured prompts
- **Naming Convention**: Use descriptive names with colons for namespacing (e.g., `/impl:feature`, `/check:types`)
- **Execution Model**: Commands execute as prompts sent to Claude, receiving the full project context
- **Trigger Pattern**: Commands are invoked as `/command-name` or `/namespace:command-name` in Claude Code

## Directory Structure

```
.claude/
└── commands/
    ├── my-workflow-command.md
    ├── my-utility-command.md
    └── my-integration-command.md
```

## Next Steps

1. Start with `references/slash-command-structure.md` to understand command patterns
2. Review examples in `assets/examples/` for your command type
3. Use the appropriate template from `assets/templates/` as a starting point
4. Implement and test your command following `references/best-practices.md`
