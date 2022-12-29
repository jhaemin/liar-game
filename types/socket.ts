import type { Server as SocketServer, Socket } from 'socket.io'
import type { Socket as SocketClient } from 'socket.io-client'
import { Player } from './game'

/**
 * Server -> Client
 */
export type ServerToClientEvents = {
  updatePlayers: (players: Player[]) => void
  startGame: () => void
  answerIfImLiar: (payload: {
    isLiar: boolean
    subject: string | null
    keyword: string | null
  }) => void
  joinRoomFailed: () => void
}

/**
 * Client -> Server
 */
export type ClientToServerEvents = {
  joinRoom: (roomId: string, name: string) => void
  startGame: () => void
  askIfImLiar: () => void
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
export type SocketData = {}

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
