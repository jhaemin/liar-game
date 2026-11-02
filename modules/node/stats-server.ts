import { createServer } from 'node:http'
import { getStats } from './stats'

/**
 * Usage stats for the console (console-api relays this). Bound to loopback
 * only and not exposed through nginx, so it needs no auth of its own.
 * Started once at boot from instrumentation.ts.
 */
export function startStatsServer() {
  const port = Number(
    process.env.STATS_PORT ||
      (process.env.NODE_ENV === 'production' ? 17728 : 4113)
  )

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    if (req.method !== 'GET' || url.pathname !== '/stats') {
      send(404, { error: 'Not found' })
      return
    }

    const days = Number(url.searchParams.get('days') ?? 30)

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      send(400, { error: 'days must be an integer from 1 to 365' })
      return
    }

    try {
      send(200, await getStats(days))
    } catch (err) {
      console.error('stats:', err)
      send(500, { error: 'Failed to read stats' })
    }
  })

  // Stats are secondary: failing to bind (e.g. the port is taken) must not
  // crash the game, which an unhandled 'error' event would do.
  server.on('error', (err) =>
    console.error(`stats: could not listen on 127.0.0.1:${port}:`, err)
  )
  server.listen(port, '127.0.0.1')
}
