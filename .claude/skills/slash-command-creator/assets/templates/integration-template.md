# [Integration Command Name]

## Purpose
[Brief description of what external service/tool this integrates with and why]

## Prerequisites

### Required Tools/Services
- [Service 1] - [Why it's needed]
- [Service 2] - [Why it's needed]

### Required Configuration
- [Configuration item 1] - [How to set it up]
- [Configuration item 2] - [How to set it up]

### Required Permissions/Credentials
- [Permission/credential 1]
- [Permission/credential 2]

### Setup Instructions
1. [First setup step]
2. [Second setup step]
3. [Verification step]

## Instructions

### 1. Validate Prerequisites
Before proceeding:
- [ ] Check that [Tool/Service 1] is installed/available
- [ ] Verify [Configuration item] is properly configured
- [ ] Confirm [Credentials] are in place
- [ ] Test access to [External Service]

If any check fails, provide the user with:
- Clear error message about what's missing
- Step-by-step setup instructions
- Links to documentation if available

### 2. Prepare Data/Context
- [How to gather or prepare input data]
- [Any transformation needed]
- [Validation of input]

### 3. Execute Integration
- [How to call/connect to the external service]
- [Parameters to pass]
- [Expected behavior]

### 4. Handle Response
- [How to interpret the response]
- [Data transformation if needed]
- [Status updates to provide]

### 5. Post-Integration Actions
- [Cleanup if needed]
- [Logging or recording]
- [Follow-up steps]

## Configuration

### Setting Up [Service Name]

**Method 1: Environment Variables**
```
[VARIABLE_NAME]=[value]
[VARIABLE_NAME_2]=[value]
```

**Method 2: Configuration File**
```
Create/edit config file at: [path]
Add the following:
[Config content example]
```

**Method 3: Command-line Arguments**
```
[Command with arguments example]
```

## Error Handling

### If [Error Type 1]: [Error Description]
**Likely cause**: [Why this might happen]
**Recovery steps**:
1. [First recovery action]
2. [Second recovery action]
3. [Verification]

**If unresolved**: [Escalation steps]

### If [Error Type 2]: [Error Description]
**Likely cause**: [Why this might happen]
**Recovery steps**:
1. [First recovery action]
2. [Second recovery action]

**If unresolved**: [Escalation steps]

### Connection Timeout or Service Unavailable
**Likely cause**: Network issue or service is down
**Recovery steps**:
1. Check your internet connection
2. Verify the service status
3. Wait a few moments and retry
4. Check if credentials are valid and have active access

## Output Format

```
Integration Results:
✓ Connected to [Service]
✓ Data sent successfully
✓ Response received and processed

Results:
[Formatted results here]

Summary: [Brief summary of what was accomplished]
```

## Testing the Integration

### Test Prerequisites
1. [Verification step 1]
2. [Verification step 2]

### Manual Test
```
Run this to verify the integration works:
[Test command/code]

Expected output:
[What success looks like]
```

### Examples

#### Example 1: [Specific Use Case]
**Scenario**: [Describe the scenario]
**Configuration**: [What needs to be configured]
**Command**: [How to invoke]
**Expected result**: [What should happen]

#### Example 2: [Another Use Case]
**Scenario**: [Describe the scenario]
**Configuration**: [What needs to be configured]
**Command**: [How to invoke]
**Expected result**: [What should happen]

## Security Considerations

- **Credentials**: [How to securely store/manage credentials]
- **API Keys**: [Best practices for your specific service]
- **Data**: [What data is sent and privacy considerations]
- **Logging**: [What gets logged and where]

## Troubleshooting

### "Access Denied" Error
[Troubleshooting steps]

### "Invalid Credentials" Error
[Troubleshooting steps]

### "Rate Limit Exceeded" Error
[Troubleshooting steps]

### "Service Unavailable" Error
[Troubleshooting steps]

## Rate Limits and Quotas

- [Rate limit 1]: [Details]
- [Rate limit 2]: [Details]
- [How to handle hitting limits]

## Documentation References

- [Link to service documentation]
- [Link to API reference]
- [Link to authentication guide]

## Related Commands
- [Link to related commands that might be useful]
