import { z } from 'zod';

export const simulatePaymentSchema = z.object({
  bondType: z.enum(['OXYGEN', 'FAUNA', 'CARBON24', 'HYDROGEN']),
  paymentMethod: z.enum(['PAYPAL', 'EPAYCO', 'SIMULATED']),
});

export const paymentStatusSchema = z.object({
  id: z.coerce.number(),
});
