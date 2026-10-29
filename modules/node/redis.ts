import Redis from 'ioredis'
import type { RedisRoom } from '@/types/redis'
import { redisRoomSchema } from '../shared/schema'

// Rooms expire after being inactive for this long
const ROOM_TTL_SECONDS = 60 * 60 * 2

const redis = new Redis({
  password: process.env.REDIS_PASSWORD,
})

export default redis

// Data manipulations

export const setRoom = async (room: RedisRoom) => {
  await redis.set(
    `liarGame:room:${room.id}`,
    JSON.stringify(room),
    'EX',
    ROOM_TTL_SECONDS
  )
}

export const deleteRoom = async (roomId: string) => {
  await redis.del(`liarGame:room:${roomId}`)
}

export const getRoom = async (roomId: string): Promise<RedisRoom | null> => {
  const roomData = await redis.get(`liarGame:room:${roomId}`)

  if (!roomData) {
    return null
  }

  let room: RedisRoom

  try {
    room = redisRoomSchema.parse(JSON.parse(roomData))
  } catch (err) {
    console.error(err)

    await deleteRoom(roomId)
    return null
  }

  // Keep rooms alive while they are being read, not only written
  await redis.expire(`liarGame:room:${roomId}`, ROOM_TTL_SECONDS)

  return room
}
