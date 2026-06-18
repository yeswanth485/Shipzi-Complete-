// Mount all routers under /api prefix.

import { Router } from 'express';
import paymentRoutes from './payment.routes';
import optimizationRoutes from './optimization.routes';
import subscriptionRoutes from './subscription.routes';

const router = Router();

router.use('/payment', paymentRoutes);
router.use('/optimize', optimizationRoutes);
router.use('/subscription', subscriptionRoutes);

export default router;
