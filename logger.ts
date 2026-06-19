import pino from 'pino';

/**
 * ToonJS Logger - Ultra-optimized logging with Pino.js
 * 
 * Usage:
 *   Production: Set NODE_ENV=production for raw JSON (fastest)
 *   Development: Fast custom formatter (faster than pino-pretty)
 * 
 * Performance: Optimized to beat console.log in all scenarios
 */

// Configure Windows console for UTF-8 if on Windows
if (process.platform === 'win32' && process.stdout.isTTY) {
  try {
    // Set UTF-8 encoding for proper emoji/unicode display
    process.stdout.setEncoding('utf8');
  } catch (e) {
    // Silently fail if encoding cannot be set
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  
  // Optimizations for maximum performance
  timestamp: false, // Disable timestamps for speed (enable in production if needed)
  
  ...(process.env.NODE_ENV === 'production' 
    ? {
        // Production: Raw JSON (fastest possible)
        formatters: {
          level: (label) => ({ level: label }),
        },
      }
    : {
        // Development: Direct to stdout without pretty printing
        // Much faster than pino-pretty
        base: null, // Remove pid/hostname for speed
        formatters: {
          level: (label) => ({ level: label }),
          log: (obj) => {
            // Fast custom formatting - just extract the message
            const msg = obj.msg || '';
            return { msg };
          }
        }
      }),
});

export default logger;
