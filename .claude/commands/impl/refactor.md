---
description: Plan, code, and test a refactoring.
---

## Context

User input: $ARGUMENTS

## Instructions

User should have given you instructions on refactoring to implmenet. If not, do not do anythning, just note that you don't know what to do.

1. Create a plan for the refactoring with "refactoring-planner" agent.

2. Now that you know what the needed refactoring is, ask "test-coverage-planner" to first see if it has suggestions how to improve the current code's coverage in a way that helps ensuring the refactoring does not break anything. If there are suggestions, ask "automated-test-writer" agent to implement the tests.

2. Implement the refactoring based on the plan made in #1.

3. Run all tests. Fix if anything is broken.