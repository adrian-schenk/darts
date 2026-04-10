
import { z } from 'zod';

export const createLocalGameSchema = z.object({
  mode: z.string(),
  settings: z.object({
    gameConfig: z.object({
      startingScore: z.number(),
      checkoutMode: z.string(),
      sets: z.number().optional(),
      legs: z.number().optional()
    }).or(z.object({
      players: z.array(z.object({
        name: z.string().optional(),
        startingScore: z.number(),
        checkoutMode: z.string(),
      })),
      sets: z.number().optional(),
      legs: z.number().optional()
    })),
    opponent: z.object({
      type: z.string(),
      difficulty: z.string().optional()
    })
  })
});

export type CreateLocalGameDTO = z.infer<typeof createLocalGameSchema>;