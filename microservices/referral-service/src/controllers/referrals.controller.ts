import { Response } from 'express';
import { prisma } from '../index';
import { applyReferralSchema } from '../utils/validations';
import { AuthRequest } from '../middleware/auth.middleware';

export class ReferralsController {
  async getMyCode(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.json({
        data: {
          curvCode: user.curv_code,
        },
      });
    } catch (error) {
      console.error('Get my code error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getStats(req: AuthRequest, res: Response) {
    try {
      const referrals = await prisma.referral.findMany({
        where: { referrer_id: req.userId },
        include: { referred: { select: { name: true, email: true } } },
      });

      const totalReferrals = referrals.length;
      const totalEarned = referrals.reduce((sum, r) => sum + Number(r.total_earned), 0);

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      return res.json({
        data: {
          totalReferrals,
          totalEarned,
          pendingCommission: totalEarned,
          curvCode: user?.curv_code || '',
          referrals: referrals.map((r) => ({
            id: r.id,
            referredName: r.referred.name,
            referredEmail: r.referred.email,
            commissionRate: Number(r.commission_rate),
            totalEarned: Number(r.total_earned),
            createdAt: r.created_at.toISOString(),
          })),
        },
      });
    } catch (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async applyCode(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const data = applyReferralSchema.parse(req.body);

      const referrer = await prisma.user.findUnique({
        where: { curv_code: data.code },
      });

      if (!referrer) {
        return res.status(404).json({ error: 'Código de referido no válido' });
      }

      if (referrer.id === req.userId) {
        return res.status(400).json({ error: 'No puedes usar tu propio código de referido' });
      }

      const existingReferral = await prisma.referral.findFirst({
        where: { referrer_id: referrer.id, referred_id: req.userId },
      });

      if (existingReferral) {
        return res.status(400).json({ error: 'Ya existe un registro con este código' });
      }

      const commissionRate = referrer.role === 'PREMIUM' || referrer.role === 'ADMIN' ? 10.00 : 8.00;
      const referral = await prisma.referral.create({
        data: {
          referrer_id: referrer.id,
          referred_id: req.userId,
          commission_rate: commissionRate,
        },
      });

      return res.json({
        data: {
          message: 'Código de referido aplicado correctamente',
          referralId: referral.id,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Apply code error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getCommissions(req: AuthRequest, res: Response) {
    try {
      const referrals = await prisma.referral.findMany({
        where: { referrer_id: req.userId },
        include: { referred: { select: { name: true, email: true } } },
      });

      const totalEarned = referrals.reduce((sum, r) => sum + Number(r.total_earned), 0);

      return res.json({
        data: {
          totalEarned,
          commissions: referrals.map((r) => ({
            id: r.id,
            referredName: r.referred.name,
            commissionRate: Number(r.commission_rate),
            totalEarned: Number(r.total_earned),
            createdAt: r.created_at.toISOString(),
          })),
        },
      });
    } catch (error) {
      console.error('Get commissions error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
