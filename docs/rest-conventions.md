---
title: REST Conventions
description: Conventions for RESTful API design, including naming conventions, versioning conventions, and best practices.
keywords: ["REST", "RESTful", "HTTP", "API", "Design"]
---

# REST Conventions

This document outlines the conventions and best practices for designing RESTful APIs.

## Introduction

Welcome to REST conventions. This guide will help you understand the fundamental principles of REST API design.

### HTTP Methods

HTTP methods define the operations that can be performed on resources.

#### GET

Use GET requests to retrieve resource representations. GET requests should be safe and idempotent.

#### POST

Use POST requests to create new resources.

#### PUT

Use PUT requests to update existing resources or create new ones with a specific ID.

## Naming Conventions

Proper naming is essential for API usability and consistency.

### Resource Names

Resource names should be nouns and use plural form for collections.

### URL Structure

URLs should be hierarchical and follow a logical pattern.

## Versioning

API versioning is important for maintaining backward compatibility.

### URL Versioning

Include version numbers in the URL path.

### Header Versioning

Use custom headers for version information.