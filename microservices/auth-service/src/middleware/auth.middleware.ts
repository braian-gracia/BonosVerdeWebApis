import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import {
  getEmailFromClaims,
  getRolesFromClaims,
  verifyKeycloakToken,
} from '../utils/keycloak';

export interface AuthRequest extends Request {
  userId?: number;
  email?: string;
  name?: string;
  roles?: string[];
  keycloakSub?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.slice(7);

  try {
    const claims = await verifyKeycloakToken(token);
    const email = getEmailFromClaims(claims);

    if (!email) {
      return res.status(401).json({ error: 'El token no contiene un email válido' });
    }

    req.email = email;
    req.name =
      claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ') || undefined;
    req.roles = getRolesFromClaims(claims);
    req.keycloakSub = claims.sub;

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      req.userId = user.id;
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.email) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.roles?.includes('ADMIN')) {
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: req.email },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error al verificar permisos' });
  }
}
