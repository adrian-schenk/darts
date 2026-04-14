import { z } from "zod";

export const joinQueueSchema = z.object({
  gameConfig: z.object({
    startingScore: z.union([z.literal(501), z.literal(301)]),
    checkoutMode: z.union([z.literal('open'), z.literal('double-out'), z.literal('master-out')])
  }),
  type: z.union([z.literal('unranked'), z.literal('ranked')]).optional()
})

export type JoinQueueDTO = z.infer<typeof joinQueueSchema>;