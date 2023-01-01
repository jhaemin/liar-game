import { ChevronLeft, House } from 'framework7-icons-plus/react'
import Link from 'next/link'
import styles from './how-to-play.module.scss'

const HowToPlay = () => {
  return (
    <div className={styles.page}>
      <Link href="/">
        <button className="minimal">
          <ChevronLeft /> 홈으로
        </button>
      </Link>

      <div className={styles.description}>
        <p>방을 만들고 모든 플레이어가 참가하면 게임을 시작합니다.</p>
        <p>
          랜덤으로 한 사람이 라이어로 선택됩니다. (자신의 화면에 표시됩니다.)
        </p>
        <p>
          모든 플레이어에게 제시어의 주제가 공개됩니다. 단, 라이어는 제시어를 알
          수 없습니다.
        </p>
        <p>
          턴 순서에 대한 규칙은 직접 정하며, 각 턴을 돌며 제시어를 설명합니다.
          제시어를 유추하기 쉽게 설명하면 라이어가 알아챌 수 있습니다. 라이어는
          주변 사람들의 설명을 들으며, 마치 제시어를 아는 것처럼 연기해야
          합니다.
        </p>
        <p>
          라이어가 제시어를 정확히 맞추면 라이어의 승리입니다. 라이어가 아닌
          플레이어는 라이어를 찾으면 승리합니다.
        </p>
      </div>
    </div>
  )
}

export default HowToPlay
