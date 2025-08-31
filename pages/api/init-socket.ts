// Local imports
import keywords, { Subject } from '@/data/keywords'
import cleanInactiveRooms from '@/modules/node/clean-inactive-rooms'
import redis, { deleteRoom, getRoom, setRoom } from '@/modules/node/redis'
import { isDev } from '@/modules/shared/is'
import { NextApiResponseExtended } from '@/types/next'
import { GameSocket, GameSocketServer } from '@/types/socket'
import { NextApiRequest } from 'next'
import { Server as SocketServer } from 'socket.io'

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

    socket.on('joinRoom', async (sessionId, roomId, name, language = 'ko') => {
      const room = await getRoom(roomId)

      if (!room) {
        socket.emit('joinRoomFailed')
        return
      }

      const trimmedName = name.trim()

      if (trimmedName.length === 0) {
        socket.emit('error', language === 'en' ? 'Please enter your name.' : '이름을 입력해주세요.')
        return
      }

      socket.join(`liarGame:room:${roomId}`)
      socket.data.roomId = roomId
      socket.data.language = language

      room.players.push({
        socketId: socket.id,
        sessionId,
        name: trimmedName,
      })
      room.lastUpdatedAt = Date.now()

      // Store language preference for the room (use first player's language)
      if (!room.language) {
        room.language = language
      }

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

    socket.on('nextPhase', async () => {
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

        // Use language-appropriate keywords
        const language = room.language || 'ko'
        const subjects = language === 'en'
          ? ['sports', 'food', 'animals'] as Subject[]
          : ['스포츠', '음식', '동물'] as Subject[]

        const subject = subjects[
          Math.floor(Math.random() * subjects.length)
        ]

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

        cleanInactiveRooms()
      } else if (room.phase === 'playing') {
        room.phase = 'ended'
      } else if (room.phase === 'ended') {
        room.phase = 'waiting'
        room.liar = null
        room.subject = null
        room.keyword = null
      }

      await setRoom(room)

      io.to(`liarGame:room:${roomId}`).emit('phase', room.phase)
    })

    socket.on('askIfImLiar', async (sessionId) => {
      const { roomId, language = 'ko' } = socket.data

      if (!roomId) {
        return
      }

      const room = await getRoom(roomId)

      if (!room || room.phase !== 'playing' || !room.liar) {
        return
      }

      const { subject, keyword } = room

      // Translate subject if needed
      let displaySubject = subject
      if (subject && language === 'en' && ['스포츠', '음식', '동물'].includes(subject)) {
        const subjectMap: Record<string, string> = {
          '스포츠': 'sports',
          '음식': 'food',
          '동물': 'animals'
        }
        displaySubject = subjectMap[subject]
      } else if (subject && language === 'ko' && ['sports', 'food', 'animals'].includes(subject)) {
        const subjectMap: Record<string, string> = {
          'sports': '스포츠',
          'food': '음식',
          'animals': '동물'
        }
        displaySubject = subjectMap[subject]
      }

      socket.emit('answerIfImLiar', {
        isLiar: room.liar.sessionId === sessionId,
        subject: displaySubject,
        keyword,
      })
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

      // Get each socket's language and emit with translated subject
      const sockets = await io.in(`liarGame:room:${roomId}`).fetchSockets()
      for (const socket of sockets) {
        const language = (socket.data as any).language || 'ko'
        let displaySubject = room.subject

        if (room.subject && language === 'en' && ['스포츠', '음식', '동물'].includes(room.subject)) {
          const subjectMap: Record<string, string> = {
            '스포츠': 'sports',
            '음식': 'food',
            '동물': 'animals'
          }
          displaySubject = subjectMap[room.subject]
        } else if (room.subject && language === 'ko' && ['sports', 'food', 'animals'].includes(room.subject)) {
          const subjectMap: Record<string, string> = {
            'sports': '스포츠',
            'food': '음식',
            'animals': '동물'
          }
          displaySubject = subjectMap[room.subject]
        }

        socket.emit(
          'revealLiar',
          displaySubject,
          room.keyword,
          room.liar.name
        )
      }
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