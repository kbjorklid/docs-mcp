---
description: Improve code readability
---

## Context

User input: $ARGUMENTS

### GIT Status

_Git status_ (output of `git status -s`):
!`git status -s`

_Recent git commits_ (output of `git log --oneline -5`):
!`git log --oneline -5`

_Unstaged changes_ (output of `git diff`):
!`git diff`

_Staged changes_ (output of `git diff --staged`):
!`git diff --staged`


## Instructions

Your task is to analyze, and if suitable candidates for refactoring are found, improve code readability/maintainability.


### Analysis

You will analyze the code in scope:

1. **Analyze Code Structure**: Examine function organization, class design, and module layout for clarity and logical flow.

2. **Review Naming Conventions**: Ensure variables, functions, and classes have descriptive, meaningful names that clearly express their purpose

3. **Assess Code Readability**: Look for opportunities to improve code clarity through better formatting, and logical organization.

4. **Eliminate need for code comments**: If you find code comments, see if you can make code readable so that the comment becomes redundant.

5. **Check for Best Practices**: Verify adherence to TypeScript best practices, error handling patterns, and project-specific conventions from the codebase. 

Avoid large architectural changes (but you can suggest them).

### Ensure tests are in place

1. Use "test-coverage-planner" agent - explain what your plan is to it, so that it can give suggestions for test cases to implement. Explain that the tests should support the refactorings you're about to do.

2. Implement any test cases suggested.

3. Run all tests

### Implement the refactoring

1. Only after the tests have been successfully executed, do the actual refactoring.

2. Run all tests again.