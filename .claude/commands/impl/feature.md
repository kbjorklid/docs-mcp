---
description: Plan, code, test and document a feature
---

## Context

User input: $ARGUMENTS

## Instructions

User should have given you instructions on a feature to implmenet. If not, do not do anythning, just note that you don't know what to do.

1. Understand the codebase, plan the feature using the "feature-planner" agent.

2. Implement the feature.

3. Add automated tests using the "automated-test-writer" agent to write and execute tests for the feature

4. Review, and possibly refactor, previously written code with "code-maintainability-enhancer" agent. Run all tests afterwards.

6. If the feature is visible to user, update README.md to explain how user can use the feature. Use "documentation-updater" agent.