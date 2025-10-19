---
title: Code Examples
description: Various code examples for different programming languages
keywords:
  - code
  - examples
  - JavaScript
  - React
  - tutorial
---

# Code Examples

This document contains various code examples and programming patterns.

## JavaScript Examples

### Basic Functions

```javascript
function calculateTotal(items) {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total;
}

const total = calculateTotal([{ price: 10 }, { price: 20 }]);
console.log(total); // 30
```

### Array Methods

```javascript
// Using map, filter, and reduce
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);
```

## React Examples

### Component Example

```jsx
import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(response => response.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}
```

### State Management

```jsx
const [counter, setCounter] = useState(0);

const increment = () => {
  setCounter(prev => prev + 1);
};

const decrement = () => {
  setCounter(prev => prev - 1);
};
```

## Node.js Examples

### File Operations

```javascript
const fs = require('fs').promises;

async function readFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}
```

## Python Examples

### Basic Functions

```python
def calculate_average(numbers):
    """Calculate the average of a list of numbers."""
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)

result = calculate_average([1, 2, 3, 4, 5])
print(f"Average: {result}")
```

## Database Examples

### SQL Queries

```sql
-- Select users with their order counts
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
ORDER BY order_count DESC;
```

## API Examples

### Email Validation

```javascript
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

const isValid = validateEmail('user@example.com');
console.log(isValid); // true
```

### Phone Number Pattern

```javascript
function validatePhoneNumber(phone) {
  const phoneRegex = /^\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})$/;
  return phoneRegex.test(phone);
}

const isValidPhone = validatePhoneNumber('(555) 123-4567');
console.log(isValidPhone); // true
```

## Configuration Examples

### Environment Variables

```javascript
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'myapp'
  },
  api: {
    key: process.env.API_KEY,
    secret: process.env.API_SECRET
  }
};
```

## Utility Functions

### Date Formatting

```javascript
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}
```

## Error Handling

### Try-Catch Patterns

```javascript
async function apiCall(endpoint) {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```
