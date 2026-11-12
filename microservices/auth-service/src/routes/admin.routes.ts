import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.get('/bonds', adminController.getBonds);
router.get('/transactions', adminController.getTransactions);
router.get('/referrals', adminController.getReferrals);

export default router;
