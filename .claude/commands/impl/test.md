# Implement Comprehensive Tests

## Overview

This command guides you through planning, implementing, and validating automated tests for code that has been recently written or modified. It uses systematic test design techniques to ensure comprehensive coverage of happy paths, edge cases, error conditions, and boundary values.

## Scope

This command handles:
- Analyzing code to identify test scenarios using techniques like Boundary Value Analysis, Equivalence Partitioning, Decision Table Testing, and State Transition Testing
- Designing test cases that cover functionality comprehensively
- Implementing tests following project conventions and best practices
- Running tests and fixing failures
- Analyzing code coverage reports
- Improving coverage by implementing missing tests
- Providing a summary of testing work completed

This command does NOT handle:
- Performance profiling or optimization testing (separate concern)
- Load or stress testing (requires different infrastructure)
- Manual QA or user acceptance testing
- Deployment or release validation

## Context

- This is a TypeScript project using Jest as the testing framework
- Tests are located in `src/__tests__/` with `.test.ts` extensions
- The project uses end-to-end testing patterns for integration tests and unit tests for edge cases
- Mock patterns include mocking file system, external libraries, and dependencies
- Target coverage is >90% for critical code paths
- Test fixtures for e2e tests are organized in `src/__tests__/fixtures/`

## Steps

### Step 1: Understand Code Context and Requirements

Analyze the code that needs to be tested and clarify the testing requirements:

**Actions**:
- Read and understand the code structure and functionality
- Identify the primary purpose and key responsibilities of the code
- Determine what kind of tests are most appropriate (unit, integration, e2e)
- Ask clarifying questions if requirements are ambiguous

**Validation**:
- You understand what the code does and why
- You know what success and failure scenarios look like
- You understand project testing patterns and conventions
- Any ambiguous requirements are clarified

**Example Questions to Ask**:
- "Is this code better tested with unit tests (isolated logic) or e2e tests (full server process)?"
- "What are the primary failure modes we should test for?"
- "Are there specific edge cases or boundary values that are important?"

### Step 2: Plan Tests Using Systematic Techniques

Design comprehensive test cases using proven testing techniques:

**Actions**:
- **Boundary Value Analysis (BVA)**: Identify input ranges and test values at boundaries (min, min+1, max-1, max)
- **Equivalence Partitioning**: Group inputs into valid and invalid partitions, test one from each
- **Decision Table Testing**: For complex logic with multiple conditions, map all logical combinations
- **State Transition Testing**: If applicable, model and test all valid state transitions and invalid transitions
- **Happy Path & Error Cases**: Plan tests for normal operation and error conditions
- Create a detailed test plan with test names and what each tests

**Validation**:
- Test plan covers happy paths, edge cases, error conditions, and boundary values
- Test cases follow project naming conventions
- Plan includes both positive and negative test scenarios
- Coverage goals are identified

**Output Format**:
Present the test plan as a list:
```
Test Plan for [Component/Function]:
1. [Happy Path Test] - Tests normal operation
2. [Boundary Test] - Tests min/max values
3. [Invalid Input Test] - Tests error handling
4. [Edge Case Test] - Tests unusual but valid scenarios
...
```

### Step 3: Implement Tests

Write the tests following project conventions and best practices:

**Actions**:
- Create test files with `.test.ts` extension in `src/__tests__/` directory
- Use Jest test syntax with descriptive test names
- Follow the Arrange-Act-Assert pattern for test structure
- Mock external dependencies appropriately (file system, network, etc.)
- Import test code directly without `.js` extensions
- Add proper TypeScript typing throughout
- Include setup/teardown logic if needed

**Validation**:
- Tests follow project naming conventions and file organization
- Tests use proper TypeScript typing
- Tests follow Arrange-Act-Assert pattern
- Mock patterns match project conventions
- Error handling is tested appropriately
- All tests are runnable

### Step 4: Run Tests and Fix Failures

Execute the test suite and resolve any issues:

**Actions**:
- Run tests using `npm test`
- Review any test failures carefully
- Determine if the test is wrong or the code is wrong
- Fix either the test or implementation as appropriate
- Re-run tests to verify fixes
- Run the full test suite to check for regressions

**Validation**:
- All tests pass successfully
- No regressions in existing tests
- Test output is clear and meaningful

**Troubleshooting**:
- If a test fails, check the assertion error message first
- Verify the test setup (Arrange phase) is correct
- Check if the code under test has a bug or the test expectation is wrong
- Run tests in isolation if needed to debug

### Step 5: Generate and Analyze Coverage

Run code coverage reports to identify untested code paths:

**Actions**:
- Run tests with coverage: `npm run test:coverage`
- Review the coverage report
- Identify code paths with low or no coverage
- Determine if coverage gaps are meaningful (e.g., error recovery code) or trivial (e.g., log statements)
- Note which files have the lowest coverage

**Validation**:
- Coverage report is generated successfully
- Coverage metrics are calculated for all test code
- You understand which code paths are and aren't tested

**Understanding Coverage**:
- Statement coverage: % of code statements executed
- Branch coverage: % of conditional branches taken
- Function coverage: % of functions called
- Line coverage: % of lines executed
- Focus on branch coverage - it catches more edge cases

### Step 6: Improve Coverage (If Needed)

Add additional tests for meaningful coverage gaps:

**Actions**:
- Review coverage gaps from Step 5
- For each gap, decide if it's worth testing:
  - Error handling paths → Usually important, test these
  - Unusual conditions → Test if they could occur
  - Log statements → Usually not critical
- Implement additional tests for identified gaps
- Re-run tests with coverage to verify improvements

