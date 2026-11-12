import { z } from 'zod';

export const applyReferralSchema = z.object({
  code: z.string().min(1, 'El código de referido es requerido'),
});
