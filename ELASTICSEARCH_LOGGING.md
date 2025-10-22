# Elasticsearch Logging Guide

This guide explains how to configure and use Elasticsearch for centralized logging in the Movie Poster Tracking API.

## Overview

The application uses **Winston** as the logging framework with support for:
- **Console logging** (always enabled, great for development)
- **Elasticsearch transport** (optional, for production centralized logging)

## Features

- Structured JSON logging
- Automatic request/response logging with timing
- Error tracking with stack traces
- User activity tracking
- Slow request detection (> 3 seconds)
- Daily index rotation
- Support for multiple Elasticsearch authentication methods

## Logged Information

### Request Logs
- Request ID (unique per request)
- HTTP method and URL
- Query parameters
- User IP address
- User agent
- Response status code
- Request duration
- User ID and email (if authenticated)

### Application Logs
- Application startup/shutdown
- Azure Blob Storage operations
- Database operations (via Prisma)
- Authentication events
- Error events with stack traces

### Custom Metadata
- Environment (development/production)
- Service name (poster-tracker-api)
- Application version
- Node.js version

## Setup Options

### Option 1: Elastic Cloud (Recommended)

Elastic Cloud provides managed Elasticsearch with built-in security and monitoring.

#### 1. Create Elastic Cloud Account

Visit [cloud.elastic.co](https://cloud.elastic.co) and create a deployment.

#### 2. Get Credentials

After deployment, note:
- Cloud ID
- Username (usually `elastic`)
- Password

#### 3. Configure Environment Variables

```bash
# Elasticsearch - Elastic Cloud
ELASTICSEARCH_CLOUD_ID="your-cloud-id:base64-encoded-info"
ELASTICSEARCH_USERNAME="elastic"
ELASTICSEARCH_PASSWORD="your-password"
ELASTICSEARCH_INDEX_PREFIX="poster-tracker"
ELASTICSEARCH_LOG_LEVEL="info"
```

### Option 2: Azure Elasticsearch Service

Azure doesn't have a native Elasticsearch service, but you can use:
- **Elastic Cloud on Azure Marketplace**
- **Self-hosted Elasticsearch on Azure VMs**
- **Azure Container Instances with Elasticsearch**

#### Using Elastic Cloud on Azure

1. Go to Azure Marketplace
2. Search for "Elasticsearch Service by Elastic"
3. Create deployment
4. Get endpoint URL and credentials

```bash
ELASTICSEARCH_NODE="https://your-deployment.eastus2.azure.elastic-cloud.com:9243"
ELASTICSEARCH_USERNAME="elastic"
ELASTICSEARCH_PASSWORD="your-password"
ELASTICSEARCH_INDEX_PREFIX="poster-tracker"
```

### Option 3: Self-Hosted Elasticsearch

For development or on-premises deployment.

#### Using Docker Compose

Add to `docker-compose.yml`:

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  container_name: elasticsearch
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
  ports:
    - "9200:9200"
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data

kibana:
  image: docker.elastic.co/kibana/kibana:8.11.0
  container_name: kibana
  ports:
    - "5601:5601"
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
  depends_on:
    - elasticsearch

volumes:
  elasticsearch_data:
```

Start services:

```bash
docker-compose up -d elasticsearch kibana
```

Configure environment:

```bash
ELASTICSEARCH_NODE="http://localhost:9200"
ELASTICSEARCH_INDEX_PREFIX="poster-tracker"
ELASTICSEARCH_LOG_LEVEL="info"
# No authentication needed for local development
```

### Option 4: API Key Authentication

For enhanced security, use API keys instead of username/password.

#### 1. Create API Key in Kibana

Navigate to: **Stack Management** > **API Keys** > **Create API Key**

Or use REST API:

```bash
curl -X POST "https://your-elasticsearch:9200/_security/api_key" \
  -u elastic:your-password \
  -H "Content-Type: application/json" \
  -d '{
    "name": "poster-tracker-api",
    "role_descriptors": {
      "poster-tracker-writer": {
        "cluster": ["monitor"],
        "index": [
          {
            "names": ["poster-tracker-*"],
            "privileges": ["create_index", "write", "create"]
          }
        ]
      }
    }
  }'
```

#### 2. Configure Environment

```bash
ELASTICSEARCH_NODE="https://your-elasticsearch:9200"
ELASTICSEARCH_API_KEY="your-base64-encoded-api-key"
ELASTICSEARCH_INDEX_PREFIX="poster-tracker"
```

## Configuration Reference

### Required Settings (if using Elasticsearch)

```bash
# Elasticsearch endpoint
ELASTICSEARCH_NODE="https://your-host:9200"

# Index configuration
ELASTICSEARCH_INDEX_PREFIX="poster-tracker"
```

### Optional Settings

```bash
# Specific index name (overrides prefix + date pattern)
ELASTICSEARCH_INDEX="poster-tracker-logs"

# Log level for Elasticsearch (debug, info, warn, error)
ELASTICSEARCH_LOG_LEVEL="info"

# Application log level (affects console and Elasticsearch)
LOG_LEVEL="info"

