import { Chance } from 'chance'
import type { NextApiRequest } from 'next'
import { setRoom } from '@/modules/node/redis'
import type { NextApiHandlerExtended } from '@/types/next'
import type { RedisRoom } from '@/types/redis'

const chance = Chance()

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_ROOMS = 10

const roomCreations = new Map<string, { count: number; resetAt: number }>()

const getClientIp = (req: NextApiRequest) => {
  const remoteAddress = req.socket.remoteAddress ?? ''
  const isFromProxy =
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::1' ||
    remoteAddress === '::ffff:127.0.0.1'
  const realIp = req.headers['x-real-ip']

  // Only trust the header when the request comes through the local nginx
  if (isFromProxy && typeof realIp === 'string') {
    return realIp
  }

  return remoteAddress
}

const isRateLimited = (ip: string) => {
  const now = Date.now()

  if (roomCreations.size > 10_000) {
    roomCreations.forEach(({ resetAt }, key) => {
      if (resetAt <= now) {
        roomCreations.delete(key)
      }
    })
  }

  const entry = roomCreations.get(ip)

  if (!entry || entry.resetAt <= now) {
    roomCreations.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1

  return entry.count > RATE_LIMIT_MAX_ROOMS
}

export type CreateRoomResponseData = {
  roomId: string
}

const handler: NextApiHandlerExtended<CreateRoomResponseData> = async (
  req,
  res
) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).end()
    return
  }

  if (isRateLimited(getClientIp(req))) {
    res.status(429).end()
    return
  }

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

  await setRoom(roomData)

  res.json({ roomId })
}

export default handler
