import type { GameSocketServer } from '@/types/socket'
import redis from './redis'

/**
 * Usage statistics for the console, kept in Redis apart from the
 * `liarGame:*` game state. Same shape as pp.land's, under `stats:lg`.
 *
 * Per KST day:
 * - `stats:lg:visitors:<day>` HyperLogLog of anonymous visitor ids (every
 *   browser that opened a socket, i.e. opened a room page)
 * - `stats:lg:players:<day>`  HyperLogLog of visitor ids that joined a room
 * - `stats:lg:daily:<day>`    hash of counters (connections, roomsCreated,
 *   joins, rounds = games started, peakOnline)
 *
 * Plus `stats:lg:visitors:all`, an all-time HyperLogLog of visitor ids.
 * Day keys expire after STATS_TTL_SECONDS.
 */
const PREFIX = 'stats:lg'
const STATS_TTL_SECONDS = 400 * 24 * 60 * 60
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type DailyCounter = 'connections' | 'roomsCreated' | 'joins' | 'rounds'

/** YYYY-MM-DD in Korea Standard Time (no DST, so a fixed offset is exact). */
export function kstDay(time = Date.now()) {
  return new Date(time + KST_OFFSET_MS).toISOString().slice(0, 10)
}

const visitorsKey = (day: string) => `${PREFIX}:visitors:${day}`
const playersKey = (day: string) => `${PREFIX}:players:${day}`
const dailyKey = (day: string) => `${PREFIX}:daily:${day}`
const allVisitorsKey = `${PREFIX}:visitors:all`

/**
 * The socket.io server lives on Next's HTTP server and is created lazily by
 * /api/init-socket, while the stats server starts from instrumentation —
 * separate bundles, so it is shared through globalThis.
 */
const globalForStats = globalThis as typeof globalThis & {
  liarGameIo?: GameSocketServer
}

export function setStatsIo(io: GameSocketServer) {
  globalForStats.liarGameIo = io
}

/** Visitor ids come from the client; accept only the shape it generates. */
export function parseVisitorId(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value)
    ? value
    : null
}

// HSET field to max(current, value), atomically
const SET_MAX_SCRIPT = `
local current = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
local value = tonumber(ARGV[2])
if value > current then
  redis.call('HSET', KEYS[1], ARGV[1], value)
end
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 0
`

/** Stats must never break the game: failures are logged and dropped. */
function swallow(promise: Promise<unknown>) {
  promise.catch((err) => console.error('stats:', err))
}

function onlineCount() {
  return globalForStats.liarGameIo?.of('/').sockets.size ?? 0
}

/** Rooms with at least one connected socket (socket.io room names). */
function activeRoomCount() {
  let count = 0
  const rooms = globalForStats.liarGameIo?.of('/').adapter.rooms
  rooms?.forEach((_, name) => {
    if (name.startsWith('liarGame:room:')) count++
  })
  return count
}

export function recordConnection(visitorId: string | null) {
  const day = kstDay()
  const pipeline = redis.pipeline()
  pipeline.hincrby(dailyKey(day), 'connections', 1)
  pipeline.expire(dailyKey(day), STATS_TTL_SECONDS)
  if (visitorId) {
    pipeline.pfadd(visitorsKey(day), visitorId)
    pipeline.expire(visitorsKey(day), STATS_TTL_SECONDS)
    pipeline.pfadd(allVisitorsKey, visitorId)
  }
  pipeline.eval(
    SET_MAX_SCRIPT,
    1,
    dailyKey(day),
    'peakOnline',
    onlineCount(),
    STATS_TTL_SECONDS
  )
  swallow(pipeline.exec())
}

export function recordJoin(visitorId: string | null) {
  const day = kstDay()
  const pipeline = redis.pipeline()
  pipeline.hincrby(dailyKey(day), 'joins', 1)
  pipeline.expire(dailyKey(day), STATS_TTL_SECONDS)
  if (visitorId) {
    pipeline.pfadd(playersKey(day), visitorId)
    pipeline.expire(playersKey(day), STATS_TTL_SECONDS)
  }
  swallow(pipeline.exec())
}

export function incrementDaily(counter: DailyCounter) {
  const day = kstDay()
  swallow(
    redis
      .multi()
      .hincrby(dailyKey(day), counter, 1)
      .expire(dailyKey(day), STATS_TTL_SECONDS)
      .exec()
  )
}

export type DailyStats = {
  date: string
  visitors: number
  players: number
  connections: number
  roomsCreated: number
  joins: number
  rounds: number
  peakOnline: number
}

export type StatsSnapshot = {
  generatedAt: string
  timezone: 'Asia/Seoul'
  now: { online: number; activeRooms: number }
  /** Unique visitors/players across the whole `days` range (not a sum) */
  range: { days: number; visitors: number; players: number }
  allTime: { visitors: number }
  /** Oldest first, ending today */
  daily: DailyStats[]
}

export async function getStats(days: number): Promise<StatsSnapshot> {
  const now = Date.now()
  const dates = Array.from({ length: days }, (_, i) =>
    kstDay(now - (days - 1 - i) * DAY_MS)
  )

  const pipeline = redis.pipeline()
  for (const date of dates) {
    pipeline.pfcount(visitorsKey(date))
    pipeline.pfcount(playersKey(date))
    pipeline.hgetall(dailyKey(date))
  }
  // PFCOUNT over several keys counts the union: uniques across the range
  pipeline.pfcount(...dates.map(visitorsKey))
  pipeline.pfcount(...dates.map(playersKey))
  pipeline.pfcount(allVisitorsKey)

  const results = (await pipeline.exec()) ?? []
  const values = results.map(([err, value]) => {
    if (err) throw err
    return value
  })

  const daily = dates.map((date, i): DailyStats => {
    const counters = (values[i * 3 + 2] ?? {}) as Record<string, string>
    const n = (field: string) => Number(counters[field] ?? 0)
    return {
      date,
      visitors: values[i * 3] as number,
      players: values[i * 3 + 1] as number,
      connections: n('connections'),
      roomsCreated: n('roomsCreated'),
      joins: n('joins'),
      rounds: n('rounds'),
      peakOnline: n('peakOnline'),
    }
  })

  const [rangeVisitors, rangePlayers, allTimeVisitors] = values.slice(
    dates.length * 3
  ) as number[]

  return {
    generatedAt: new Date(now).toISOString(),
    timezone: 'Asia/Seoul',
    now: { online: onlineCount(), activeRooms: activeRoomCount() },
    range: { days, visitors: rangeVisitors, players: rangePlayers },
    allTime: { visitors: allTimeVisitors },
    daily,
  }
}