# Application version (added to all log entries)
APP_VERSION="1.0.0"
```

### Authentication Methods

**Method 1: Username/Password**
```bash
ELASTICSEARCH_USERNAME="elastic"
ELASTICSEARCH_PASSWORD="your-password"
```

**Method 2: API Key**
```bash
ELASTICSEARCH_API_KEY="your-api-key"
```

**Method 3: Cloud ID (Elastic Cloud)**
```bash
ELASTICSEARCH_CLOUD_ID="deployment-name:base64-string"
ELASTICSEARCH_USERNAME="elastic"
ELASTICSEARCH_PASSWORD="your-password"
```

## Index Management

### Index Naming

By default, logs are stored in daily indices:
- Pattern: `{ELASTICSEARCH_INDEX_PREFIX}-YYYY.MM.DD`
- Example: `poster-tracker-2024.01.20`

This allows for:
- Easy data retention policies
- Better query performance
- Simplified backup strategies

### Index Lifecycle Management (ILM)

Create an ILM policy to automatically manage old logs:

```json
PUT _ilm/policy/poster-tracker-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

Apply to index template:

```json
PUT _index_template/poster-tracker-template
{
  "index_patterns": ["poster-tracker-*"],
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.lifecycle.name": "poster-tracker-policy"
    }
  }
}
```

## Querying Logs

### Using Kibana

1. Open Kibana (usually at port 5601)
2. Go to **Analytics** > **Discover**
3. Create index pattern: `poster-tracker-*`
4. Start exploring logs

### Useful Queries

**View all errors:**
```
severity: "error"
```

**View specific user activity:**
```
fields.userId: "user-id-here"
```

**View slow requests:**
```
message: "Slow request detected"
```

**View requests to specific endpoint:**
```
fields.url: "/api/posters"
```

**View requests by status code:**
```
fields.statusCode: 500
```

### Using REST API

**Search last 100 error logs:**

```bash
curl -X GET "https://your-elasticsearch:9200/poster-tracker-*/_search" \
  -u elastic:your-password \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "severity": "error"
      }
    },
    "size": 100,
    "sort": [
      {
        "@timestamp": {
          "order": "desc"
        }
      }
    ]
  }'
```

## Monitoring and Alerts

### Create Alerts in Kibana

1. Go to **Stack Management** > **Rules and Connectors**
2. Create rule for error threshold
3. Configure notification (email, Slack, etc.)

Example alert: Notify if more than 10 errors in 5 minutes.

### Health Checks

Check Elasticsearch cluster health:

```bash
curl -X GET "https://your-elasticsearch:9200/_cluster/health"
```

Check API logging status:

```bash
curl http://your-api-host:3000/health
```

## Troubleshooting

### Logs Not Appearing in Elasticsearch

1. **Check Elasticsearch connection:**
   ```bash
   curl -u elastic:password https://your-elasticsearch:9200
   ```

2. **Verify environment variables are set**

3. **Check application logs for Elasticsearch errors:**
   ```bash
   # Should see: "✓ Elasticsearch logging enabled"
   # Or: "ℹ Elasticsearch logging not configured"
   ```

4. **Check index exists:**
   ```bash
   curl -u elastic:password https://your-elasticsearch:9200/_cat/indices/poster-tracker-*
   ```

### Authentication Errors

**Error: "Unauthorized"**
- Verify username/password or API key
- Check user has write permissions to indices

**Error: "Unable to connect"**
- Verify ELASTICSEARCH_NODE URL is correct
- Check firewall rules allow connection
- Verify SSL/TLS settings

### Performance Issues

**High memory usage:**
- Reduce LOG_LEVEL (use "warn" or "error" only)
- Implement log sampling for high-traffic endpoints

**Slow indexing:**
- Increase Elasticsearch cluster resources
- Adjust bulk indexing settings
- Enable index lifecycle management

## Best Practices

### Log Levels

Use appropriate log levels:
- **debug**: Detailed debugging information
- **info**: General informational messages (default)
- **warn**: Warning messages, something unexpected
- **error**: Error messages, application errors

### Structured Logging

Always include context:

```typescript
import { logger } from '../config/logger';

logger.info('User action', {
  action: 'create_poster',
  userId: user.id,
  posterId: poster.id,
  duration: 123
});
```

### Sensitive Data

Never log:
- Passwords
- API keys
- Credit card numbers
- Personal identifiable information (unless required and encrypted)

### Cost Optimization

1. **Use appropriate log levels in production**
   ```bash
   LOG_LEVEL="warn"  # Only warnings and errors
   ```

2. **Implement log sampling for high-traffic endpoints**

3. **Set up ILM to delete old logs**

4. **Use Elasticsearch ingest pipelines to filter unnecessary fields**

## Example Kibana Dashboards

### Request Overview Dashboard

Create visualizations for:
- Request rate over time (line chart)
- Status code distribution (pie chart)
- Average response time (metric)
- Top endpoints (table)
- Error rate (line chart)

### Error Tracking Dashboard

- Error count over time
- Error messages (table)
- Affected users (table)
- Stack traces (saved searches)

### User Activity Dashboard

- Active users (unique count)
- User actions (table)
- Most active users (bar chart)

## Integration with Azure Monitor

For Azure deployments, you can also send logs to Azure Monitor:

1. Use Azure Application Insights (add to logger configuration)
2. Stream Elasticsearch to Azure Log Analytics
3. Create unified dashboards in Azure Portal

## Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Elastic Cloud](https://cloud.elastic.co)
- [Azure Elasticsearch Service](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/elastic.elasticsearch)

## Support

For issues with:
- **Logging implementation**: Check application logs and configuration
- **Elasticsearch setup**: Refer to Elastic documentation
- **Azure integration**: Check Azure Monitor documentation
