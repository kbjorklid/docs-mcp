---
description: Commit uncommitted changes to git
subtask: true
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

Do not re-execute the commands mentioned above; trust that the output is correct.

## Your task

If user has given instructions, follow them and create a git commit based on that input.

If there is no user input AND there are staged changes: create a commit of the staged changes.

If there is no user input AND there are no staged changes and/or untracked files AND there are unstaged changes: create a commit from the unstaged changes.

If there is nothing to commit (no changes at all and no untracked files): notify user that this is the case, do not create a commit.

## Commit message guidelines

Use 'Conventional Commits' standard.

Unless the commit header captures the change fully, you should add a succinct commit body.

If you know the 'why' of the commit (e.g. user has previously asked to fix a bug, or user has provided information in the 'user inputs' section),
include that in the commit message.
