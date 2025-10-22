# API Documentation

Complete API reference for the Movie Poster Tracking API.

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication

All API endpoints (except `/health`) require authentication via Azure AD JWT tokens.

### Getting a Token

Users must authenticate with Azure AD to obtain a JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Requirements

- Issuer: `https://login.microsoftonline.com/{tenant-id}/v2.0`
- Audience: `api://poster-tracker-api` (or your configured audience)
- Must contain `oid` (Object ID) and `email` claims

## Common Response Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Resource deleted successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Health Check

### Check API Health

```http
GET /health
```

**Authentication**: Not required

**Response**: `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "service": "poster-tracker-api"
}
```

---

## Posters

### Create Poster

Upload a new movie poster with metadata.

```http
POST /api/posters
```

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Movie title |
| year | integer | Yes | Release year (1800-current year + 5) |
| tags | array/string | No | Array of tag names (JSON string or array) |
| image | file | Yes | Image file (JPEG, PNG, WebP, max 10MB) |

**Example Request**:

```bash
curl -X POST http://localhost:3000/api/posters \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=The Shawshank Redemption" \
  -F "year=1994" \
  -F "tags=[\"Drama\",\"Crime\"]" \
  -F "image=@/path/to/poster.jpg"
```

**Response**: `201 Created`

```json
{
  "id": 1,
  "title": "The Shawshank Redemption",
  "year": 1994,
  "imageUrl": "https://postertrackerstorage.blob.core.windows.net/poster-images/user-id/uuid.jpg",
  "tags": ["Drama", "Crime"],
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T12:00:00.000Z"
}
```

### Get All Posters

Retrieve all posters for the authenticated user.

```http
GET /api/posters
```

**Authentication**: Required

**Response**: `200 OK`

```json
[
  {
    "id": 1,
    "title": "The Shawshank Redemption",
    "year": 1994,
    "imageUrl": "https://...",
    "tags": ["Drama", "Crime"],
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-01-20T12:00:00.000Z"
  },
  {
    "id": 2,
    "title": "The Godfather",
    "year": 1972,
    "imageUrl": "https://...",
    "tags": ["Drama", "Crime"],
    "createdAt": "2024-01-20T13:00:00.000Z",
    "updatedAt": "2024-01-20T13:00:00.000Z"
  }
]
```

### Get Poster by ID

Retrieve a specific poster.

```http
GET /api/posters/:id
```

**Authentication**: Required

**Parameters**:

| Field | Type | Location | Required | Description |
|-------|------|----------|----------|-------------|
| id | integer | path | Yes | Poster ID |

**Example Request**:

```bash
curl http://localhost:3000/api/posters/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**: `200 OK`

```json
{
  "id": 1,
  "title": "The Shawshank Redemption",
  "year": 1994,
  "imageUrl": "https://...",
  "tags": ["Drama", "Crime"],
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T12:00:00.000Z"
}
```

**Error Response**: `404 Not Found`

```json
{
  "error": "Poster not found"
}
```

### Update Poster

Update poster metadata (not the image).

```http
PUT /api/posters/:id
```

**Authentication**: Required

**Content-Type**: `application/json`

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No | Updated movie title |
| year | integer | No | Updated release year |
| tags | array | No | Updated array of tag names |

**Example Request**:

```bash
curl -X PUT http://localhost:3000/api/posters/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Shawshank Redemption",
    "year": 1994,
    "tags": ["Drama", "Crime", "Hope"]
  }'
```

**Response**: `200 OK`

```json
{
  "id": 1,
  "title": "The Shawshank Redemption",
  "year": 1994,
  "imageUrl": "https://...",
  "tags": ["Drama", "Crime", "Hope"],
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T14:00:00.000Z"
}
```

### Delete Poster

Delete a poster and its associated image.

```http
DELETE /api/posters/:id
```

**Authentication**: Required

**Parameters**:

| Field | Type | Location | Required | Description |
|-------|------|----------|----------|-------------|
| id | integer | path | Yes | Poster ID |

**Example Request**:

```bash
curl -X DELETE http://localhost:3000/api/posters/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**: `204 No Content`

### Search Posters

Search posters by title, year, or tags.

```http
GET /api/posters/search
```

**Authentication**: Required

**Query Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No | Partial title match (case-insensitive) |
| year | integer | No | Exact year match |
| tags | string/array | No | One or more tag names (OR search) |

**Example Requests**:

```bash
# Search by title
curl "http://localhost:3000/api/posters/search?title=shawshank" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by year
curl "http://localhost:3000/api/posters/search?year=1994" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by tags
curl "http://localhost:3000/api/posters/search?tags=Drama&tags=Crime" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Combined search
curl "http://localhost:3000/api/posters/search?title=god&year=1972&tags=Drama" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**: `200 OK`

```json
[
  {
    "id": 1,
    "title": "The Shawshank Redemption",
    "year": 1994,
    "imageUrl": "https://...",
    "tags": ["Drama", "Crime"],
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-01-20T12:00:00.000Z"
  }
]
```

---

## Playlists

### Create Playlist

Create a new playlist with optional posters.

```http
POST /api/playlists
```

**Authentication**: Required

**Content-Type**: `application/json`

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Playlist title |
| tags | array | No | Array of tag names |
| posterIds | array | No | Array of poster IDs to include |

**Example Request**:

```bash
curl -X POST http://localhost:3000/api/playlists \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "90s Classics",
    "tags": ["Drama", "Classic"],
    "posterIds": [1, 2, 3]
  }'
