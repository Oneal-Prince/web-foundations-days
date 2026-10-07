# Library Books REST API

This document describes a REST API for managing books in a library.

## Endpoints

### 1. List all books

- **Method:** GET
- **Path:** `/books`
- **Description:** Returns a list of all books in the library.
- **Success status:** `200 OK`

Example request:

```http
GET /books