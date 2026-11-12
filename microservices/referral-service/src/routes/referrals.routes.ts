import { Router } from 'express';
import { ReferralsController } from '../controllers/referrals.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const referralsController = new ReferralsController();

router.get('/my-code', authMiddleware, referralsController.getMyCode);
router.get('/stats', authMiddleware, referralsController.getStats);
router.post('/apply', authMiddleware, referralsController.applyCode);
router.get('/commissions', authMiddleware, referralsController.getCommissions);

export default router;
