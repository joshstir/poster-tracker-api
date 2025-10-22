# Azure Deployment Guide

This guide provides detailed step-by-step instructions for deploying the Movie Poster Tracking API to Azure Container Instances.

## Prerequisites

- Azure CLI installed and configured
- Docker installed locally
- Azure subscription with appropriate permissions
- Domain or use Azure-provided DNS

## Step 1: Create Resource Group

```bash
# Set variables
RESOURCE_GROUP="poster-tracker-rg"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

## Step 2: Azure AD App Registration

### Via Azure Portal

1. Navigate to **Azure Active Directory** > **App registrations**
2. Click **New registration**
3. Configure:
   - Name: `Poster Tracker API`
   - Supported account types: Choose based on your needs
   - Redirect URI: Leave blank for API
4. Click **Register**
5. Note the **Application (client) ID** and **Directory (tenant) ID**

### Expose an API

1. In your app registration, go to **Expose an API**
2. Click **Add a scope**
3. Set Application ID URI: `api://poster-tracker-api`
4. Add scope:
   - Scope name: `access_as_user`
   - Who can consent: Admins and users
   - Display name: `Access poster tracker API as user`
   - Description: `Allows the app to access poster tracker API as the signed-in user`

### Get Values for Environment Variables

```bash
AZURE_AD_TENANT_ID="your-tenant-id"  # From Overview page
AZURE_AD_CLIENT_ID="your-client-id"  # From Overview page
AZURE_AD_ISSUER="https://login.microsoftonline.com/$AZURE_AD_TENANT_ID/v2.0"
JWT_AUDIENCE="api://poster-tracker-api"
```

## Step 3: Azure Database for PostgreSQL

### Create PostgreSQL Flexible Server

```bash
# Set variables
DB_SERVER_NAME="poster-tracker-db-$(date +%s)"  # Unique name
DB_ADMIN_USER="dbadmin"
DB_ADMIN_PASSWORD="ComplexPassword123!"  # Use strong password
DB_NAME="poster_tracker"

# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# Allow Azure services to access
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Construct DATABASE_URL
DATABASE_URL="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER_NAME}.postgres.database.azure.com:5432/${DB_NAME}?schema=public&sslmode=require"

echo "DATABASE_URL: $DATABASE_URL"
```

### Configure SSL (Recommended)

```bash
# Download SSL certificate
wget https://dl.cacerts.digicert.com/DigiCertGlobalRootCA.crt.pem

# Update DATABASE_URL to include SSL
DATABASE_URL="${DATABASE_URL}&sslcert=/path/to/DigiCertGlobalRootCA.crt.pem"
```

## Step 4: Azure Blob Storage

### Create Storage Account

```bash
# Set variables (storage account name must be globally unique, lowercase, no hyphens)
STORAGE_ACCOUNT_NAME="postertracker$(date +%s)"
CONTAINER_NAME="poster-images"

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Get connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --output tsv)

echo "Storage Connection String: $STORAGE_CONNECTION_STRING"

# Create blob container with public access for images
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME \
  --public-access blob

# Enable CORS for web access (optional)
az storage cors add \
  --services b \
  --methods GET HEAD POST PUT \
  --origins "*" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --account-name $STORAGE_ACCOUNT_NAME
```

### Configure Lifecycle Management (Optional)

To automatically delete old images:

```bash
az storage account management-policy create \
  --account-name $STORAGE_ACCOUNT_NAME \
  --policy '{
    "rules": [{
      "name": "deleteOldImages",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["poster-images/"]
        },
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterModificationGreaterThan": 365
            }
          }
        }
      }
    }]
  }'
```

## Step 5: Run Database Migrations

Before deploying, initialize your database:

```bash
# Install dependencies locally
npm install

# Set environment variable
export DATABASE_URL="$DATABASE_URL"

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed predefined tags
npx prisma db seed
```

## Step 6: Build Docker Image

### Option A: Azure Container Registry (Recommended)

```bash
# Set variables
ACR_NAME="posterTrackerACR$(date +%s)"
IMAGE_NAME="poster-tracker-api"
IMAGE_TAG="latest"

# Create ACR
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Login to ACR
az acr login --name $ACR_NAME

# Build and push image
az acr build \
  --registry $ACR_NAME \
  --image $IMAGE_NAME:$IMAGE_TAG \
  --file Dockerfile \
  .

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

echo "ACR Login Server: $ACR_LOGIN_SERVER"
echo "ACR Username: $ACR_USERNAME"
```

### Option B: Docker Hub

```bash
# Build locally
docker build -t your-dockerhub-username/poster-tracker-api:latest .

# Push to Docker Hub
docker login
docker push your-dockerhub-username/poster-tracker-api:latest
```

## Step 7: Deploy to Azure Container Instances

### Create Container Instance

