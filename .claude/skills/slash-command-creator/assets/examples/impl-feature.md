# Implement Feature

## Overview
This command guides the implementation of a complete feature from requirements through testing and documentation. It handles planning, implementation, testing, and documentation in a structured workflow.

## Scope
This command handles:
- Clarifying feature requirements and acceptance criteria
- Creating a detailed implementation plan
- Writing code following project conventions
- Running and fixing tests
- Updating documentation

This command does NOT handle:
- Deployment or release management
- User acceptance testing
- Performance optimization (unless critical)

## Context
- This is a TypeScript/JavaScript project
- Tests use Jest framework
- Code follows ESLint/Prettier conventions
- Documentation is in markdown

## Steps

### Step 1: Understand Requirements
Analyze the feature request and ensure clarity:

**Actions**:
- Read the feature description
- Identify the primary goal and acceptance criteria
- Ask clarifying questions if requirements are ambiguous
- Confirm scope and constraints

**Validation**:
- You understand what success looks like
- Acceptance criteria are clearly defined
- Dependencies and constraints are identified

**Example Questions**:
- "Who is the end user for this feature?"
- "Are there any existing related features to build on?"
- "What's the priority or timeline?"

### Step 2: Create Implementation Plan
Develop a detailed technical plan:

**Actions**:
- Identify files that need to be created or modified
- List API changes or new interfaces
- Outline the testing strategy
- Determine documentation updates needed

**Validation**:
- The plan covers all requirements
- Implementation approach is clear
- Testing strategy addresses all scenarios
- Documentation needs are identified

**Plan Structure**:
1. Files to modify/create
2. Key components/functions to implement
3. Test cases needed
4. Documentation updates required
5. Estimated effort

### Step 3: Implement the Feature
Write the code following project conventions:

**Actions**:
- Create new files as needed
- Implement the core functionality
- Add necessary imports and exports
- Follow project code style and conventions

**Validation**:
- Code follows project ESLint/Prettier configuration
- Interfaces and types are properly defined
- Error handling is appropriate
- Logs or debugging aids are added where helpful

### Step 4: Write Tests
Ensure proper test coverage:

**Actions**:
- Write unit tests for core logic
- Add integration tests if needed
- Verify all test cases pass
- Check that coverage meets project threshold

**Validation**:
- All new code has corresponding tests
- Tests cover success and error cases
- Coverage threshold is met (typically 80%+)
- No test failures exist

### Step 5: Run Full Test Suite
Verify nothing broke:

**Actions**:
- Run the full test suite: `npm test`
- Address any test failures
- Verify the entire suite passes

**Validation**:
- All tests pass
- No new failures introduced
- Coverage reports look good

### Step 6: Update Documentation
Document the feature for users:

**Actions**:
- Update README.md if relevant
- Add JSDoc comments to public APIs
- Update any relevant API documentation
- Add usage examples if appropriate

**Validation**:
- Documentation is clear and complete
- Examples are accurate
- API descriptions match implementation

## Success Criteria
The feature implementation is complete when:
- ✓ All requirements are implemented
- ✓ All tests pass
- ✓ Test coverage meets threshold
- ✓ Code follows project conventions
- ✓ Documentation is updated
- ✓ No linting errors exist

## Error Handling

### If tests fail:
1. Review the test output carefully
2. Identify what assertion failed
3. Fix the implementation or the test
4. Re-run the failing test to verify fix
5. Run full test suite to ensure no regressions

### If code has linting errors:
1. Review the linting output
2. Fix violations manually or use `--fix` flag
3. Verify the fix didn't introduce new issues
4. Commit the corrected code

### If requirements are unclear:
1. Ask clarifying questions about the specific unclear item
2. Document the clarification
3. Adjust the implementation plan if needed
4. Update documentation to reflect the clarification

## Common Issues

### Issue: Tests were passing locally but fail in CI
**Symptom**: Tests pass with `npm test` but fail in continuous integration
**Cause**: Usually platform-specific paths, timing issues, or environment differences
**Solution**: Check CI logs, run tests multiple times locally, check for platform-specific code

### Issue: TypeScript compilation errors
**Symptom**: `npx tsc` reports errors even though eslint passes
**Cause**: TypeScript strict mode catches issues that eslint misses
**Solution**: Fix type errors before proceeding, may need to improve type definitions

### Issue: Code style conflicts
**Symptom**: Prettier reformats code differently than expected
**Cause**: Project Prettier configuration differs from assumptions
**Solution**: Run `npm run format` to auto-fix, then commit the formatted code

## Example Feature Implementation

**Starting scenario**: "Add ability to export reports as PDF"

**Acceptance criteria**:
- Users can click an export button
- PDF contains all report data
- PDF is properly formatted
- Export completes within 5 seconds

**Implementation flow**:
1. Understand requirements (PDF library, data format)
2. Plan: identify Report component, add export button, integrate PDF library
3. Implement: add button to UI, write PDF generation logic
4. Write tests: test PDF generation, export button click
5. Run tests: verify all pass
6. Document: update user guide for export feature

**Result**: Feature complete and ready for deployment

## Tips for Success
- Ask clarifying questions early to avoid rework
- Create comprehensive tests before implementation if possible
- Commit frequently with clear messages
- Run tests often during development
- Keep the scope focused on requirements
- Update documentation as you code, not after

## Exit Conditions

If at any point:
- The user requests to stop (e.g., "Please save progress and stop")
- Requirements change significantly (ask if they want to stop and re-plan)
- A blocker emerges that the user needs to resolve

Stop execution and clearly report:
1. What was completed
2. What remains to be done
3. Any in-progress files or branches that exist
4. Next steps when ready to resume

## Related Commands
- `/impl:fix-bug` - For fixing existing bugs
- `/refactor:code` - For refactoring without new features
- `/test:coverage` - For analyzing test coverage
