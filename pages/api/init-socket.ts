import keywords, { Subject } from '@/data/keywords'
import redis, { deleteRoom, getRoom, setRoom } from '@/modules/node/redis'
import { isDev } from '@/modules/shared/is'
import { NextApiResponseExtended } from '@/types/next'
import { GameSocket, GameSocketServer } from '@/types/socket'
import { NextApiRequest } from 'next'
import { Server as SocketServer } from 'socket.io'

const createSocketListener =
  (io: GameSocketServer) => async (socket: GameSocket) => {
    socket.on('disconnect', async () => {
      const roomId = await redis.get(`liarGame:socketId${socket.id}:roomId`)
      await redis.del(`liarGame:socketId${socket.id}:roomId`)

      console.log(`[SOCKET] Disconnected: ${socket.id}, roomId: ${roomId}`)

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room) {
        return
      }

      const memberIndex = room.players.findIndex(({ id }) => id === socket.id)
      room.players.splice(memberIndex, 1)

      await setRoom(room)

      io.to(`liarGame:room:${roomId}`).emit(
        'updatePlayers',
        room.players.map(({ id, ...member }) => ({ ...member }))
      )

      if (room.players.length === 0) {
        await deleteRoom(roomId)
      }
    })

    socket.on('joinRoom', async (roomId, name) => {
      const room = await getRoom(roomId)

      if (!room || room.isPlaying) {
        socket.emit('joinRoomFailed')
        return
      }

      socket.join(`liarGame:room:${roomId}`)

      room.players.push({
        id: socket.id,
        name,
      })

      await setRoom(room)

      await redis.set(`liarGame:socketId${socket.id}:roomId`, roomId)

      io.to(`liarGame:room:${roomId}`).emit(
        'updatePlayers',
        room.players.map(({ id, ...member }) => ({ ...member }))
      )
    })

    socket.on('startGame', async () => {
      const roomId = await redis.get(`liarGame:socketId${socket.id}:roomId`)

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room || room.isPlaying) {
        return
      }

      const liar = room.players[Math.floor(Math.random() * room.players.length)]
      const subjects = Object.keys(keywords)
      const subject = subjects[
        Math.floor(Math.random() * subjects.length)
      ] as Subject
      const keyword =
        keywords[subject][Math.floor(Math.random() * keywords[subject].length)]

      room.isPlaying = true
      room.liar = liar.id
      room.subject = subject
      room.keyword = keyword

      await setRoom(room)

      io.to(`liarGame:room:${roomId}`).emit('startGame')
    })

    socket.on('askIfImLiar', async () => {
      const roomId = await redis.get(`liarGame:socketId${socket.id}:roomId`)

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room || !room.isPlaying) {
        return
      }

      const { subject, keyword } = room

      socket.emit('answerIfImLiar', {
        isLiar: room.liar === socket.id,
        subject,
        keyword,
      })
    })
  }

const SocketHandler = async (
  req: NextApiRequest,
  res: NextApiResponseExtended
) => {
  // Already initialized
  if (res.socket.server.io) {
    // Refresh connection in development mode
    if (isDev) {
      res.socket.server.io.off('connection', res.socket.server.listener)

      const listener = createSocketListener(res.socket.server.io)

      res.socket.server.io.on('connection', listener)
      res.socket.server.listener = listener
    }

    res.end()
    return
  }

  const io = new SocketServer(res.socket.server, {
    pingInterval: 25000,
    pingTimeout: 60000,
  })
  const listener = createSocketListener(io)

  io.on('connection', listener)

  res.socket.server.io = io
  res.socket.server.listener = listener

  res.end()
}

export default SocketHandler
