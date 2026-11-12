import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import referralsRoutes from './routes/referrals.routes';

dotenv.config();

if (!process.env.KEYCLOAK_JWKS_URI) {
  throw new Error('KEYCLOAK_JWKS_URI no está definido');
}

if (!process.env.KEYCLOAK_ISSUER) {
  throw new Error('KEYCLOAK_ISSUER no está definido');
}

if (!process.env.KEYCLOAK_AUDIENCE) {
  throw new Error('KEYCLOAK_AUDIENCE no está definido');
}

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3004;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/referrals', referralsRoutes);

app.get('/api/referrals/health', (_req, res) => {
  res.json({ status: 'ok', service: 'referral-service' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Referral Service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
