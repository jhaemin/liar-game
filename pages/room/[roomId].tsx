import { Subject } from '@/data/keywords'
import { getRoom } from '@/modules/node/redis'
import { Player } from '@/types/game'
import { GameSocketClient } from '@/types/socket'
import axios from 'axios'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { CreateRoomResponseData } from '../api/create-room'

type RoomProps = {
  isRoomAvailable: boolean
}

const Room = ({ isRoomAvailable }: RoomProps) => {
  const [socket, setSocket] = useState<GameSocketClient>()
  const router = useRouter()
  const [myName, setMyName] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const routerRoomId = router.query.roomId as string
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    if (!routerRoomId || routerRoomId === 'create' || !isRoomAvailable) {
      return
    }

    const init = async () => {
      console.log(routerRoomId)
      try {
        await axios.post('/api/init-socket', {
          roomId: routerRoomId,
        })
      } catch (err) {
        alert('방에 입장할 수 없습니다. 만료된 방이거나 인원이 꽉 찼습니다.')
        router.replace('/')
      }
    }

    init()
  }, [routerRoomId, router, isRoomAvailable])

  const createRoom = async () => {
    const res = await axios.post('/api/create-room')
    const { roomId } = res.data as CreateRoomResponseData

    return roomId
  }

  const joinRoom = async (roomId: string) => {
    if (socket || !roomId) {
      return
    }

    const initialSocket: GameSocketClient = io({
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: Infinity,
      reconnectionAttempts: Infinity,
    })

    initialSocket.on('connect', () => {
      setSocket(initialSocket)
      console.info('Socket connected')
    })

    initialSocket.on('joinRoomFailed', () => {
      alert('방에 입장할 수 없습니다. 만료된 방이거나 인원이 꽉 찼습니다.')
      router.replace('/')
    })

    initialSocket.on('updatePlayers', (newPlayers) => {
      setTimeout(() => {
        setPlayers(newPlayers)
      }, 0)
    })

    initialSocket.on('startGame', () => {
      initialSocket.emit('askIfImLiar')
    })

    initialSocket.on('answerIfImLiar', ({ isLiar, subject, keyword }) => {
      setDisplayText(
        isLiar
          ? `주제는 "${subject}"입니다. 당신은 라이어입니다.`
          : `주제는 "${subject}"이며 제시어는 "${keyword}"입니다. 라이어를 찾아주세요.`
      )
    })

    initialSocket.emit('joinRoom', roomId, myName)
  }

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [socket])

  if (!isRoomAvailable) {
    return <div>존재하지 않거나 이미 게임이 진행 중인 방입니다.</div>
  }

  return (
    <div>
      {!socket && (
        <>
          <input
            placeholder="이름을 입력해주세요."
            value={myName}
            onChange={(e) => {
              setMyName(e.target.value)
            }}
          />
          <button
            onClick={async () => {
              if (routerRoomId === 'create') {
                const newRoomId = await createRoom()
                router.replace(`/room/${newRoomId}`, undefined, {
                  shallow: true,
                })

                await joinRoom(newRoomId)
              } else {
                await joinRoom(routerRoomId)
              }
            }}
          >
            확인
          </button>
        </>
      )}

      {players.map((player, i) => (
        <div key={i}>{player.name}</div>
      ))}

      <button
        onClick={() => {
          socket?.emit('startGame')
        }}
      >
        게임 시작
      </button>
      {/* <button>게임 종료</button> */}

      <h2>{displayText}</h2>
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
    isRoomAvailable = room !== null && room.isPlaying === false
  }

  return {
    props: {
      isRoomAvailable,
    },
  }
}
