import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../types';

// Generate unique request ID
const generateRequestId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Request logging middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate request ID
  const requestId = generateRequestId();
  (req as any).requestId = requestId;

  // Start time for duration calculation
  const startTime = Date.now();

  // Get request details
  const requestDetails = {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
  };

  // Log incoming request
  logger.info('Incoming request', requestDetails);

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;

    // Get user info if authenticated
    const user = (req as AuthenticatedRequest).user;

    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      userId: user?.id,
      userEmail: user?.email,
    });

    // Log slow requests (> 3 seconds)
    if (duration > 3000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        userId: user?.id,
      });
    }

    return originalSend.call(this, data);
  };

  // Capture errors
  res.on('finish', () => {
    // Log 4xx and 5xx responses
    if (res.statusCode >= 400) {
      const level = res.statusCode >= 500 ? 'error' : 'warn';
      logger.log(level, `HTTP ${res.statusCode}`, {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        userId: (req as AuthenticatedRequest).user?.id,
      });
    }
  });

  next();
};

// Error logging middleware (should be used after routes)
export const errorLogger = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId;
  const user = (req as AuthenticatedRequest).user;

  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    userId: user?.id,
    userEmail: user?.email,
  });

  next(err);
};
