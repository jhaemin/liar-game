import type { NextApiRequest } from 'next'
import { Server as SocketServer } from 'socket.io'
import keywords, { type Subject } from '@/data/keywords'
import { getRoom, setRoom } from '@/modules/node/redis'
import withRoomLock from '@/modules/node/room-lock'
import { isDev } from '@/modules/shared/is'
import {
  joinRoomSchema,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  modeSchema,
} from '@/modules/shared/schema'
import type { NextApiResponseExtended } from '@/types/next'
import type { GameSocket, GameSocketServer } from '@/types/socket'

const createSocketListener =
  (io: GameSocketServer) => async (socket: GameSocket) => {
    socket.on('disconnect', async () => {
      const { roomId } = socket.data

      if (!roomId) {
        return
      }

      await withRoomLock(roomId, async () => {
        const room = await getRoom(roomId)

        if (!room) {
          return
        }

        const playerIndex = room.players.findIndex(
          ({ socketId }) => socketId === socket.id
        )

        if (playerIndex === -1) {
          return
        }

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
    })

    socket.on('joinRoom', async (...args) => {
      // A socket can only join a single room once
      if (socket.data.roomId) {
        return
      }

      const [sessionId, roomId, name] = args
      const parsed = joinRoomSchema.safeParse({ sessionId, roomId, name })

      if (!parsed.success) {
        socket.emit('joinRoomFailed')
        return
      }

      const trimmedName = parsed.data.name.trim()

      if (trimmedName.length === 0) {
        socket.emit('error', '이름을 입력해주세요.')
        return
      }

      if (trimmedName.length > MAX_NAME_LENGTH) {
        socket.emit('error', `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해주세요.`)
        return
      }

      // Claim synchronously so that duplicate joinRoom events are ignored
      socket.data.roomId = parsed.data.roomId

      const joined = await withRoomLock(parsed.data.roomId, async () => {
        const room = await getRoom(parsed.data.roomId)

        if (!room) {
          socket.emit('joinRoomFailed')
          return false
        }

        // Disconnected while waiting for the lock
        if (!socket.connected) {
          return false
        }

        // Reconnecting player replaces their stale entry instead of duplicating
        room.players = room.players.filter(
          (player) => player.sessionId !== parsed.data.sessionId
        )

        if (room.players.length >= MAX_PLAYERS) {
          socket.emit('joinRoomFailed')
          return false
        }

        socket.join(`liarGame:room:${room.id}`)
        socket.data.sessionId = parsed.data.sessionId

        room.players.push({
          socketId: socket.id,
          sessionId: parsed.data.sessionId,
          name: trimmedName,
        })
        room.lastUpdatedAt = Date.now()

        await setRoom(room)

        io.to(`liarGame:room:${room.id}`).emit(
          'updatePlayers',
          room.players.map(({ socketId, name }) => ({
            id: socketId,
            name,
          }))
        )

        io.to(`liarGame:room:${room.id}`).emit('phase', room.phase)
        socket.emit('updateMode', room.mode ?? 'default')

        return true
      })

      if (!joined) {
        socket.data.roomId = undefined
      }
    })

    socket.on('nextPhase', async (mode = 'default') => {
      const { roomId } = socket.data
      const parsedMode = modeSchema.safeParse(mode)

      if (!roomId || !parsedMode.success) {
        return
      }

      await withRoomLock(roomId, async () => {
        const room = await getRoom(roomId)

        if (!room || room.players.length === 0) {
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
          room.mode = parsedMode.data
          room.participants = room.players.map(({ sessionId }) => sessionId)

          if (parsedMode.data === 'fool') {
            const otherKeywords = keywords[subject].filter((k) => k !== keyword)
            room.liarKeyword =
              otherKeywords[Math.floor(Math.random() * otherKeywords.length)]
          }
        } else if (room.phase === 'playing') {
          room.phase = 'ended'
        } else if (room.phase === 'ended') {
          room.phase = 'waiting'
          room.liar = null
          room.subject = null
          room.keyword = null
          room.mode = undefined
          room.liarKeyword = null
          room.participants = undefined
        }

        await setRoom(room)

        io.to(`liarGame:room:${roomId}`).emit('phase', room.phase)
      })
    })

    socket.on('askIfImLiar', async () => {
      const { roomId, sessionId } = socket.data

      if (!roomId || !sessionId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room || room.phase !== 'playing' || !room.liar) {
        return
      }

      // Players who joined mid-game (e.g. the liar in a new tab) get nothing
      // (rooms started before participants existed are left as they were)
      if (room.participants && !room.participants.includes(sessionId)) {
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
        const isLiar = room.liar.sessionId === sessionId

        // Never send the keyword to the liar, even if the client hides it
        socket.emit('answerIfImLiar', {
          isLiar,
          subject,
          keyword: isLiar ? null : keyword,
        })
      }
    })

    socket.on('revealLiar', async () => {
      const { roomId } = socket.data

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (
        !room ||
        room.phase !== 'ended' ||
        !room.liar ||
        !room.subject ||
        !room.keyword
      ) {
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
      const parsedMode = modeSchema.safeParse(mode)

      if (!roomId || !parsedMode.success) {
        return
      }

      await withRoomLock(roomId, async () => {
        const room = await getRoom(roomId)

        // Changing the mode mid-game would change what askIfImLiar answers
        if (!room || room.phase !== 'waiting') {
          return
        }

        room.mode = parsedMode.data
        room.lastUpdatedAt = Date.now()

        await setRoom(room)

        io.to(`liarGame:room:${roomId}`).emit('updateMode', parsedMode.data)
      })
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
    maxHttpBufferSize: 1e4,
  })
  const listener = createSocketListener(io)

  io.on('connection', listener)

  res.socket.server.io = io
  res.socket.server.listener = listener

  res.end()
}

export default SocketHandler
