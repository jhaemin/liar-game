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
        <p>라이어 게임은 라이어를 찾는 게임입니다.</p>
        <p>방을 만들고 모든 플레이어가 참가하면 게임을 시작합니다.</p>
        <p>
          랜덤으로 한 사람이 라이어로 선택됩니다. (자신의 화면에 표시됩니다.)
        </p>
        <p>
          모든 플레이어에게 제시어의 <b>주제</b>가 공개됩니다. 단,{' '}
          <b>라이어는 제시어를 알 수 없습니다.</b>
        </p>
        <p>
          차례대로 돌아가며 제시어를 설명합니다. (순서에 대한 룰은 직접
          정합니다.) 제시어를 유추하기 쉽게 설명하면 라이어가 알아챌 수
          있습니다. 그렇다고 너무 두루뭉술한 설명은 라이어로 의심받을 수
          있습니다. 라이어는 마치 제시어를 아는 것처럼 적절히 설명하며 다른
          플레이어들을 속여야 합니다.
        </p>
        <p>
          모든 차례가 끝나면 라이어를 지목할지 결정합니다. 지목하지 않으면 다시
          차례대로 제시어를 설명합니다.
        </p>
        <p>
          가장 많은 지목을 받은 플레이어(동표 포함)는 라이어가 아니라면 탈락되고
          설명이 다시 진행됩니다. 만약 라이어라면 변론할 수 있으며, 제시어를
          정확히 맞추면 라이어의 승리, 그렇지 못하면 라이어의 패배입니다.
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
