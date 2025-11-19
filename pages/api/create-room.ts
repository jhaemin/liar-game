import { Chance } from 'chance'
import redis from '@/modules/node/redis'
import type { NextApiHandlerExtended } from '@/types/next'
import type { RedisRoom } from '@/types/redis'

const chance = Chance()

export type CreateRoomResponseData = {
  roomId: string
}

const handler: NextApiHandlerExtended<CreateRoomResponseData> = async (
  _req,
  res
) => {
  const roomId = `${chance.word({ length: 5 })}-${chance.word({ length: 5 })}`
  const now = Date.now()
  const roomData: RedisRoom = {
    id: roomId,
    players: [],
    phase: 'waiting',
    liar: null,
    subject: null,
    keyword: null,
    createdAt: now,
    lastUpdatedAt: now,
  }

  await redis.set(`liarGame:room:${roomId}`, JSON.stringify(roomData))

  res.json({ roomId })
}

export default handler
