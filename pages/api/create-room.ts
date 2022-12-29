import redis from '@/modules/node/redis'
import { NextApiHandlerExtended } from '@/types/next'
import { RedisRoom } from '@/types/redis'
import { nanoid } from 'nanoid'

export type CreateRoomResponseData = {
  roomId: string
}

const handler: NextApiHandlerExtended<CreateRoomResponseData> = async (
  req,
  res
) => {
  const roomId = nanoid(7)
  const now = Date.now()
  const roomData: RedisRoom = {
    id: roomId,
    players: [],
    liar: null,
    isPlaying: false,
    subject: null,
    keyword: null,
    createdAt: now,
    lastUpdatedAt: now,
  }

  await redis.set(`liarGame:room:${roomId}`, JSON.stringify(roomData))

  res.json({ roomId })
}

export default handler
