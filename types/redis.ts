import type { z } from 'zod'
import type { redisRoomSchema } from '@/modules/shared/schema'

export type RedisRoom = z.infer<typeof redisRoomSchema>
