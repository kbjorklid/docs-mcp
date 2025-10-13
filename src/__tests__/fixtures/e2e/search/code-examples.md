---
title: Code Examples and Documentation
description: Various code examples in different programming languages
keywords:
  - code examples
  - documentation
  - programming languages
  - snippets
---

# Code Examples and Documentation

This document contains various code examples for different programming languages and frameworks.

## JavaScript Examples

### Basic Functions

```javascript
function calculateTotal(items, tax = 0.08) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + tax);
}

// Usage example
const cartItems = [
  { name: "Book", price: 19.99 },
  { name: "Pen", price: 2.50 }
];

const total = calculateTotal(cartItems);
console.log(`Total: $${total.toFixed(2)}`);
```

### Async/Await Pattern

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}
```

### React Component

```jsx
import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData(userId)
      .then(userData => {
        setUser(userData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load user:', error);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

## Python Examples

### Data Processing

```python
import pandas as pd
import numpy as np
from typing import List, Dict

def analyze_sales_data(sales_file: str) -> Dict[str, float]:
    """
    Analyze sales data from CSV file and return key metrics.

    Args:
        sales_file: Path to the CSV file containing sales data

    Returns:
        Dictionary containing analysis results
    """
    # Load data
    df = pd.read_csv(sales_file)

    # Calculate metrics
    total_sales = df['amount'].sum()
    average_sale = df['amount'].mean()
    median_sale = df['amount'].median()

    return {
        'total_sales': total_sales,
        'average_sale': average_sale,
        'median_sale': median_sale,
        'transaction_count': len(df)
    }

# Example usage
results = analyze_sales_data('sales_data.csv')
print(f"Total Sales: ${results['total_sales']:,.2f}")
```

### Web API with Flask

```python
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    user = User(username=data['username'], email=data.get('email'))
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201
```

## Java Examples

### Spring Boot Controller

```java
@RestController
@RequestMapping("/api/products")
@Validated
public class ProductController {

    private final ProductService productService;

    @Autowired
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAllProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<ProductDTO> products = productService.getAllProducts(pageable);

        return ResponseEntity.ok(products.getContent());
    }

    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(
            @Valid @RequestBody CreateProductRequest request) {

        ProductDTO product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
```

## Go Examples

### HTTP Server

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
)

type Product struct {
    ID     int     `json:"id"`
    Name   string  `json:"name"`
    Price  float64 `json:"price"`
    Stock  int     `json:"stock"`
}

var products = []Product{
    {ID: 1, Name: "Laptop", Price: 999.99, Stock: 10},
    {ID: 2, Name: "Mouse", Price: 29.99, Stock: 50},
    {ID: 3, Name: "Keyboard", Price: 79.99, Stock: 25},
}

func main() {
    http.HandleFunc("/products", getProductsHandler)
    http.HandleFunc("/products/", getProductHandler)

    fmt.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func getProductsHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(products)
}

func getProductHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    idStr := r.URL.Path[len("/products/"):]
    id, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "Invalid product ID", http.StatusBadRequest)
        return
    }

    for _, product := range products {
        if product.ID == id {
            json.NewEncoder(w).Encode(product)
            return
        }
    }

    http.Error(w, "Product not found", http.StatusNotFound)
}
```

## Database Queries

### SQL Examples

```sql
-- Complex JOIN query with aggregations
SELECT
    u.username,
    u.email,
    COUNT(p.id) as project_count,
    AVG(p.created_at) as avg_project_date
FROM users u
LEFT JOIN projects p ON u.id = p.owner_id
WHERE u.created_at >= '2023-01-01'
GROUP BY u.id, u.username, u.email
HAVING COUNT(p.id) > 0
ORDER BY project_count DESC
LIMIT 10;

-- Window function example
SELECT
    title,
    category,
    price,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) as rank_in_category,
    PERCENT_RANK() OVER (ORDER BY price) as price_percentile
FROM products
WHERE status = 'active';
```

## Configuration Examples

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Testing Examples

### Jest Test

```javascript
describe('User Service', () => {
  test('should create user successfully', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'securePassword123'
    };

    const result = await userService.createUser(userData);

    expect(result).toBeDefined();
    expect(result.username).toBe(userData.username);
    expect(result.email).toBe(userData.email);
    expect(result.password).not.toBe(userData.password); // Should be hashed
  });

  test('should throw error for duplicate email', async () => {
    const userData = {
      username: 'testuser2',
      email: 'existing@example.com',
      password: 'securePassword123'
    };

    await expect(userService.createUser(userData))
      .rejects
      .toThrow('Email already exists');
  });
});
```