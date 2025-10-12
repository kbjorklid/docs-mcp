---
description: Fix a bug
---

## Context

User input: $ARGUMENTS

## Instructions

User should have given you instructions on a feature to implmenet. If not, do not do anythning, just note that you don't know what to do.

1. Use "bug-investigator" agent to get an initial report on where the bug might be.

2. Given the report, use "test-coverage-planner" to plan for tests that might reveal the bug.

3. Run all tests.

4. Fix any errors exposed by the tests. If you think the tests did not expose the actual bug, please continue investigation and aim to fix the bug.

5. If you made changes to code, run "code-maintainability-planner", ask it to concentrate on the changed code.