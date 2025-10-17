---
title: API Documentation
description: Comprehensive API documentation for testing search functionality
keywords:
  - API
  - REST
  - HTTP
  - authentication
  - endpoints
  - v2.1.0
---

# API Documentation

This is the comprehensive API documentation for our platform.

## Getting Started

Welcome to the API platform documentation.

## Authentication

Authentication is required for all API endpoints. You can use JWT Bearer tokens or OAuth 2.0.

### Bearer Token Authentication

Include the Authorization header: `Authorization: Bearer <your-token>`

### OAuth 2.0

Use the OAuth 2.0 flow for web applications.

## API Endpoints

### Users Management

GET /api/users - Retrieve all users
POST /api/users - Create a new user
PUT /api/users/:id - Update user
DELETE /api/users/:id - Delete user

### Authentication Endpoints

POST /api/auth/login - User login
POST /api/auth/logout - User logout
POST /api/auth/refresh - Refresh JWT token

### Data Management

GET /api/data - Retrieve data
POST /api/data - Create data
PUT /api/data/:id - Update data

## HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Version Information

Current API version: v2.1.0
Legacy versions: v1.0.0, v2.0.1

## Code Examples

```javascript
// API request example
const response = await fetch('/api/users', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in JSON format.

## Rate Limiting

API calls are limited to 1000 requests per hour per API key.