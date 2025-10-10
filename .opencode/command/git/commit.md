---
description: Commit uncommitted changes to git
subtask: true
---

## Context

*User input*: $ARGUMENTS

*Git status* (output of `git status -s`):
!`git status -s`

*Recent git commits* (output of `git log --oneline -5`):
!`git log --oneline -5`

*Unstaged changes* (output of `git diff`):
!`git diff`

*Staged changes* (output of `git diff --staged`):
!`git diff --staged`

## Your task

If user has given instructions, follow them and create a git commit based on that input.

If there is no user input AND there are staged changes: create a commit of the staged changes.

If there is no user input AND there are no staged changes and/or untracked files AND there are unstaged changes: create a commit from the unstaged changes.

If there is nothing to commit (no changes at all and no untracked files): notify user that this is the case, do not create a commit.

Note: in the Context section above, you can see a number of outputs of different Git commands. You can trust that these commands are already run and you don't have to run them again.

## Commit message guidelines

Use 'Conventional Commits' standard.

Keep the commit message succinct.

If you know the 'why' of the commit (e.g. user has previously asked to fix a bug, or user has provided information in the 'user inputs' section),
include that in the commit message.
