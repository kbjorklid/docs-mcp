# API Documentation

## Overview
This API provides endpoints for managing resources.

## Authentication
All requests require authentication using Bearer tokens.

### API Key Authentication
Include your API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### Users Endpoint
```
GET /api/users
Authorization: Bearer YOUR_API_KEY
```

Returns a list of users.

### Projects Endpoint
```
POST /api/projects
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Creates a new project.

## Error Handling
The API returns standard HTTP status codes and error messages.