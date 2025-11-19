import type { Server as HttpServer } from 'node:http'
import type { Socket as NetSocket } from 'node:net'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameSocket, GameSocketServer } from './socket'

export type NextApiResponseExtended<T = unknown> = NextApiResponse<T> & {
  socket: NetSocket & {
    server: HttpServer & {
      io: GameSocketServer
      listener: (socket: GameSocket) => void
    }
  }
}

export type NextApiHandlerExtended<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponseExtended<T>
) => unknown | Promise<unknown>
