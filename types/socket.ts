import type { Socket, Server as SocketServer } from 'socket.io'
import type { Socket as SocketClient } from 'socket.io-client'
import type { Player } from './game'
import type { RedisRoom } from './redis'

/**
 * Server -> Client
 */
export type ServerToClientEvents = {
  phase: (phase: RedisRoom['phase']) => void
  updatePlayers: (players: Player[]) => void
  answerIfImLiar: (payload: {
    isLiar: boolean
    subject: string | null
    keyword: string | null
  }) => void
  joinRoomFailed: () => void
  error: (message: string) => void
  revealLiar: (subject: string, keyword: string, name: string) => void
  updateMode: (mode: 'default' | 'fool') => void
}

/**
 * Client -> Server
 */
export type ClientToServerEvents = {
  joinRoom: (sessionId: string, roomId: string, name: string) => void
  nextPhase: (mode?: 'default' | 'fool') => void
  askIfImLiar: (sessionId: string) => void

  revealLiar: () => void
  updateMode: (mode: 'default' | 'fool') => void
}

/**
 * Server <-> Server
 */
export type InterServerEvents = {
  ping: () => void
}

/**
 * Socket data
 */
export type SocketData = {
  roomId: string
}

export type GameSocketServer = SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

// Client
export type GameSocketClient = SocketClient<
  ServerToClientEvents,
  ClientToServerEvents
>
