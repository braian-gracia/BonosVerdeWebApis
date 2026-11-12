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
  roles?: string[];
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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Usuario no registrado en BonosVerde' });
    }

    req.userId = user.id;
    req.email = email;
    req.roles = getRolesFromClaims(claims);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
