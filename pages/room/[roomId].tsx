import dialog from '@/modules/browser/dialog'
import { getSessionId } from '@/modules/browser/storage'
import { getRoom } from '@/modules/node/redis'
import { Player } from '@/types/game'
import { RedisRoom } from '@/types/redis'
import { GameSocketClient } from '@/types/socket'
import axios from 'axios'
import copy from 'copy-to-clipboard'
import { House } from 'framework7-icons-plus/react'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Flipped, Flipper } from 'react-flip-toolkit'
import { io } from 'socket.io-client'
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
        dialog().alert(
          '방에 입장할 수 없습니다. 만료된 방이거나 인원이 꽉 찼습니다.'
        )
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

      initialSocket.emit('joinRoom', sessionId, roomId, myName)
    })

    initialSocket.on('joinRoomFailed', () => {
      dialog().alert(
        '방에 입장할 수 없습니다. 만료된 방이거나 인원이 꽉 찼습니다.'
      )
      router.replace('/')
    })

    initialSocket.on('updatePlayers', (newPlayers) => {
      setPlayers(newPlayers)
    })

    initialSocket.on('answerIfImLiar', ({ isLiar, subject, keyword }) => {
      setDisplayText(
        isLiar
          ? `주제는 "${subject}"입니다. 당신은 라이어입니다.`
          : `주제는 "${subject}"이며 제시어는 "${keyword}"입니다. 라이어를 찾아주세요.`
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
        `라이어는 ${name}입니다. 주제는 "${subject}"이며 제시어는 "${keyword}"입니다.`
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
            <h2 className={styles.title}>플레이어</h2>
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
            <p>존재하지 않거나 이미 게임이 진행 중인 방입니다.</p>
            <Link href="/">
              <button>홈으로 돌아가기</button>
            </Link>
          </>
        ) : !isRoomReady ? (
          <>
            <div className={styles.nameRegistration}>
              <h1 className={styles.title}>라이어 게임 방 입장</h1>
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
                    이름을 입력해주세요.
                  </span>
                )}
              </div>
              <div className={styles.actions}>
                <Link href="/">
                  <button>취소</button>
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
                        dialog().vagabond('이름을 입력해주세요.')
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
                  입장
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
                아래 링크를 공유하세요!
                <br />
                <span className={styles.roomLink}>
                  {location.host + location.pathname}
                </span>
                <button
                  className="minimal"
                  onClick={() => {
                    if (copy(location.host + location.pathname)) {
                      dialog().vagabond('클립보드에 복사되었습니다.')
                    } else {
                      dialog().vagabond('복사에 실패했습니다.')
                    }
                  }}
                >
                  링크 복사
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
                <House /> 홈으로
              </button>
            </Link>
            <button
              onClick={async () => {
                if (phase === 'waiting') {
                  const yes = await dialog().confirm(
                    `모든 플레이어가 입장했는지 확인해주세요. ${players.length}명의 플레이어로 게임을 시작하시겠습니까?`
                  )

                  if (!yes) {
                    return
                  }
                }

                socket?.emit('nextPhase')
              }}
            >
              {phase === 'waiting'
                ? '게임 시작'
                : phase === 'playing'
                ? '게임 종료'
                : '다시 시작'}
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
