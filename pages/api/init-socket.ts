import type { NextApiRequest } from 'next'
import { Server as SocketServer } from 'socket.io'
import keywords, { type Subject } from '@/data/keywords'
import cleanInactiveRooms from '@/modules/node/clean-inactive-rooms'
import { getRoom, setRoom } from '@/modules/node/redis'
import { isDev } from '@/modules/shared/is'
import type { NextApiResponseExtended } from '@/types/next'
import type { GameSocket, GameSocketServer } from '@/types/socket'

const createSocketListener =
  (io: GameSocketServer) => async (socket: GameSocket) => {
    socket.on('disconnect', async () => {
      const { roomId } = socket.data

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room) {
        return
      }

      const playerIndex = room.players.findIndex(
        ({ socketId }) => socketId === socket.id
      )
      room.players.splice(playerIndex, 1)

      await setRoom(room)

      io.to(`liarGame:room:${roomId}`).emit(
        'updatePlayers',
        room.players.map(({ socketId, name }) => ({
          id: socketId,
          name,
        }))
      )

      io.to(`liarGame:room:${roomId}`).emit('phase', room.phase)
    })

    socket.on('joinRoom', async (sessionId, roomId, name) => {
      const room = await getRoom(roomId)

      if (!room) {
        socket.emit('joinRoomFailed')
        return
      }

      const trimmedName = name.trim()

      if (trimmedName.length === 0) {
        socket.emit('error', '이름을 입력해주세요.')
        return
      }

      socket.join(`liarGame:room:${roomId}`)
      socket.data.roomId = roomId

      room.players.push({
        socketId: socket.id,
        sessionId,
        name: trimmedName,
      })
      room.lastUpdatedAt = Date.now()

      await setRoom(room)

      io.to(`liarGame:room:${roomId}`).emit(
        'updatePlayers',
        room.players.map(({ socketId, name }) => ({
          id: socketId,
          name,
        }))
      )

      io.to(`liarGame:room:${roomId}`).emit('phase', room.phase)
    })

    socket.on('nextPhase', async (mode: 'default' | 'fool' = 'default') => {
      const { roomId } = socket.data

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room) {
        return
      }

      room.lastUpdatedAt = Date.now()

      if (room.phase === 'waiting') {
        const liar =
          room.players[Math.floor(Math.random() * room.players.length)]
        const subjects = Object.keys(keywords)
        const subject = subjects[
          Math.floor(Math.random() * subjects.length)
        ] as Subject
        const keyword =
          keywords[subject][
            Math.floor(Math.random() * keywords[subject].length)
          ]

        room.phase = 'playing'
        room.liar = {
          sessionId: liar.sessionId,
          name: liar.name,
        }
        room.subject = subject
        room.keyword = keyword
        room.mode = mode

        if (mode === 'fool') {
          const otherKeywords = keywords[subject].filter((k) => k !== keyword)
          room.liarKeyword =
            otherKeywords[Math.floor(Math.random() * otherKeywords.length)]
        }

        cleanInactiveRooms()
      } else if (room.phase === 'playing') {
        room.phase = 'ended'
      } else if (room.phase === 'ended') {
        room.phase = 'waiting'
        room.liar = null
        room.subject = null
        room.keyword = null
        room.mode = undefined
        room.liarKeyword = null
      }

      await setRoom(room)

      io.to(`liarGame:room:${roomId}`).emit('phase', room.phase)
    })

    socket.on('askIfImLiar', async (sessionId) => {
      const { roomId } = socket.data

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room || room.phase !== 'playing' || !room.liar) {
        return
      }

      const { subject, keyword, liarKeyword, mode } = room

      if (mode === 'fool') {
        if (room.liar.sessionId === sessionId) {
          socket.emit('answerIfImLiar', {
            isLiar: false,
            subject,
            keyword: liarKeyword ?? null,
          })
        } else {
          socket.emit('answerIfImLiar', {
            isLiar: false,
            subject,
            keyword,
          })
        }
      } else {
        socket.emit('answerIfImLiar', {
          isLiar: room.liar.sessionId === sessionId,
          subject,
          keyword,
        })
      }
    })

    socket.on('revealLiar', async () => {
      const { roomId } = socket.data

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room || !room.liar || !room.subject || !room.keyword) {
        return
      }

      io.to(`liarGame:room:${roomId}`).emit(
        'revealLiar',
        room.subject,
        room.keyword,
        room.liar.name
      )
    })

    socket.on('updateMode', async (mode) => {
      const { roomId } = socket.data

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room) {
        return
      }

      room.mode = mode
      room.lastUpdatedAt = Date.now()

      await setRoom(room)

      io.to(`liarGame:room:${roomId}`).emit('updateMode', mode)
    })
  }

const SocketHandler = async (
  _req: NextApiRequest,
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
