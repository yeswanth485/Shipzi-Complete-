// Start the HTTP server.

import app from './app';
import { CONFIG } from './config/env';
import { logger } from './config/logger';

const server = app.listen(CONFIG.PORT, () => {
  logger.info(`Shipzi Payment API listening on port ${CONFIG.PORT}`);
  logger.info(`Health: http://localhost:${CONFIG.PORT}/health`);
  logger.info(`Environment: ${CONFIG.NODE_ENV}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  process.exit(1);
});
