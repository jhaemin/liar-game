const roomLocks = new Map<string, Promise<unknown>>()

/**
 * Serialize read-modify-write operations on the same room
 * so that concurrent socket events don't overwrite each other.
 */
const withRoomLock = <T>(roomId: string, fn: () => Promise<T>) => {
  const prev = roomLocks.get(roomId) ?? Promise.resolve()
  const next = prev.then(fn)
  const tail = next.catch(() => {})

  roomLocks.set(roomId, tail)
  tail.then(() => {
    if (roomLocks.get(roomId) === tail) {
      roomLocks.delete(roomId)
    }
  })

  return next
}

export default withRoomLock
