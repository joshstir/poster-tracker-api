import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console output (development)
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Determine if Elasticsearch is configured
const isElasticsearchConfigured = () => {
  return !!(
    process.env.ELASTICSEARCH_NODE &&
    process.env.ELASTICSEARCH_INDEX
  );
};

// Create Elasticsearch client if configured
const createElasticsearchClient = () => {
  if (!isElasticsearchConfigured()) {
    return null;
  }

  const clientOptions: any = {
    node: process.env.ELASTICSEARCH_NODE,
  };

  // Add authentication if provided
  if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
    clientOptions.auth = {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    };
  }

  // Add API key if provided (alternative to username/password)
  if (process.env.ELASTICSEARCH_API_KEY) {
    clientOptions.auth = {
      apiKey: process.env.ELASTICSEARCH_API_KEY,
    };
  }

  // Add cloud ID if using Elastic Cloud
  if (process.env.ELASTICSEARCH_CLOUD_ID) {
    clientOptions.cloud = {
      id: process.env.ELASTICSEARCH_CLOUD_ID,
    };
    delete clientOptions.node; // cloud ID overrides node
  }

  return new Client(clientOptions);
};

// Create Winston logger
const createLogger = () => {
  const transports: winston.transport[] = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    })
  );

  // Elasticsearch transport (if configured)
  if (isElasticsearchConfigured()) {
    const esClient = createElasticsearchClient();

    if (esClient) {
      const esTransport = new ElasticsearchTransport({
        level: process.env.ELASTICSEARCH_LOG_LEVEL || 'info',
        client: esClient,
        index: process.env.ELASTICSEARCH_INDEX || 'poster-tracker-logs',
        // Optional: customize index pattern with date
        indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'poster-tracker',
        indexSuffixPattern: 'YYYY.MM.DD', // Creates daily indices
        // Additional metadata to include in all logs
        transformer: (logData: any) => {
          return {
            '@timestamp': new Date().toISOString(),
            severity: logData.level,
            message: logData.message,
            fields: {
              environment: process.env.NODE_ENV || 'development',
              service: 'poster-tracker-api',
              version: process.env.APP_VERSION || '1.0.0',
              ...logData.meta,
            },
          };
        },
      });

      transports.push(esTransport);

      console.log('✓ Elasticsearch logging enabled:', {
        node: process.env.ELASTICSEARCH_NODE,
        index: process.env.ELASTICSEARCH_INDEX || 'poster-tracker-logs',
      });
    }
  } else {
    console.log('ℹ Elasticsearch logging not configured - using console only');
  }

  // Create logger instance
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }),
      timestamp(),
      json()
    ),
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
  });

  // Handle uncaught exceptions and unhandled rejections
  if (process.env.NODE_ENV === 'production') {
    logger.exceptions.handle(
      new winston.transports.File({ filename: 'exceptions.log' })
    );
    logger.rejections.handle(
      new winston.transports.File({ filename: 'rejections.log' })
    );
  }

  return logger;
};

// Export logger instance
export const logger = createLogger();

// Utility function to create child logger with context
export const createContextLogger = (context: string) => {
  return logger.child({ context });
};

// Helper to log with request context
export const logWithContext = (
  level: string,
  message: string,
  metadata: any = {}
) => {
  logger.log(level, message, metadata);
};

// Export logger as default
export default logger;
