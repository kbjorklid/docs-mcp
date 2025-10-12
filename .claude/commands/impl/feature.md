---
description: Plan, code, test and document a feature, or a change to an existing feature
---

## Context

User input: $ARGUMENTS

## Instructions

User should have given you instructions on a feature/change to implement. If not, do not do anything, just note that you don't know what to do.

1. Understand the codebase, plan the feature or change using the "change-planner" agent.

2. Implement the feature/change.

3. Add automated tests using the "automated-test-writer" agent to write and execute tests for the feature/change

4. Review, and possibly refactor, previously written code with "code-maintainability-enhancer" agent. Run all tests afterwards.

6. If the feature/change is visible to user, update README.md to explain how user can use the feature/change. Use "documentation-updater" agent.