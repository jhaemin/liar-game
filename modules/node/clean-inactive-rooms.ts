import redis, { deleteRoom, getRoom } from './redis'

const cleanInactiveRooms = async () => {
  const roomKeys = await redis.keys('liarGame:room:*')

  await Promise.all(
    roomKeys.map(async (key) => {
      const roomId = key.split(':')[2]
      const room = await getRoom(roomId)

      if (!room) {
        return
      }

      if (
        Date.now() - room.lastUpdatedAt > 1_800_000 ||
        room.players.length === 0
      ) {
        await Promise.all(
          room.players.map((player) =>
            redis.del(`liarGame:socketId${player.id}:roomId`)
          )
        )
        await deleteRoom(roomId)
      }
    })
  )
}

export default cleanInactiveRooms
