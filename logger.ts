import pino from 'pino';

/**
 * ToonJS Logger - Optimized logging with Pino.js
 * 
 * Usage:
 *   Production: Set NODE_ENV=production for JSON output
 *   Development: Clean console format (better Windows compatibility than console.log)
 * 
 * Performance: ~5x faster than console.log in production
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In production, use fast binary serialization
  // In development, use simple formatting
  ...(process.env.NODE_ENV === 'production' 
    ? {
        // Fast structured logging for production
        formatters: {
          level: (label) => ({ level: label }),
        },
      }
    : {
        // Development: simple timestamp + message
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: false,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
      }),
});

export default logger;
