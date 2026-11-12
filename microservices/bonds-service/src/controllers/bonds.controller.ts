import { Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../index';
import { purchaseBondSchema } from '../utils/validations';
import { generateBondCode } from '../utils/codes';
import { AuthRequest } from '../middleware/auth.middleware';

const BOND_CATALOG = [
  {
    type: 'OXYGEN',
    name: 'Oxígeno',
    description: 'Bonos de oxígeno para compensar emisiones de carbono y apoyar proyectos de reforestación.',
    price: 100,
    icon: '🌿',
    color: '#22C55E',
  },
  {
    type: 'FAUNA',
    name: 'Fauna',
    description: 'Bonos de fauna para financiar la protección y conservación de especies en peligro.',
    price: 100,
    icon: '🦁',
    color: '#F59E0B',
  },
  {
    type: 'CARBON24',
    name: 'Carbono24',
    description: 'Bonos de carbono certificados para la reducción de emisiones GEI.',
    price: 100,
    icon: '🌍',
    color: '#3B82F6',
  },
  {
    type: 'HYDROGEN',
    name: 'Hidrógeno Verde',
    description: 'Bonos de hidrógeno verde para proyectos de energía limpia y sostenible.',
    price: 100,
    icon: '⚡',
    color: '#10B981',
  },
];

export class BondsController {
  async getCatalog(req: any, res: Response) {
    try {
      const search =
        typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

      const catalog = search
        ? BOND_CATALOG.filter(
            (bond) =>
              bond.type.toLowerCase().includes(search) ||
              bond.name.toLowerCase().includes(search) ||
              bond.description.toLowerCase().includes(search)
          )
        : BOND_CATALOG;

      return res.json({ data: catalog });
    } catch (error) {
      console.error('Get catalog error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async purchaseBond(req: AuthRequest, res: Response) {
    try {
      const data = purchaseBondSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const bondCode = generateBondCode(data.bondType);
      const qrData = JSON.stringify({
        code: bondCode,
        type: data.bondType,
        userId: user.id,
        timestamp: Date.now(),
      });

      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#1A1A2E', light: '#FFFFFF' },
      });

      const bond = await prisma.bond.create({
        data: {
          user_id: user.id,
          type: data.bondType as any,
          amount: 100.00,
          code: bondCode,
          qr_data: qrDataUrl,
          status: 'ACTIVE',
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          user_id: user.id,
          bond_id: bond.id,
          payment_method: data.paymentMethod as any,
          amount: 100.00,
          currency: 'USD',
          status: 'COMPLETED',
        },
      });

      const newTotalSpent = Number(user.total_spent) + 100;
      const newRole = newTotalSpent >= 1000 ? 'PREMIUM' : user.role;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          total_spent: newTotalSpent,
          role: newRole as any,
        },
      });

      if (data.paymentMethod === 'SIMULATED') {
        const referrer = await prisma.referral.findFirst({
          where: { referred_id: user.id },
          include: { referrer: true },
        });

        if (referrer) {
          const referrerRole = referrer.referrer.role;
          const effectiveRate = referrerRole === 'PREMIUM' || referrerRole === 'ADMIN' ? 10.00 : Number(referrer.commission_rate);
          const bondAmount = Number(bond.amount);
          const commission = bondAmount * (effectiveRate / 100);
          await prisma.referral.update({
            where: { id: referrer.id },
            data: {
              commission_rate: effectiveRate,
              total_earned: Number(referrer.total_earned) + commission,
            },
          });
        }
      }

      return res.status(201).json({
        data: {
          bond: {
            id: bond.id,
            type: bond.type,
            amount: Number(bond.amount),
            code: bond.code,
            qrData: bond.qr_data,
            status: bond.status,
            purchaseDate: bond.purchase_date.toISOString(),
          },
          transaction: {
            id: transaction.id,
            amount: Number(transaction.amount),
            status: transaction.status,
            paymentMethod: transaction.payment_method,
          },
          userRole: newRole,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Purchase bond error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getMyBonds(req: AuthRequest, res: Response) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const where: { user_id?: number; status?: any } = { user_id: req.userId };

      if (['ACTIVE', 'REDEEMED', 'EXPIRED'].includes(status)) {
        where.status = status;
      }

      const bonds = await prisma.bond.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      return res.json({
        data: bonds.map((bond) => ({
          id: bond.id,
          type: bond.type,
          amount: Number(bond.amount),
          code: bond.code,
          qrData: bond.qr_data,
          certificateUrl: bond.certificate_url,
          status: bond.status,
          purchaseDate: bond.purchase_date.toISOString(),
          redeemDate: bond.redeem_date?.toISOString() || null,
        })),
      });
    } catch (error) {
      console.error('Get my bonds error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getBondById(req: AuthRequest, res: Response) {
    try {
      const bondId = parseInt(String(req.params.id), 10);

      const bond = await prisma.bond.findFirst({
        where: { id: bondId, user_id: req.userId },
      });

      if (!bond) {
        return res.status(404).json({ error: 'Bono no encontrado' });
      }

      return res.json({
        data: {
          id: bond.id,
          type: bond.type,
          amount: Number(bond.amount),
          code: bond.code,
          qrData: bond.qr_data,
          certificateUrl: bond.certificate_url,
          status: bond.status,
          purchaseDate: bond.purchase_date.toISOString(),
          redeemDate: bond.redeem_date?.toISOString() || null,
        },
      });
    } catch (error) {
      console.error('Get bond by id error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getBondQR(req: AuthRequest, res: Response) {
    try {
      const bondId = parseInt(String(req.params.id), 10);

      const bond = await prisma.bond.findFirst({
        where: { id: bondId, user_id: req.userId },
      });

      if (!bond) {
        return res.status(404).json({ error: 'Bono no encontrado' });
      }

      return res.json({
        data: {
          qrData: bond.qr_data,
          code: bond.code,
        },
      });
    } catch (error) {
      console.error('Get bond QR error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async redeemBond(req: AuthRequest, res: Response) {
    try {
      const bondId = parseInt(String(req.params.id), 10);

      const bond = await prisma.bond.findFirst({
        where: { id: bondId, user_id: req.userId },
      });

      if (!bond) {
        return res.status(404).json({ error: 'Bono no encontrado' });
      }

      if (bond.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Este bono ya no está activo' });
      }

      const updatedBond = await prisma.bond.update({
        where: { id: bondId },
        data: {
          status: 'REDEEMED',
          redeem_date: new Date(),
        },
      });

      return res.json({
        data: {
          id: updatedBond.id,
          code: updatedBond.code,
          status: updatedBond.status,
          redeemDate: updatedBond.redeem_date?.toISOString(),
        },
      });
    } catch (error) {
      console.error('Redeem bond error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
