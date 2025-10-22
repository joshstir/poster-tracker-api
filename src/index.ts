import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import posterRoutes from './routes/poster.routes';
import playlistRoutes from './routes/playlist.routes';
import tagRoutes from './routes/tag.routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger, errorLogger } from './middleware/requestLogger';
import { logger } from './config/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(requestLogger); // Custom request logger with Elasticsearch support
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'poster-tracker-api',
  });
});

// API Routes
app.use('/api/posters', posterRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/tags', tagRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error logging middleware (log errors before handling)
app.use(errorLogger);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
