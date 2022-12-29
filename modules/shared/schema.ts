import { z } from 'zod'

export const redisRoomSchema = z.object({
  id: z.string(),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  liar: z.nullable(z.string()),
  isPlaying: z.boolean(),
  subject: z.nullable(z.string()),
  keyword: z.nullable(z.string()),
  createdAt: z.number(),
  lastUpdatedAt: z.number(),
})
