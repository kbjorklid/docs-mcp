---
description: Plan, code, and test a refactoring.
---

## Context

User input: $ARGUMENTS

## Instructions

User should have given you instructions on refactoring to implmenet. If not, do not do anythning, just note that you don't know what to do.

1. Create a plan for the refactoring with "refactoring-planner" agent.

2. Now that you know what the needed refactoring is, ask "test-coverage-planner" to first see if it has suggestions how to improve the current code's coverage in a way that helps ensuring the refactoring does not break anything. 

3. Given the output from "test-coverage-planner", exclude any tests that would need to be rewritten or modified during refactoring. We only want tests that we don't have to modify and pass both before and after the refactoring. After this analysis has been completed, implement those tests.

4. Run all tests, fix any problems/

5. Implement the refactoring based on the plan made in #1.

6. Run all tests. Fix if anything is broken.

7. Run "code-maintainaibility-planner" agent, asking it to concentrate on the changed code.