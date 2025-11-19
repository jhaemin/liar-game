import { LogoGithub } from 'framework7-icons-plus/react'
import Link from 'next/link'
import styles from './home.module.scss'

const Home = () => {
  return (
    <div className={styles.home}>
      <div className={styles.top} />

      <div className={styles.middle}>
        <div className={styles.hero}>
          <h2 className={styles.titleEng}>Liar Game</h2>
          <h1 className={styles.title}>라이어 게임</h1>
        </div>
        <Link href="/room/create">
          <button type="button">방 만들기</button>
        </Link>
        <Link href="/how-to-play">
          <button type="button" className="minimal">
            플레이 방법
          </button>
        </Link>
      </div>

      <div className={styles.bottom}>
        <a
          href="https://github.com/jhaemin/liar-game"
          target="_blank"
          rel="noreferrer"
        >
          <span className={styles.source}>
            <LogoGithub className={styles.icon} /> GitHub
          </span>
        </a>
      </div>
    </div>
  )
}

export default Home
