// Standard library imports
import { useEffect, useState } from 'react'

// Third-party imports
import axios from 'axios'
import copy from 'copy-to-clipboard'
import { House } from 'framework7-icons-plus/react'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Flipped, Flipper } from 'react-flip-toolkit'
import { io } from 'socket.io-client'

// Local imports
import { useLanguage } from '@/contexts/LanguageContext'
import dialog from '@/modules/browser/dialog'
import { getSessionId } from '@/modules/browser/storage'
import { getRoom } from '@/modules/node/redis'
import { Player } from '@/types/game'
import { RedisRoom } from '@/types/redis'
import { GameSocketClient } from '@/types/socket'
import { CreateRoomResponseData } from '../api/create-room'
import styles from './room.module.scss'

type RoomProps = {
  isRoomAvailable: boolean
}

const Room = ({ isRoomAvailable }: RoomProps) => {
  const [socket, setSocket] = useState<GameSocketClient>()
  const [myName, setMyName] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState<RedisRoom['phase']>('waiting')
  const [isEntering, setIsEntering] = useState(false)

  const { t, language } = useLanguage()

  const router = useRouter()
  const routerRoomId = router.query.roomId as string

  const isRoomReady = socket !== undefined && routerRoomId !== 'create'

  const createRoom = async () => {
    const res = await axios.post('/api/create-room')
    const { roomId } = res.data as CreateRoomResponseData

    return roomId
  }

  const joinRoom = async (roomId: string) => {
    if (socket || !roomId) {
      return
    }

    const init = async () => {
      try {
        await axios.post('/api/init-socket')
      } catch (err) {
        dialog().alert(t('errors.joinFailed'))
        router.replace('/')
      }
    }

    await init()

    const initialSocket: GameSocketClient = io({
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: Infinity,
      reconnectionAttempts: Infinity,
    })

    setSocket(initialSocket)

    initialSocket.on('connect', () => {
      const sessionId = getSessionId()

      initialSocket.emit('joinRoom', sessionId, roomId, myName, language)
    })

    initialSocket.on('joinRoomFailed', () => {
      dialog().alert(t('errors.joinFailed'))
      router.replace('/')
    })

    initialSocket.on('updatePlayers', (newPlayers) => {
      setPlayers(newPlayers)
    })

    initialSocket.on('answerIfImLiar', ({ isLiar, subject, keyword }) => {
      setDisplayText(
        isLiar
          ? t('room.youAreLiar').replace('{subject}', subject || '')
          : t('room.findLiar').replace('{subject}', subject || '').replace('{keyword}', keyword || '')
      )
    })

    initialSocket.on('error', (message) => {
      dialog().alert(message)
    })

    initialSocket.on('phase', (nextPhase) => {
      setPhase(nextPhase)

      if (nextPhase === 'playing') {
        initialSocket.emit('askIfImLiar', getSessionId())
      } else if (nextPhase === 'ended') {
        initialSocket.emit('revealLiar')
      } else {
        setDisplayText('')
      }
    })

    initialSocket.on('revealLiar', (subject, keyword, name) => {
      setDisplayText(
        t('room.liarRevealed')
          .replace('{name}', name)
          .replace('{subject}', subject)
          .replace('{keyword}', keyword)
      )
    })
  }

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [socket])

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        {isRoomReady && (
          <div className={styles.playersContainer}>
            <h2 className={styles.title}>{t('room.players')}</h2>
            <Flipper
              flipKey={players.map(({ id }) => id)}
              className={styles.players}
            >
              {players.map(({ id, name }) => (
                <Flipped key={id} flipId={id}>
                  <div className={styles.player}>{name}</div>
                </Flipped>
              ))}
            </Flipper>
          </div>
        )}
      </div>

      <div className={styles.middle}>
        {!isRoomAvailable ? (
          <>
            <p>{t('room.roomNotAvailable')}</p>
            <Link href="/">
              <button>{t('room.returnHome')}</button>
            </Link>
          </>
        ) : !isRoomReady ? (
          <>
            <div className={styles.nameRegistration}>
              <h1 className={styles.title}>{t('room.enterRoom')}</h1>
              <div className={styles.inputWrapper}>
                <input
                  className={styles.nameInput}
                  type="text"
                  value={myName}
                  onChange={(e) => {
                    setMyName(e.target.value)
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  tabIndex={1}
                />
                {!myName && (
                  <span className={styles.placeholder}>
                    {t('room.enterName')}
                  </span>
                )}
              </div>
              <div className={styles.actions}>
                <Link href="/">
                  <button>{t('common.cancel')}</button>
                </Link>
                <button
                  onClick={async () => {
                    if (isEntering) {
                      return
                    }

                    setIsEntering(true)

                    if (routerRoomId === 'create') {
                      const trimmedName = myName.trim()

                      if (!trimmedName) {
                        dialog().vagabond(t('errors.enterName'))
                        return
                      }

                      const newRoomId = await createRoom()
                      await router.replace(`/room/${newRoomId}`, undefined, {
                        shallow: true,
                      })

                      await joinRoom(newRoomId)
                    } else {
                      await joinRoom(routerRoomId)
                    }

                    setIsEntering(false)
                  }}
                  disabled={!myName.trim() || isEntering}
                >
                  {t('room.enter')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.displayText}>
            {displayText ? (
              displayText
            ) : (
              <>
                {t('room.shareLink')}
                <br />
                <span className={styles.roomLink}>
                  {location.host + location.pathname}
                </span>
                <button
                  className="minimal"
                  onClick={() => {
                    if (copy(location.host + location.pathname)) {
                      dialog().vagabond(t('common.copied'))
                    } else {
                      dialog().vagabond(t('common.copyFailed'))
                    }
                  }}
                >
                  {t('room.copyLink')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.bottom}>
        {isRoomReady && (
          <div className={styles.controller}>
            <Link href="/">
              <button>
                <House /> {t('common.home')}
              </button>
            </Link>
            <button
              onClick={async () => {
                if (phase === 'waiting') {
                  const yes = await dialog().confirm(
                    t('room.confirmStart').replace('{count}', String(players.length))
                  )

                  if (!yes) {
                    return
                  }
                }

                socket?.emit('nextPhase')
              }}
            >
              {phase === 'waiting'
                ? t('room.startGame')
                : phase === 'playing'
                  ? t('room.endGame')
                  : t('room.restart')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Room

export const getServerSideProps: GetServerSideProps<RoomProps> = async (
  context
) => {
  const roomId = context.params?.roomId as string

  let isRoomAvailable = false

  if (roomId === 'create') {
    isRoomAvailable = true
  } else {
    const room = await getRoom(roomId)
    isRoomAvailable = room !== null
  }

  return {
    props: {
      isRoomAvailable,
    },
  }
}