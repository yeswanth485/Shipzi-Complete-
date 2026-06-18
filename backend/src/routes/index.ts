// Mount all routers under /api prefix.

import { Router } from 'express';
import paymentRoutes from './payment.routes';
import optimizationRoutes from './optimization.routes';

const router = Router();

router.use('/payment', paymentRoutes);
router.use('/optimize', optimizationRoutes);

export default router;
