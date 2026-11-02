// Runs once when the Next.js server boots
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startStatsServer } = await import('@/modules/node/stats-server')
    startStatsServer()
  }
}
