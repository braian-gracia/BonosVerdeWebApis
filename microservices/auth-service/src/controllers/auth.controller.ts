import { Request, Response } from 'express';
import { prisma } from '../index';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../utils/validations';
import { generateCURVCode } from '../utils/curv';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createKeycloakUser,
  decodeAccessToken,
  deleteKeycloakUser,
  loginWithPassword,
  refreshKeycloakToken,
  setKeycloakPassword,
} from '../utils/keycloak';

type ManagedRole = 'INVESTOR' | 'PREMIUM' | 'ADMIN';

function toUserResponse(user: {
  id: number;
  email: string;
  name: string;
  role: string;
  curv_code: string;
  total_spent: unknown;
  two_factor_enabled: boolean;
  created_at: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    curvCode: user.curv_code,
    totalSpent: Number(user.total_spent),
    twoFactorEnabled: user.two_factor_enabled,
    createdAt: user.created_at.toISOString(),
  };
}

function resolveRole(roles?: string[]): ManagedRole {
  if (roles?.includes('ADMIN')) return 'ADMIN';
  if (roles?.includes('PREMIUM')) return 'PREMIUM';
  return 'INVESTOR';
}

async function generateUniqueCURVCode() {
  let curvCode = generateCURVCode();
  while (await prisma.user.findUnique({ where: { curv_code: curvCode } })) {
    curvCode = generateCURVCode();
  }
  return curvCode;
}

async function ensureLocalUser(email: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      password_hash: 'KEYCLOAK_MANAGED',
      curv_code: await generateUniqueCURVCode(),
    },
  });
}

async function syncRole(user: { id: number; role: string }, roles?: string[]) {
  const role = resolveRole(roles);
  if (user.role === role) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });
}

function handleAuthError(error: any, res: Response) {
  if (error?.name === 'TypeError') {
    console.error('Keycloak connection error:', error);
    return res.status(502).json({ error: 'No se pudo conectar con el proveedor de identidad' });
  }

  console.error('Keycloak authentication error:', error);
  return res.status(401).json({ error: 'Email o contraseña incorrectos' });
}

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      await createKeycloakUser({
        email: data.email,
        name: data.name,
        password: data.password,
        role: 'INVESTOR',
      });

      let user;
      try {
        user = await prisma.user.create({
          data: {
            email: data.email,
            name: data.name,
            password_hash: 'KEYCLOAK_MANAGED',
            curv_code: await generateUniqueCURVCode(),
          },
        });
      } catch (error) {
        await deleteKeycloakUser(data.email).catch(() => undefined);
        throw error;
      }

      if (data.referralCode) {
        const referrer = await prisma.user.findUnique({
          where: { curv_code: data.referralCode },
        });
        if (referrer && referrer.id !== user.id) {
          const commissionRate =
            referrer.role === 'PREMIUM' || referrer.role === 'ADMIN' ? 10.0 : 8.0;
          await prisma.referral.create({
            data: {
              referrer_id: referrer.id,
              referred_id: user.id,
              commission_rate: commissionRate,
            },
          });
        }
      }

      return res.status(201).json({
        data: {
          user: toUserResponse(user),
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Register error:', error);
      return res.status(502).json({ error: error.message || 'No se pudo crear el usuario' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const tokens = await loginWithPassword(data.email, data.password);
      const claims = decodeAccessToken(tokens.access_token);
      const email = claims.email || claims.preferred_username || data.email;

      let user = await ensureLocalUser(
        email,
        claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ')
      );
      await syncRole(user, claims.realm_access?.roles);
      user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

      return res.json({
        data: {
          token: tokens.access_token,
          refreshToken: tokens.refresh_token,
          user: toUserResponse(user),
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      return handleAuthError(error, res);
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const data = refreshTokenSchema.parse(req.body);
      const tokens = await refreshKeycloakToken(data.refreshToken);
      const claims = decodeAccessToken(tokens.access_token);
      const email = claims.email || claims.preferred_username;

      if (!email) {
        return res.status(401).json({ error: 'Refresh token inválido' });
      }

      let user = await ensureLocalUser(
        email,
        claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ')
      );
      await syncRole(user, claims.realm_access?.roles);
      user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

      return res.json({
        data: {
          token: tokens.access_token,
          refreshToken: tokens.refresh_token,
          user: toUserResponse(user),
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      return handleAuthError(error, res);
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.email) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      let user = await ensureLocalUser(req.email, req.name);
      await syncRole(user, req.roles);
      user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

      return res.json({ data: toUserResponse(user) });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, email } = req.body;

      if (!req.email) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      if (email && email !== req.email) {
        return res.status(400).json({ error: 'El email se gestiona en Keycloak' });
      }

      const user = await prisma.user.findUnique({ where: { email: req.email } });
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(name && { name }),
        },
      });

      return res.json({ data: toUserResponse(updated) });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const data = changePasswordSchema.parse(req.body);

      if (!req.email) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      await setKeycloakPassword(req.email, data.newPassword);

      return res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Change password error:', error);
      return res.status(502).json({ error: error.message || 'No se pudo actualizar la contraseña' });
    }
  }
}
