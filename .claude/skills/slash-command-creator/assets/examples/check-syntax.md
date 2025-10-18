# Check Code Syntax

## Purpose
Verify that code in the current file has valid syntax and identify any issues that would prevent execution.

## Prerequisites
- TypeScript compiler (installed via `npm install`)
- Node.js 14+ (for JavaScript syntax checking)
- Relevant language tooling for the file type

## Instructions

1. **Preparation**
   - Identify the file type (TypeScript, JavaScript, JSON, etc.)
   - Note the file path and location in project

2. **Main Action**
   - For TypeScript files: Run `npx tsc --noEmit <file>`
   - For JavaScript files: Run `node --check <file>`
   - For JSON files: Attempt to parse with JSON.parse()
   - For YAML files: Validate YAML structure

3. **Process Results**
   - Collect all syntax errors reported
   - Extract line numbers and error messages
   - Organize by severity

4. **Format Output**
   - Present results as a clear checklist
   - Highlight errors in red
   - Provide fixes when obvious

## Output Format

```
Syntax Check Results for [filename]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ [filename] - Syntax valid

OR

✗ [filename] - [Error count] syntax error(s) found

Errors:
  Line 42: [Error description]
    → Solution: [suggested fix]

  Line 67: [Error description]
    → Solution: [suggested fix]

Summary: All issues must be fixed before the file can run.
```

## Common Issues

### Issue: "Unexpected token"
**Error message**: `Unexpected token "}" on line 42`
**Solution**: Check for mismatched braces, brackets, or parentheses. Count your opening and closing characters.

### Issue: "Unknown identifier"
**Error message**: `'someVariable' is not defined`
**Solution**: Either declare the variable before use or ensure it's imported properly.

### Issue: "Invalid JSON"
**Error message**: `Unexpected token } in JSON at position 123`
**Solution**: Check for trailing commas, unquoted keys, or mismatched quotes.

### Issue: "Type errors" (TypeScript)
**Error message**: `Type 'string' is not assignable to type 'number'`
**Solution**: Fix the type mismatch by either changing the variable type or the value being assigned.

## Examples

### Example 1: Valid JavaScript File
**Input**: JavaScript file with correct syntax
```javascript
function addNumbers(a, b) {
  return a + b;
}
```
**Output**: ✓ Syntax valid - No errors found

### Example 2: Invalid Syntax
**Input**: JavaScript file with syntax error
```javascript
function addNumbers(a, b) {
  return a + b
// Missing closing brace
```
**Output**:
```
✗ Syntax Error: Missing closing brace }
  Line 2: return a + b
          ↑ Expected } before end of file
```

### Example 3: TypeScript Type Error
**Input**: TypeScript with type mismatch
```typescript
const count: number = "five";
```
**Output**:
```
✗ TypeScript Error: Type mismatch
  Line 1: const count: number = "five"
          ↑ Type 'string' is not assignable to type 'number'
```

## Tips
- Run syntax check after making significant changes
- Fix syntax errors before running tests
- Use an IDE with syntax highlighting for faster error detection
- Consider enabling auto-formatting with Prettier to catch some issues automatically
- For large files, break them into smaller modules and check each separately

## Performance Notes
- Expected runtime: < 1 second for typical files
- Resource usage: Minimal (no file creation or external calls)
- Caching: Results are real-time for current file state
