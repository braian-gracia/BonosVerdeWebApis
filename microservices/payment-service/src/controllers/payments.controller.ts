import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../index';
import { simulatePaymentSchema } from '../utils/validations';
import { AuthRequest } from '../middleware/auth.middleware';

export class PaymentsController {
  async simulatePayment(req: AuthRequest, res: Response) {
    try {
      const data = simulatePaymentSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const paymentId = `SIM-${uuidv4().slice(0, 8).toUpperCase()}`;

      const transaction = await prisma.transaction.create({
        data: {
          user_id: user.id,
          payment_method: 'SIMULATED',
          payment_id: paymentId,
          amount: 100.00,
          currency: 'USD',
          status: 'COMPLETED',
        },
      });

      return res.json({
        data: {
          transactionId: transaction.id,
          paymentId,
          status: 'COMPLETED',
          amount: Number(transaction.amount),
          currency: transaction.currency,
          paymentMethod: transaction.payment_method,
          createdAt: transaction.created_at.toISOString(),
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Simulate payment error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getPaymentStatus(req: AuthRequest, res: Response) {
    try {
      const transactionId = parseInt(String(req.params.id), 10);

      const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId, user_id: req.userId },
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transacción no encontrada' });
      }

      return res.json({
        data: {
          id: transaction.id,
          status: transaction.status,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          paymentMethod: transaction.payment_method,
          paymentId: transaction.payment_id,
          createdAt: transaction.created_at.toISOString(),
        },
      });
    } catch (error) {
      console.error('Get payment status error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
