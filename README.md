# Movie Poster Tracking API

A RESTful API for managing movie posters, playlists, and tags. Built for Azure deployment with Azure AD authentication, Azure Blob Storage for images, and Azure Database for PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication via Azure AD (Entra ID)
- **Poster Management**: Full CRUD operations for movie posters with image uploads
- **Playlist Management**: Create and manage collections of posters
- **Tag System**: Predefined tags + user-defined custom tags
- **Search**: Search posters by title, year, and tags
- **Cloud Storage**: Azure Blob Storage for poster images
- **Containerized**: Docker support for easy deployment to Azure Container Instances

## Tech Stack

- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Azure Database for PostgreSQL)
- **ORM**: Prisma
- **Authentication**: Azure AD / Entra ID (JWT)
- **Storage**: Azure Blob Storage
- **Containerization**: Docker

## Prerequisites

- Node.js 20 or higher
- PostgreSQL 14 or higher
- Azure account with:
  - Azure AD / Entra ID
  - Azure Database for PostgreSQL
  - Azure Blob Storage
  - Azure Container Registry (optional)
  - Azure Container Instances

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@your-azure-postgres.postgres.database.azure.com:5432/poster_tracker?schema=public&sslmode=require"

# Azure AD Authentication
AZURE_AD_TENANT_ID="your-tenant-id"
AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_ISSUER="https://login.microsoftonline.com/your-tenant-id/v2.0"

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING="your-connection-string"
AZURE_STORAGE_CONTAINER_NAME="poster-images"

# Application
PORT=3000
NODE_ENV=production
JWT_AUDIENCE="api://your-api-identifier"
```

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

Start a local PostgreSQL instance or use Azure Database for PostgreSQL:

```bash
# Using Docker Compose (local development)
docker-compose up -d postgres
```

### 3. Run Prisma Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed predefined tags
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Azure Deployment

### 1. Set Up Azure Resources

#### Azure AD App Registration

1. Go to Azure Portal > Azure Active Directory > App registrations
2. Create a new registration
3. Note the **Application (client) ID** and **Directory (tenant) ID**
4. Add API permissions if needed
5. Create an API scope (e.g., `api://poster-tracker-api/access_as_user`)

#### Azure Database for PostgreSQL

```bash
# Create resource group
az group create --name poster-tracker-rg --location eastus

# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group poster-tracker-rg \
  --name poster-tracker-db \
  --location eastus \
  --admin-user adminuser \
  --admin-password YourPassword123! \
  --sku-name Standard_B1ms \
  --version 16

# Create database
az postgres flexible-server db create \
  --resource-group poster-tracker-rg \
  --server-name poster-tracker-db \
  --database-name poster_tracker

# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group poster-tracker-rg \
  --name poster-tracker-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### Azure Blob Storage

```bash
# Create storage account
az storage account create \
  --name postertrackerstorage \
  --resource-group poster-tracker-rg \
  --location eastus \
  --sku Standard_LRS

# Get connection string
az storage account show-connection-string \
  --name postertrackerstorage \
  --resource-group poster-tracker-rg

# Create container
az storage container create \
  --name poster-images \
  --account-name postertrackerstorage \
  --public-access blob
```

### 2. Build and Push Docker Image

#### Option A: Azure Container Registry

```bash
# Create ACR
az acr create \
  --resource-group poster-tracker-rg \
  --name posterTrackerRegistry \
  --sku Basic

# Login to ACR
az acr login --name posterTrackerRegistry

# Build and push
docker build -t poster-tracker-api .
docker tag poster-tracker-api posterTrackerRegistry.azurecr.io/poster-tracker-api:latest
docker push posterTrackerRegistry.azurecr.io/poster-tracker-api:latest
```

#### Option B: Docker Hub

```bash
docker build -t your-username/poster-tracker-api:latest .
docker push your-username/poster-tracker-api:latest
```

### 3. Run Database Migrations

Before deploying the container, run migrations on your Azure PostgreSQL database:

```bash
# Set DATABASE_URL to your Azure PostgreSQL connection string
export DATABASE_URL="postgresql://adminuser:YourPassword123!@poster-tracker-db.postgres.database.azure.com:5432/poster_tracker?schema=public&sslmode=require"

# Run migrations
npx prisma migrate deploy

