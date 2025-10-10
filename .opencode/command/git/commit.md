---
description: Commit uncommitted changes to git
---

## Context

*User input*: $ARGUMENTS

*Git status*:
!`git status -s`

*Recent git commits*:
!`git log --oneline -5`

*Unstaged changes*:
!`git diff`

*Staged changes*:
!`git diff --staged`

## Your task

If user has given instructions, follow them and create a git commit based on that input.

If there is no user input AND there are staged changes: create a commit of the staged changes.

If there is no user input AND there are no staged changes and/or untracked files AND there are unstaged changes: create a commit from the unstaged changes.

If there is nothing to commit (no changes at all and no untracked files): notify user that this is the case, do not create a commit.

## Commit message guidelines

Use 'Conventional Commits' standard.

Keep the commit message succinct.

If you know the 'why' of the commit (e.g. user has previously asked to fix a bug, or user has provided information in the 'user inputs' section),
include that in the commit message.
