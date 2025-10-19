---
description: Fix a bug
---

## Context

User input: $ARGUMENTS

## Instructions

User should have given you instructions on a bug to fix. If not, do not do anythning, just note that you don't know what to do.


### Test baseline

- Run all tests to see if any fail
- If there are failing tests, ask user if they want to continue, abort, or if they'd like the tests / code to be fixed.
- Only if all tests pass or if user chooses 'continue' you should continue to 'Path Selection' below.

### Path Selection

Choose one of the following:
- **Path (A): Aim to create failing test first** - this is **preferred**, if you have a good guess how to reproduce the bug.
- **Path (B): Investigate the code, aiming to find the root cause**

### Path (A): Aim to create failing test first

1. Create an automated test (like others in the project) that exposes the bug. At first, do not try to analyze the code, concentrate on writing the test case that exposes the bug.

2. Run the test to see if it fails. If it does not, you may try again with another test.

3. If you cannot find a way to expose the bug through writing tests, go to Path (B) below.

4. Once you have a failing test, use "bug-investigator" agent to make a plan

5. Fix the bug.

### Path (B): Investigate the code, aiming to find the root cause

1. Use "bug-investiagator" agent to create an inital report of what the cause might be.

2. Given the report, use "test-coverage-planner" to plan for tests that might reveal the bug.

3. Run all tests.

4. Fix any errors exposed by the tests. If you think the tests did not expose the actual bug, please continue investigation and aim to fix the bug.

### At the end (common for both paths)

1. Run ALL tests, make sure they pass (except those that were already failing before)

2. If you made changes to code, run "code-maintainability-planner", ask it to concentrate on the changed code. Make sure you run all tests at the end.