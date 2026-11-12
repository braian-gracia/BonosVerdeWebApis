import { Router } from 'express';
import { BondsController } from '../controllers/bonds.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const bondsController = new BondsController();

router.get('/catalog', bondsController.getCatalog);
router.post('/purchase', authMiddleware, bondsController.purchaseBond);
router.get('/my-bonds', authMiddleware, bondsController.getMyBonds);
router.get('/:id', authMiddleware, bondsController.getBondById);
router.get('/:id/qr', authMiddleware, bondsController.getBondQR);
router.post('/:id/redeem', authMiddleware, bondsController.redeemBond);

export default router;
