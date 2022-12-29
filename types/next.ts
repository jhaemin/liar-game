import { Server as HttpServer } from 'http'
import { Socket as NetSocket } from 'net'
import { NextApiRequest, NextApiResponse } from 'next'
import { GameSocket, GameSocketServer } from './socket'

export type NextApiResponseExtended<T = any> = NextApiResponse<T> & {
  socket: NetSocket & {
    server: HttpServer & {
      io: GameSocketServer
      listener: (socket: GameSocket) => void
    }
  }
}

export type NextApiHandlerExtended<T = any> = (
  req: NextApiRequest,
  res: NextApiResponseExtended<T>
) => unknown | Promise<unknown>
