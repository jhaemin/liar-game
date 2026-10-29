import { z } from 'zod'

export const MAX_NAME_LENGTH = 20
export const MAX_PLAYERS = 20

export const modeSchema = z.union([z.literal('default'), z.literal('fool')])

export const joinRoomSchema = z.object({
  sessionId: z.string().min(1).max(64),
  roomId: z.string().min(1).max(64),
  name: z.string().max(1000),
})

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
  mode: modeSchema.optional(),
  liarKeyword: z.string().nullable().optional(),
  participants: z.array(z.string()).optional(),
  createdAt: z.number(),
  lastUpdatedAt: z.number(),
})
