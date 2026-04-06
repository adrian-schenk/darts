
import { z } from 'zod';

export const createLocalGameSchema = z.object({
  mode: z.string(),
  settings: z.object({
    scoreConfig: z.object({
      startingScore: z.number(),
      checkoutMode: z.string()
    }),
    opponent: z.object({
      type: z.string()
    })
  })
});

export type CreateLocalGameDTO = z.infer<typeof createLocalGameSchema>;