# Seed predefined tags
npx prisma db seed
```

### 4. Deploy to Azure Container Instances

```bash
az container create \
  --resource-group poster-tracker-rg \
  --name poster-tracker-api \
  --image posterTrackerRegistry.azurecr.io/poster-tracker-api:latest \
  --dns-name-label poster-tracker-api \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    PORT=3000 \
    AZURE_AD_TENANT_ID=your-tenant-id \
    AZURE_AD_CLIENT_ID=your-client-id \
    AZURE_AD_ISSUER=https://login.microsoftonline.com/your-tenant-id/v2.0 \
    JWT_AUDIENCE=api://your-api-identifier \
    AZURE_STORAGE_CONTAINER_NAME=poster-images \
  --secure-environment-variables \
    DATABASE_URL="postgresql://adminuser:YourPassword123!@poster-tracker-db.postgres.database.azure.com:5432/poster_tracker?schema=public&sslmode=require" \
    AZURE_STORAGE_CONNECTION_STRING="your-connection-string" \
  --registry-login-server posterTrackerRegistry.azurecr.io \
  --registry-username posterTrackerRegistry \
  --registry-password $(az acr credential show --name posterTrackerRegistry --query "passwords[0].value" -o tsv)
```

The API will be available at: `http://poster-tracker-api.eastus.azurecontainer.io:3000`

## API Endpoints

### Health Check

```
GET /health
```

### Authentication

All API endpoints require an Azure AD JWT token in the Authorization header:

```
Authorization: Bearer <your-azure-ad-token>
```

### Posters

```
POST   /api/posters              - Create a new poster (multipart/form-data)
GET    /api/posters              - Get all user's posters
GET    /api/posters/:id          - Get poster by ID
PUT    /api/posters/:id          - Update poster
DELETE /api/posters/:id          - Delete poster
GET    /api/posters/search       - Search posters (query params: title, year, tags)
```

#### Create Poster Example

```bash
curl -X POST http://localhost:3000/api/posters \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=The Shawshank Redemption" \
  -F "year=1994" \
  -F "tags=[\"Drama\",\"Crime\"]" \
  -F "image=@/path/to/poster.jpg"
```

### Playlists

```
POST   /api/playlists            - Create a new playlist
GET    /api/playlists            - Get all user's playlists
GET    /api/playlists/:id        - Get playlist by ID
PUT    /api/playlists/:id        - Update playlist
DELETE /api/playlists/:id        - Delete playlist
```

#### Create Playlist Example

```bash
curl -X POST http://localhost:3000/api/playlists \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Favorites",
    "tags": ["Drama", "Action"],
    "posterIds": [1, 2, 3]
  }'
```

### Tags

```
GET    /api/tags/predefined      - Get all predefined tags
GET    /api/tags/user            - Get user's custom tags
POST   /api/tags/user            - Create a new custom tag
```

## Database Schema

The application uses Prisma ORM with the following main entities:

- **User**: Authenticated users (Azure AD)
- **Poster**: Movie posters with title, year, and image
- **Playlist**: Collections of posters
- **PredefinedTag**: System-defined tags (Action, Drama, etc.)
- **UserTag**: User-defined custom tags
- **PosterTag**: Many-to-many relationship between posters and tags
- **PlaylistTag**: Many-to-many relationship between playlists and tags
- **PlaylistPoster**: Many-to-many relationship between playlists and posters

## Development Scripts

```bash
npm run dev              # Start development server
npm run build            # Build TypeScript
npm start                # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:seed      # Seed predefined tags
npm run prisma:studio    # Open Prisma Studio (GUI)
```

## Security Considerations

1. **Authentication**: All endpoints require valid Azure AD JWT tokens
2. **Authorization**: Users can only access their own data
3. **File Upload**: Only image files (JPEG, PNG, WebP) up to 10MB
4. **HTTPS**: Use HTTPS in production (handled by Azure)
5. **Environment Variables**: Never commit `.env` files
6. **SQL Injection**: Protected by Prisma ORM
7. **CORS**: Configure allowed origins in production

## Monitoring and Logs

View container logs in Azure:

```bash
az container logs \
  --resource-group poster-tracker-rg \
  --name poster-tracker-api \
  --follow
```

## Troubleshooting

### Database Connection Issues

- Ensure firewall rules allow your IP or Azure services
- Verify connection string format includes `sslmode=require`
- Check credentials and database name

### Authentication Issues

- Verify Azure AD tenant ID, client ID, and issuer URL
- Ensure JWT audience matches your API identifier
- Check token expiration

### Image Upload Issues

- Verify Azure Storage connection string
- Ensure container exists and has public blob access
- Check file size limits (max 10MB)

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
