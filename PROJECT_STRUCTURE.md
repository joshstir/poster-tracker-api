# Project Structure

## Directory Layout

```
poster-tracker-api/
├── src/                          # Source code
│   ├── config/                   # Configuration files
│   │   ├── database.ts          # Prisma client configuration
│   │   └── multer.ts            # File upload configuration
│   ├── controllers/              # Route controllers
│   │   ├── poster.controller.ts
│   │   ├── playlist.controller.ts
│   │   └── tag.controller.ts
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts              # Azure AD authentication
│   │   └── errorHandler.ts      # Global error handler
│   ├── routes/                   # API routes
│   │   ├── poster.routes.ts
│   │   ├── playlist.routes.ts
│   │   └── tag.routes.ts
│   ├── services/                 # Business logic
│   │   ├── poster.service.ts
│   │   ├── playlist.service.ts
│   │   ├── storage.service.ts   # Azure Blob Storage
│   │   └── tag.service.ts
│   ├── types/                    # TypeScript types
│   │   └── index.ts
│   ├── utils/                    # Utility functions
│   │   └── validators.ts        # Request validation
│   └── index.ts                  # Application entry point
├── prisma/                       # Prisma ORM
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
├── dist/                         # Compiled JavaScript (generated)
├── node_modules/                 # Dependencies (generated)
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── .dockerignore                # Docker ignore rules
├── Dockerfile                   # Docker configuration
├── docker-compose.yml           # Local development with Docker
├── nodemon.json                 # Nodemon configuration
├── package.json                 # NPM configuration
├── tsconfig.json                # TypeScript configuration
├── README.md                    # Main documentation
├── API_DOCUMENTATION.md         # API reference
├── AZURE_DEPLOYMENT.md          # Azure deployment guide
├── ELASTICSEARCH_LOGGING.md     # Elasticsearch logging guide
├── MIGRATION_GUIDE.md           # Database migration guide
└── PROJECT_STRUCTURE.md         # This file
```

## Component Descriptions

### Source Code (`src/`)

#### Configuration (`config/`)

- **database.ts**: Initializes and exports Prisma client with logging configuration
- **multer.ts**: Configures file upload middleware with validation and size limits

#### Controllers (`controllers/`)

Controllers handle HTTP requests and responses:

- **poster.controller.ts**: Poster CRUD operations and search
- **playlist.controller.ts**: Playlist CRUD operations
- **tag.controller.ts**: Tag management operations

Each controller:
- Validates request data
- Calls appropriate services
- Returns formatted responses
- Handles errors

#### Middleware (`middleware/`)

- **auth.ts**: Azure AD JWT token validation and user creation
- **errorHandler.ts**: Global error handling for uncaught errors

#### Routes (`routes/`)

Route definitions for each resource:

- **poster.routes.ts**: `/api/posters/*` endpoints
- **playlist.routes.ts**: `/api/playlists/*` endpoints
- **tag.routes.ts**: `/api/tags/*` endpoints

Each route file:
- Defines endpoint paths
- Applies authentication middleware
- Applies validation middleware
- Maps to controller methods

#### Services (`services/`)

Business logic layer:

- **poster.service.ts**: Poster management logic
  - Create, read, update, delete posters
  - Tag assignment
  - Search functionality

- **playlist.service.ts**: Playlist management logic
  - Create, read, update, delete playlists
  - Poster associations
  - Tag assignment

- **storage.service.ts**: Azure Blob Storage integration
  - Image upload
  - Image deletion
  - Container management

- **tag.service.ts**: Tag management logic
  - Predefined tags
  - User custom tags

#### Types (`types/`)

TypeScript interfaces and types:

- Request/Response types
- JWT payload structure
- Service input/output types

#### Utils (`utils/`)

- **validators.ts**: Express validator rules for request validation

#### Application Entry (`index.ts`)

Main application file:
- Express app initialization
- Middleware setup (helmet, cors, morgan)
- Route registration
- Error handling
- Server startup

### Database (`prisma/`)

- **schema.prisma**: Database schema definition
  - User model (Azure AD users)
  - Poster model
  - Playlist model
  - Tag models (predefined and user)
  - Junction tables for many-to-many relationships

- **seed.ts**: Predefined tags seeding script

### Configuration Files

- **package.json**: NPM dependencies and scripts
- **tsconfig.json**: TypeScript compiler options
- **nodemon.json**: Development server auto-reload configuration
- **Dockerfile**: Multi-stage Docker build for production
- **docker-compose.yml**: Local development environment
- **.env**: Environment variables (local only, not committed)
- **.env.example**: Environment variable template

### Documentation

- **README.md**: Project overview, setup, and basic usage
- **API_DOCUMENTATION.md**: Complete API reference
- **AZURE_DEPLOYMENT.md**: Step-by-step Azure deployment guide
- **ELASTICSEARCH_LOGGING.md**: Elasticsearch logging setup and configuration
- **MIGRATION_GUIDE.md**: Database migrations and Prisma guide
- **PROJECT_STRUCTURE.md**: This file

