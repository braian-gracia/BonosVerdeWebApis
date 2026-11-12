import { z } from 'zod';

export const purchaseBondSchema = z.object({
  bondType: z.enum(['OXYGEN', 'FAUNA', 'CARBON24', 'HYDROGEN']),
  paymentMethod: z.enum(['PAYPAL', 'EPAYCO', 'SIMULATED']),
});