```bash
# Set variables
CONTAINER_NAME="poster-tracker-api"
DNS_NAME="poster-tracker-api-$(date +%s)"  # Must be globally unique

# Deploy container
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image ${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG} \
  --dns-name-label $DNS_NAME \
  --ports 3000 \
  --cpu 1 \
  --memory 1.5 \
  --restart-policy Always \
  --environment-variables \
    NODE_ENV=production \
    PORT=3000 \
    AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID \
    AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID \
    AZURE_AD_ISSUER=$AZURE_AD_ISSUER \
    JWT_AUDIENCE=$JWT_AUDIENCE \
    AZURE_STORAGE_CONTAINER_NAME=$CONTAINER_NAME \
  --secure-environment-variables \
    DATABASE_URL="$DATABASE_URL" \
    AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD

# Get FQDN
FQDN=$(az container show \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --query ipAddress.fqdn \
  --output tsv)

echo "API URL: http://${FQDN}:3000"
echo "Health Check: http://${FQDN}:3000/health"
```

## Step 8: Verify Deployment

### Check Container Status

```bash
# Get container state
az container show \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --query "containers[0].instanceView.currentState" \
  --output table

# View logs
az container logs \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --follow
```

### Test Health Endpoint

```bash
curl http://${FQDN}:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "service": "poster-tracker-api"
}
```

## Step 9: Configure HTTPS (Production)

For production, you should use HTTPS. Options:

### Option A: Azure Application Gateway

```bash
# Create Application Gateway with SSL termination
# See: https://docs.microsoft.com/en-us/azure/application-gateway/
```

### Option B: Azure Front Door

```bash
# Create Front Door with custom domain and SSL
# See: https://docs.microsoft.com/en-us/azure/frontdoor/
```

### Option C: Azure API Management

```bash
# Create API Management instance
# Add your container instance as backend
# Configure SSL and custom domain
```

## Step 10: Set Up Monitoring

### Enable Application Insights

```bash
# Create Application Insights
APP_INSIGHTS_NAME="poster-tracker-insights"

az monitor app-insights component create \
  --app $APP_INSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

# Update container with Application Insights
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image ${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG} \
  --environment-variables \
    APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY \
    # ... other environment variables
```

### Set Up Alerts

```bash
# Create alert for container restart
az monitor metrics alert create \
  --name "Container-Restart-Alert" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerInstance/containerGroups/$CONTAINER_NAME" \
  --condition "count RestartCount > 3" \
  --description "Alert when container restarts more than 3 times"
```

## Updating the Application

### Build and Deploy New Version

```bash
# Build new image
az acr build \
  --registry $ACR_NAME \
  --image $IMAGE_NAME:v2 \
  --file Dockerfile \
  .

# Update container
az container delete \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --yes

# Recreate with new image
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image ${ACR_LOGIN_SERVER}/${IMAGE_NAME}:v2 \
  # ... same parameters as before
```

## Cost Optimization

### Use Azure Container Apps (Alternative to ACI)

Azure Container Apps provides better scaling and cost optimization:

```bash
# Create Container Apps environment
az containerapp env create \
  --name poster-tracker-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Deploy to Container Apps
az containerapp create \
  --name poster-tracker-app \
  --resource-group $RESOURCE_GROUP \
  --environment poster-tracker-env \
  --image ${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG} \
  --target-port 3000 \
  --ingress external \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
    # ... other variables
  --secrets \
    database-url="$DATABASE_URL" \
    storage-connection="$STORAGE_CONNECTION_STRING" \
  --min-replicas 0 \
  --max-replicas 3
```

## Cleanup Resources

To avoid charges, delete all resources:

```bash
az group delete \
  --name $RESOURCE_GROUP \
  --yes \
  --no-wait
```

## Troubleshooting

### Container Won't Start

```bash
# Check events
az container show \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --query "containers[0].instanceView.events" \
  --output table

# Check logs
az container logs \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME
```

### Database Connection Issues

```bash
# Test from container
az container exec \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --exec-command "/bin/sh"

# Inside container, test connection
nc -zv $DB_SERVER_NAME.postgres.database.azure.com 5432
```

### Storage Issues

```bash
# Verify container exists
az storage container show \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME

# Check permissions
az storage container show-permission \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME
```

## Security Best Practices

1. **Use Managed Identities**: Instead of connection strings, use Azure Managed Identity
2. **Key Vault**: Store secrets in Azure Key Vault
3. **Private Endpoints**: Use private endpoints for database and storage
4. **Network Isolation**: Deploy in Azure Virtual Network
5. **DDoS Protection**: Enable Azure DDoS Protection
6. **Regular Updates**: Keep dependencies and base images updated

## Next Steps

- Configure custom domain with SSL
- Set up CI/CD pipeline with GitHub Actions or Azure DevOps
- Implement backup strategies for database
- Configure geo-replication for storage
- Set up monitoring and alerting
- Implement rate limiting and throttling