**Validation**:
- Coverage increases for targeted areas
- New tests are meaningful and add value
- All tests still pass
- Target coverage (>90%) is achieved for critical code

**Decision Points**:
- If coverage is already >90% for critical code: Skip this step
- If coverage has trivial gaps (logging, rare errors): Document and skip
- If coverage has meaningful gaps: Implement tests to cover them

### Step 7: Provide Summary and Next Steps

Document what was accomplished:

**Actions**:
- Summarize the testing work completed
- Report final test count and coverage metrics
- List any assumptions or limitations
- Identify any remaining coverage gaps that were deferred
- Suggest next steps if applicable

**Output Format**:
```
✓ Testing Summary
- Implemented [N] test cases covering [scenario]
- Achieved [X]% code coverage
- Tests use: [Jest, mocks, patterns used]
- All [N] tests passing
- Key scenarios covered: [list main test categories]
- Notes: [any assumptions or deferred items]
```

## Success Criteria

The testing workflow is complete when:
- ✓ Test plan is comprehensive and well-thought-out
- ✓ All new tests are implemented following project conventions
- ✓ All tests pass without failures
- ✓ Code coverage meets or exceeds 90% for critical code paths
- ✓ Edge cases and error conditions are properly tested
- ✓ No regressions in existing tests
- ✓ Summary of work is documented

## Error Handling

### If tests fail during implementation:
1. Review the test failure output carefully
2. Identify which assertion failed and why
3. Check if it's a code bug or test issue:
   - If test logic is wrong: Fix the test
   - If code is wrong: Fix the implementation
4. Re-run the failing test to verify the fix
5. Run full test suite to ensure no new regressions
6. Ask user to continue or stop if unable to resolve

### If code coverage is too low (<80%):
1. Review coverage report to identify gaps
2. Ask if user wants to add tests for the gaps
3. If yes: Identify critical gaps and implement tests
4. If no: Document the gaps and their reasons
5. Re-run coverage to verify improvements

### If project test setup differs from expectations:
1. Check `CLAUDE.md` and `jest.config.js` for configuration
2. Verify test file location and naming conventions
3. Confirm mock patterns used in project
4. Adjust test implementation to match project patterns
5. Ask user for clarification if needed

### If unable to run tests:
1. Check that `npm install` has been run
2. Verify test command: `npm test`
3. Check for TypeScript compilation errors: `npx tsc`
4. Review test output for specific error messages
5. Ask user to resolve environment issues or provide details

## Common Issues

### Issue: Tests use outdated mock patterns
**Symptom**: New tests fail due to import or mock setup differences from existing tests
**Cause**: Project test patterns evolved or documentation is out of sync
**Solution**: Review existing tests in the same tool/component to match patterns

### Issue: Coverage gaps in error handling
**Symptom**: Coverage report shows low coverage in error conditions
**Cause**: Error paths are harder to trigger and require specific test setup
**Solution**: Review error scenarios, add targeted tests with proper setup/mocking

### Issue: TypeScript type errors in tests
**Symptom**: Tests compile but have type checking issues
**Cause**: Incorrect mocking or missing type definitions
**Solution**: Use proper TypeScript typing, check mock return types

### Issue: Tests pass locally but need adjustment
**Symptom**: Tests work in development but fail in specific scenarios
**Cause**: Async handling, timing, or environment-specific behavior
**Solution**: Add proper async/await, use timeouts, check for race conditions

## Example Testing Workflow

**Starting scenario**: "I just implemented a new utility function for parsing configuration files"

**Test planning**:
- Happy path: Valid config file → parsed correctly
- Boundary: Empty file, very large file, minimal valid structure
- Error cases: Missing required fields, invalid JSON, malformed data
- Edge cases: Special characters, unicode, different line endings

**Implementation flow**:
1. Understand requirements (what inputs, what outputs, error scenarios)
2. Plan: Identify test scenarios using BVA and equivalence partitioning
3. Implement: Write tests for happy path, boundaries, and error cases
4. Run tests: Fix any failures in code or tests
5. Generate coverage: Run `npm run test:coverage`
6. Improve: Add tests for any coverage gaps
7. Summarize: Report final test count, coverage %, and what was covered

**Result**: Comprehensive test suite with >90% coverage, ready for production

## Exit Conditions

If at any point:
- The user requests to stop the testing workflow
- A critical blocker emerges that prevents testing (e.g., broken test infrastructure)
- The code under test requires significant changes before testing is practical
- The user clarifies that different testing approach is needed

Stop execution and clearly report:
1. What testing work was completed
2. What tests were implemented and passing
3. What coverage was achieved (if known)
4. Any in-progress tests or plans that can be resumed
5. Next steps when ready to resume or change approach

## Tips for Success

- **Start with understanding**: Don't implement tests until you fully understand what you're testing
- **Use systematic techniques**: BVA, Equivalence Partitioning, Decision Tables help find edge cases
- **Test both paths**: Always test success cases and error cases
- **Mock external dependencies**: Tests should be fast and isolated, not dependent on external services
- **Keep tests maintainable**: Use clear names and well-structured test code
- **Run tests frequently**: Run after each test implementation to catch issues early
- **Review coverage reports**: Use them to find untested code paths
- **Follow project conventions**: Match existing test patterns and styles for consistency
- **Communicate progress**: Report what tests you're implementing and why
- **Reuse existing patterns**: Look at similar tests in the project for examples to follow

## Related Commands

- `/impl:feature` - For implementing a complete feature with tests
- `/impl:fix-bug` - For fixing bugs with comprehensive test coverage
- `/check:syntax` - For verifying code syntax before testing
