import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const paymentsController = new PaymentsController();

router.post('/simulate', authMiddleware, paymentsController.simulatePayment);
router.get('/:id/status', authMiddleware, paymentsController.getPaymentStatus);

export default router;
