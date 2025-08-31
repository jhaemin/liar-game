import { z } from 'zod'

export const redisRoomSchema = z.object({
  id: z.string(),
  players: z.array(
    z.object({
      socketId: z.string(),
      sessionId: z.string(),
      name: z.string(),
    })
  ),
  phase: z.union([
    z.literal('waiting'),
    z.literal('playing'),
    z.literal('ended'),
  ]),
  liar: z.nullable(z.object({ sessionId: z.string(), name: z.string() })),
  subject: z.nullable(z.string()),
  keyword: z.nullable(z.string()),
  language: z.optional(z.union([z.literal('ko'), z.literal('en')])),
  createdAt: z.number(),
  lastUpdatedAt: z.number(),
})
