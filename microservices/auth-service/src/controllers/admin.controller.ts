import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { deleteKeycloakUser, updateKeycloakUserRole } from '../utils/keycloak';

function getQueryString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export class AdminController {
  async getStats(req: AuthRequest, res: Response) {
    try {
      const totalUsers = await prisma.user.count();
      const totalBonds = await prisma.bond.count();
      const activeBonds = await prisma.bond.count({ where: { status: 'ACTIVE' } });
      const totalTransactions = await prisma.transaction.count();
      const completedTransactions = await prisma.transaction.count({ where: { status: 'COMPLETED' } });

      const totalRevenue = await prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      });

      const totalCommissions = await prisma.referral.aggregate({
        _sum: { total_earned: true },
      });

      const premiumUsers = await prisma.user.count({ where: { role: 'PREMIUM' } });
      const investors = await prisma.user.count({ where: { role: 'INVESTOR' } });

      const bondsByType = await prisma.bond.groupBy({
        by: ['type'],
        _count: { id: true },
        _sum: { amount: true },
      });

      const recentTransactions = await prisma.transaction.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      });

      return res.json({
        data: {
          overview: {
            totalUsers,
            totalBonds,
            activeBonds,
            totalTransactions,
            completedTransactions,
            totalRevenue: Number(totalRevenue._sum.amount || 0),
            totalCommissions: Number(totalCommissions._sum.total_earned || 0),
            premiumUsers,
            investors,
          },
          bondsByType: bondsByType.map((b) => ({
            type: b.type,
            count: b._count.id,
            totalAmount: Number(b._sum.amount || 0),
          })),
          recentTransactions: recentTransactions.map((t) => ({
            id: t.id,
            userName: t.user.name,
            userEmail: t.user.email,
            amount: Number(t.amount),
            status: t.status,
            paymentMethod: t.payment_method,
            createdAt: t.created_at.toISOString(),
          })),
        },
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getUsers(req: AuthRequest, res: Response) {
    try {
      const search = getQueryString(req.query.search);
      const role = getQueryString(req.query.role);
      const where: Prisma.userWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { curv_code: { contains: search } },
        ];
      }

      if (['INVESTOR', 'PREMIUM', 'ADMIN'].includes(role)) {
        where.role = role as any;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          curv_code: true,
          total_spent: true,
          two_factor_enabled: true,
          created_at: true,
          _count: { select: { bonds: true, referrals_referrer: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      return res.json({
        data: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          curvCode: u.curv_code,
          totalSpent: Number(u.total_spent),
          twoFactorEnabled: u.two_factor_enabled,
          bondsCount: u._count.bonds,
          referralsCount: u._count.referrals_referrer,
          createdAt: u.created_at.toISOString(),
        })),
      });
    } catch (error) {
      console.error('Admin get users error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async updateUserRole(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(String(req.params.id), 10);
      const { role } = req.body;

      if (!['INVESTOR', 'PREMIUM', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Rol no válido' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (user.id === req.userId) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
      }

      await updateKeycloakUserRole(user.email, role);

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, email: true, name: true, role: true },
      });

      return res.json({ data: updated });
    } catch (error) {
      console.error('Admin update role error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(String(req.params.id), 10);

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'ID de usuario no válido' });
      }

      if (userId === req.userId) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (user.role === 'ADMIN') {
        return res.status(400).json({ error: 'No se puede eliminar un administrador' });
      }

      await deleteKeycloakUser(user.email);

      await prisma.user.delete({ where: { id: userId } });

      return res.json({
        message: 'Usuario eliminado correctamente',
        data: { id: userId },
      });
    } catch (error) {
      console.error('Admin delete user error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getBonds(req: AuthRequest, res: Response) {
    try {
      const search = getQueryString(req.query.search);
      const status = getQueryString(req.query.status);
      const where: Prisma.bondWhereInput = {};

      if (search) {
        where.OR = [
          { code: { contains: search } },
          { user: { name: { contains: search } } },
          { user: { email: { contains: search } } },
        ];
      }

      if (['ACTIVE', 'REDEEMED', 'EXPIRED'].includes(status)) {
        where.status = status as any;
      }

      const bonds = await prisma.bond.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { transactions: true } },
        },
      });

      return res.json({
        data: bonds.map((b) => ({
          id: b.id,
          type: b.type,
          amount: Number(b.amount),
          code: b.code,
          status: b.status,
          userName: b.user.name,
          userEmail: b.user.email,
          purchaseDate: b.purchase_date.toISOString(),
          redeemDate: b.redeem_date?.toISOString() || null,
          transactionsCount: b._count.transactions,
        })),
      });
    } catch (error) {
      console.error('Admin get bonds error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getTransactions(req: AuthRequest, res: Response) {
    try {
      const search = getQueryString(req.query.search);
      const status = getQueryString(req.query.status);
      const where: Prisma.transactionWhereInput = {};

      if (search) {
        where.OR = [
          { payment_id: { contains: search } },
          { user: { name: { contains: search } } },
          { user: { email: { contains: search } } },
        ];
      }

      if (['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'].includes(status)) {
        where.status = status as any;
      }

      const transactions = await prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          bond: { select: { code: true, type: true } },
        },
      });

      return res.json({
        data: transactions.map((t) => ({
          id: t.id,
          userName: t.user.name,
          userEmail: t.user.email,
          bondCode: t.bond?.code || null,
          bondType: t.bond?.type || null,
          amount: Number(t.amount),
          currency: t.currency,
          paymentMethod: t.payment_method,
          status: t.status,
          paymentId: t.payment_id,
          createdAt: t.created_at.toISOString(),
        })),
      });
    } catch (error) {
      console.error('Admin get transactions error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getReferrals(req: AuthRequest, res: Response) {
    try {
      const search = getQueryString(req.query.search);
      const where: Prisma.referralWhereInput = {};

      if (search) {
        where.OR = [
          { referrer: { name: { contains: search } } },
          { referrer: { email: { contains: search } } },
          { referred: { name: { contains: search } } },
          { referred: { email: { contains: search } } },
        ];
      }

      const referrals = await prisma.referral.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          referrer: { select: { name: true, email: true } },
          referred: { select: { name: true, email: true } },
        },
      });

      return res.json({
        data: referrals.map((r) => ({
          id: r.id,
          referrerName: r.referrer.name,
          referrerEmail: r.referrer.email,
          referredName: r.referred.name,
          referredEmail: r.referred.email,
          commissionRate: Number(r.commission_rate),
          totalEarned: Number(r.total_earned),
          createdAt: r.created_at.toISOString(),
        })),
      });
    } catch (error) {
      console.error('Admin get referrals error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
