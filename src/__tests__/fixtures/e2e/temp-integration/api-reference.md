# API Reference

## Overview
This API provides RESTful endpoints for managing resources.

## Authentication
All API requests must include authentication.

### API Key Authentication
Include your API key in the header:
```
Authorization: Bearer YOUR_API_KEY
```

### OAuth 2.0
For web applications, use OAuth 2.0 flow.

## Endpoints

### Users

#### Get Current User
```
GET /api/v2/user
Authorization: Bearer YOUR_API_KEY
```

Response:
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Update User Profile
```
PUT /api/v2/user/profile
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "name": "Jane Doe",
  "bio": "Software Developer"
}
```

### Projects

#### List Projects
```
GET /api/v2/projects?page=1&limit=10
Authorization: Bearer YOUR_API_KEY
```

#### Create Project
```
POST /api/v2/projects
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "name": "My Project",
  "description": "A sample project"
}
```

## Error Handling
All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## Rate Limiting
API requests are limited to 1000 requests per hour per API key.

## SDK and Libraries

### JavaScript/TypeScript
```bash
npm install @example/api-client
```

```javascript
import { APIClient } from '@example/api-client';

const client = new APIClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.example.com'
});

const user = await client.users.getCurrentUser();
console.log(user);
```

### Python
```bash
pip install example-api-client
```

```python
from example_api_client import APIClient

client = APIClient(api_key='your-api-key')
user = client.users.get_current_user()
print(user)
```