```

**Response**: `201 Created`

```json
{
  "id": 1,
  "title": "90s Classics",
  "tags": ["Drama", "Classic"],
  "posters": [
    {
      "id": 1,
      "title": "The Shawshank Redemption",
      "year": 1994,
      "imageUrl": "https://...",
      "tags": ["Drama", "Crime"]
    }
  ],
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T12:00:00.000Z"
}
```

### Get All Playlists

Retrieve all playlists for the authenticated user.

```http
GET /api/playlists
```

**Authentication**: Required

**Response**: `200 OK`

```json
[
  {
    "id": 1,
    "title": "90s Classics",
    "tags": ["Drama", "Classic"],
    "posters": [
      {
        "id": 1,
        "title": "The Shawshank Redemption",
        "year": 1994,
        "imageUrl": "https://...",
        "tags": ["Drama", "Crime"]
      }
    ],
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-01-20T12:00:00.000Z"
  }
]
```

### Get Playlist by ID

Retrieve a specific playlist.

```http
GET /api/playlists/:id
```

**Authentication**: Required

**Parameters**:

| Field | Type | Location | Required | Description |
|-------|------|----------|----------|-------------|
| id | integer | path | Yes | Playlist ID |

**Response**: `200 OK`

```json
{
  "id": 1,
  "title": "90s Classics",
  "tags": ["Drama", "Classic"],
  "posters": [
    {
      "id": 1,
      "title": "The Shawshank Redemption",
      "year": 1994,
      "imageUrl": "https://...",
      "tags": ["Drama", "Crime"]
    }
  ],
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T12:00:00.000Z"
}
```

### Update Playlist

Update playlist title, tags, or included posters.

```http
PUT /api/playlists/:id
```

**Authentication**: Required

**Content-Type**: `application/json`

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No | Updated playlist title |
| tags | array | No | Updated array of tag names |
| posterIds | array | No | Updated array of poster IDs |

**Example Request**:

```bash
curl -X PUT http://localhost:3000/api/playlists/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Best of the 90s",
    "tags": ["Drama", "Classic", "Must-Watch"],
    "posterIds": [1, 2, 3, 4]
  }'
```

**Response**: `200 OK`

```json
{
  "id": 1,
  "title": "Best of the 90s",
  "tags": ["Drama", "Classic", "Must-Watch"],
  "posters": [...],
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T15:00:00.000Z"
}
```

### Delete Playlist

Delete a playlist.

```http
DELETE /api/playlists/:id
```

**Authentication**: Required

**Response**: `204 No Content`

---

## Tags

### Get Predefined Tags

Retrieve all system-defined tags.

```http
GET /api/tags/predefined
```

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "tags": [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Science Fiction",
    "Thriller",
    "Western",
    "Biography",
    "Musical",
    "War",
    "Historical",
    "Family",
    "Noir"
  ]
}
```

### Get User Tags

Retrieve all custom tags created by the authenticated user.

```http
GET /api/tags/user
```

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "tags": [
    "Classic",
    "Must-Watch",
    "Rewatched"
  ]
}
```

### Create User Tag

Create a new custom tag.

```http
POST /api/tags/user
```

**Authentication**: Required

**Content-Type**: `application/json`

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tag name |

**Example Request**:

```bash
curl -X POST http://localhost:3000/api/tags/user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Must-Watch"}'
```

**Response**: `201 Created` (new tag)

```json
{
  "tag": "Must-Watch"
}
```

**Response**: `200 OK` (existing tag)

```json
{
  "tag": "Must-Watch",
  "message": "Tag already exists"
}
```

---

## Error Responses

### Validation Errors

```json
{
  "errors": [
    {
      "msg": "Title is required",
      "param": "title",
      "location": "body"
    },
    {
      "msg": "Year must be a valid year",
      "param": "year",
      "location": "body"
    }
  ]
}
```

### Authentication Errors

```json
{
  "error": "No authorization token provided"
}
```

```json
{
  "error": "Invalid token"
}
```

```json
{
  "error": "Token expired"
}
```

### Not Found Errors

```json
{
  "error": "Poster not found"
}
```

### Server Errors

```json
{
  "error": "Failed to create poster"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production use, consider implementing rate limiting using tools like:

- Azure API Management
- Express Rate Limit middleware
- Azure Front Door rate limiting

## CORS

The API accepts requests from all origins in the current configuration. For production, configure CORS to allow only trusted domains.

## Pagination

Pagination is not currently implemented. All list endpoints return all results. For large datasets, consider implementing pagination with `limit` and `offset` query parameters.

## Filtering and Sorting

Currently supported:
- **Posters**: Sorted by creation date (newest first)
- **Playlists**: Sorted by creation date (newest first)
- **Tags**: Sorted alphabetically

Future enhancements could include custom sorting and additional filtering options.
