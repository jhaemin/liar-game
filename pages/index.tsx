import Link from 'next/link'
import styles from './home.module.scss'

const Home = () => {
  return (
    <div className={styles.home}>
      <div className={styles.hero}>
        <h2 className={styles.titleEng}>Liar Game</h2>
        <h1 className={styles.title}>라이어 게임</h1>
      </div>
      <Link href="/room/create">
        <button>방 만들기</button>
      </Link>
    </div>
  )
}

export default Home
