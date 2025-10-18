# Fetch Data from API

## Purpose
Fetch data from a specified API endpoint and process it for use in the project. This integrates external data sources into the application.

## Prerequisites

### Required Tools/Services
- Node.js with `node-fetch` or built-in `fetch` (Node 18+)
- Network access to the target API
- Understanding of the API's authentication method

### Required Configuration
- API endpoint URL
- Authentication credentials (API key, OAuth token, etc.)
- Rate limiting parameters if applicable

### Required Permissions/Credentials
- Valid API key or authentication token
- Permissions to access the requested data
- Understanding of API terms of use

### Setup Instructions
1. Obtain API credentials from the service provider
2. Store credentials securely (environment variables, not in code)
3. Test connectivity: `curl https://api.example.com/health` (or equivalent)
4. Document the API endpoint and authentication method

## Instructions

### 1. Validate Prerequisites
Before proceeding:
- [ ] Verify the API endpoint is accessible
- [ ] Confirm authentication credentials are valid
- [ ] Check API rate limits
- [ ] Verify required fields in request

If any check fails:
- Report which check failed and why
- Provide instructions to resolve the issue
- Suggest testing connectivity before proceeding

### 2. Prepare Request
- Determine the HTTP method (GET, POST, etc.)
- Build the request URL with parameters
- Add required headers (auth, content-type, etc.)
- Prepare request body if needed (for POST/PUT)

### 3. Execute API Call
- Make the HTTP request using fetch or similar
- Set appropriate timeout (typically 10-30 seconds)
- Handle connection errors gracefully
- Log the request for debugging

### 4. Handle Response
- Check HTTP status code
- Validate response format (usually JSON)
- Parse response data
- Extract required fields
- Handle errors returned by the API

### 5. Post-Integration Actions
- Validate fetched data against expected schema
- Transform data if needed for project use
- Cache result if appropriate
- Log completion

## Configuration

### Setting Up API Access

**Method 1: Environment Variables** (Recommended)
```
API_ENDPOINT=https://api.example.com/v1/data
API_KEY=your-secret-key-here
API_TIMEOUT=30000
```

**Method 2: Configuration File**
Create `.env.local` (not committed):
```
API_ENDPOINT=https://api.example.com/v1/data
API_KEY=your-secret-key-here
```

Load in code:
```typescript
const endpoint = process.env.API_ENDPOINT;
const apiKey = process.env.API_KEY;
```

**Method 3: Direct in Code** (For public APIs)
```typescript
const response = await fetch('https://api.example.com/public/data');
```

## Error Handling

### If authentication fails: "401 Unauthorized"
**Likely cause**: Invalid or expired API key/token
**Recovery steps**:
1. Verify the API key is correct and not expired
2. Check if the key has the required permissions
3. Regenerate the key if necessary
4. Update the environment variable

### If rate limit exceeded: "429 Too Many Requests"
**Likely cause**: Too many API calls in a short period
**Recovery steps**:
1. Implement exponential backoff retry logic
2. Add delays between requests
3. Contact API provider about rate limits
4. Consider caching responses

### If endpoint not found: "404 Not Found"
**Likely cause**: Incorrect URL or endpoint doesn't exist
**Recovery steps**:
1. Verify the URL is correct and current
2. Check API documentation for the correct endpoint
3. Test with a tool like Postman or curl
4. Contact API provider if endpoint should exist

### If service unavailable: "503 Service Unavailable"
**Likely cause**: API service is down for maintenance
**Recovery steps**:
1. Check API provider's status page
2. Wait and retry (use exponential backoff)
3. Implement fallback logic or cached data
4. Monitor status page for recovery

## Output Format

```
API Fetch Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Connected to API endpoint
✓ Authentication successful
✓ Request completed: [status code]
✓ Data processed: [record count] records

Retrieved Data Summary:
  - Total records: [count]
  - Fields: [field list]
  - Latest update: [timestamp]

Status: Ready to use in project
```

## Testing the Integration

### Test Prerequisites
1. Ensure environment variables are set
2. Verify network connectivity to API
3. Confirm API credentials are valid

### Manual Test
```bash
# Test with curl
curl -H "Authorization: Bearer $API_KEY" \
  https://api.example.com/v1/data

# Test with Node.js
node -e "
fetch('https://api.example.com/v1/data', {
  headers: { 'Authorization': 'Bearer ' + process.env.API_KEY }
}).then(r => r.json()).then(d => console.log(d))
"
```

Expected output: Valid JSON response with data

## Examples

### Example 1: Fetch Public Weather Data
**Scenario**: Get current weather for a city
**Configuration**:
```
API_ENDPOINT=https://api.openweathermap.org/data/2.5/weather
API_KEY=your-openweather-api-key
```
**Command**: Fetch weather for "New York"
**Expected result**: Current temperature, conditions, forecast data

### Example 2: Fetch Protected REST API
**Scenario**: Get user data from authenticated API
**Configuration**:
```
API_ENDPOINT=https://api.myservice.com/users
API_KEY=your-bearer-token
```
**Command**: Fetch current user profile
**Expected result**: User data including ID, name, email, preferences

## Security Considerations

- **Credentials**: Store API keys in environment variables, never commit to git
- **API Keys**: Rotate keys regularly, use dedicated service accounts
- **Data**: Be aware of data sensitivity when caching or logging
- **Logging**: Avoid logging sensitive fields like API keys or tokens
- **HTTPS**: Always use HTTPS for API calls (not HTTP)

## Troubleshooting

### "Network timeout"
- Check internet connection
- Verify API endpoint is reachable
- Increase timeout value if API is slow
- Try with a simple curl command first

### "Certificate error"
- Verify API uses valid SSL certificate
- Check if corporate proxy is intercepting
- Verify Node.js has up-to-date certificates

### "CORS error" (in browser)
- API doesn't support cross-origin requests
- Use backend API route instead of direct fetch
- Contact API provider about CORS support

### "Invalid response format"
- Verify API returns JSON (check Content-Type header)
- Check if response is actually an error page
- Validate API endpoint and parameters

## Rate Limits and Quotas

- **Default rate limit**: Varies by API (often 100-1000 requests/hour)
- **Check limits**: API response headers usually include `X-RateLimit-*` fields
- **Handling**: Implement exponential backoff and request queuing
- **Monitoring**: Log rate limit metrics to detect approaching limits

## Documentation References

- [Open API Initiative](https://www.openapis.org/)
- [REST API Best Practices](https://restfulapi.net/)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Node.js HTTPS Module](https://nodejs.org/api/https.html)

## Related Commands
- `/test:api-integration` - Test API integration thoroughly
- `/cache:api-data` - Cache API responses locally
- `/monitor:api-health` - Monitor API availability
