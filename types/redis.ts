import { redisRoomSchema } from '@/modules/shared/schema'
import { z } from 'zod'

export type RedisRoom = z.infer<typeof redisRoomSchema>
