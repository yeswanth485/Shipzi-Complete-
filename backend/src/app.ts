// Express app setup.

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { CONFIG } from './config/env';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { globalRateLimit } from './middlewares/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import routes from './routes';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // Exact match from allowed list
      if (CONFIG.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost for development only
      if (CONFIG.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }

      console.error(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Request ID tracing
app.use(requestIdMiddleware);

// Global rate limiting
app.use(globalRateLimit);

// Body parsing (except for webhook which uses rawBody)
app.use((req, res, next) => {
  if (req.path === '/api/payment/webhook') {
    next();
  } else {
    express.json({ limit: '1mb' })(req, res, next);
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'shipzi-payments',
    version: '1.0.0',
  });
});

// Root
app.get('/', (_req, res) => {
  res.json({
    service: 'Shipzi Payment API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      createOrder: 'POST /api/payment/create-order',
      verifyPayment: 'POST /api/payment/verify',
      refund: 'POST /api/payment/refund',
      webhook: 'POST /api/payment/webhook',
      paymentHistory: 'GET /api/payment/history',
    },
  });
});

// Mount routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