## Data Flow

### Request Flow

1. Client sends HTTP request with JWT token
2. Express receives request
3. Middleware chain:
   - Helmet (security headers)
   - CORS (cross-origin handling)
   - Morgan (logging)
   - Body parser (JSON/URL-encoded)
4. Route handler:
   - Authentication middleware validates JWT
   - Validation middleware checks request data
   - Controller method executes
5. Controller calls service
6. Service interacts with:
   - Prisma (database)
   - Storage service (images)
7. Service returns data to controller
8. Controller formats and sends response

### Authentication Flow

1. User authenticates with Azure AD
2. Azure AD issues JWT token
3. Client includes token in Authorization header
4. Auth middleware:
   - Extracts token from header
   - Decodes and validates token
   - Checks issuer and audience
   - Verifies expiration
   - Gets or creates user in database
   - Attaches user to request object
5. Request continues to controller

### Image Upload Flow

1. Client sends multipart form data
2. Multer middleware:
   - Validates file type (JPEG, PNG, WebP)
   - Validates file size (max 10MB)
   - Stores file in memory buffer
3. Controller:
   - Receives file from request
   - Calls storage service
4. Storage service:
   - Generates unique filename
   - Uploads to Azure Blob Storage
   - Returns public URL
5. Controller:
   - Creates poster with image URL
   - Returns poster data

## Database Schema

### Core Entities

- **User**: Azure AD authenticated users
- **Poster**: Movie posters with metadata
- **Playlist**: Collections of posters

### Tag System

- **PredefinedTag**: System-defined tags (Action, Drama, etc.)
- **UserTag**: User-created custom tags
- **PosterTag**: Links posters to tags
- **PlaylistTag**: Links playlists to tags

### Relationships

- User → Poster (one-to-many)
- User → Playlist (one-to-many)
- User → UserTag (one-to-many)
- Poster ↔ Tag (many-to-many via PosterTag)
- Playlist ↔ Tag (many-to-many via PlaylistTag)
- Playlist ↔ Poster (many-to-many via PlaylistPoster)

## Security Considerations

### Authentication

- All endpoints require valid Azure AD JWT
- Tokens validated against Azure AD issuer
- Users automatically created on first login

### Authorization

- Users can only access their own data
- Database queries filtered by userId
- Poster ownership verified before update/delete

### File Upload

- File type validation (images only)
- File size limit (10MB)
- Unique filenames prevent overwrites
- Files stored in user-specific folders

### Environment Variables

- Sensitive data in environment variables
- .env file not committed to git
- Secure environment variables in Azure

## Development Workflow

### Local Development

1. Install dependencies: `npm install`
2. Configure `.env` file
3. Start PostgreSQL: `docker-compose up -d postgres`
4. Run migrations: `npm run prisma:migrate`
5. Seed database: `npm run prisma:seed`
6. Start dev server: `npm run dev`

### Testing Changes

1. Make code changes
2. Nodemon auto-reloads server
3. Test endpoints with curl/Postman
4. Check logs in console

### Building for Production

1. Build TypeScript: `npm run build`
2. Output in `dist/` directory
3. Run production server: `npm start`

### Docker Deployment

1. Build image: `docker build -t poster-tracker-api .`
2. Run container: `docker run -p 3000:3000 --env-file .env poster-tracker-api`

## Extending the Application

### Adding a New Endpoint

1. Define route in appropriate routes file
2. Create controller method
3. Implement service logic
4. Add validation rules if needed
5. Update API documentation

### Adding a New Entity

1. Add model to `prisma/schema.prisma`
2. Create migration: `npm run prisma:migrate`
3. Create service, controller, routes
4. Add to main app in `index.ts`
5. Update documentation

### Adding Third-Party Integration

1. Install packages: `npm install package-name`
2. Create service in `services/`
3. Configure in `config/` if needed
4. Add environment variables
5. Use in controllers

## Performance Optimization

### Database

- Indexes on frequently queried fields
- Pagination for large result sets (future)
- Connection pooling via Prisma

### File Storage

- Direct upload to Azure Blob Storage
- CDN for image serving (future)
- Image optimization (future)

### API

- Response compression (add gzip middleware)
- Caching (add Redis, future)
- Rate limiting (add rate-limit middleware)

## Monitoring and Debugging

### Logs

- Morgan for HTTP request logging
- Prisma query logging in development
- Console.error for errors

### Health Check

- `/health` endpoint for monitoring
- Container health check in Dockerfile

### Debugging

- TypeScript source maps enabled
- Detailed error messages in development
- Stack traces in development mode

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Predefined tags seeded
- [ ] Azure Blob Storage container created
- [ ] Azure AD app registration configured
- [ ] Docker image built and pushed
- [ ] Container deployed to Azure
- [ ] Health check endpoint responding
- [ ] HTTPS configured (production)
- [ ] Monitoring/logging configured
