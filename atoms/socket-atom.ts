import { atom, useAtomValue } from 'jotai'
import type { GameSocketClient } from '@/types/socket'

const socketAtom = atom<GameSocketClient | undefined>(undefined)

export default socketAtom

/**
 * Use under App component
 */
export const useSocket = () => {
  const socket = useAtomValue(socketAtom)

  if (socket === undefined) {
    throw Error('Access socket before it is set')
  }

  return socket
}
