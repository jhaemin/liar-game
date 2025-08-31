// Third-party imports
import { LogoGithub, QuestionCircle } from 'framework7-icons-plus/react'
import Link from 'next/link'

// Local imports
import { useLanguage } from '@/contexts/LanguageContext'
import styles from './home.module.scss'

const Home = () => {
  const { t } = useLanguage()

  return (
    <div className={styles.home}>
      <div className={styles.top} />

      <div className={styles.middle}>
        <div className={styles.hero}>
          <h2 className={styles.titleEng}>{t('common.titleEng')}</h2>
          <h1 className={styles.title}>{t('common.title')}</h1>
        </div>
        <Link href="/room/create">
          <button>{t('home.createRoom')}</button>
        </Link>
        <Link href="/how-to-play">
          <button className="minimal">{t('home.howToPlay')}</button>
        </Link>
      </div>

      <div className={styles.bottom}>
        <a
          href="https://github.com/jhaemin/liar-game"
          target="_blank"
          rel="noreferrer"
        >
          <span className={styles.source}>
            <LogoGithub className={styles.icon} /> {t('home.github')}
          </span>
        </a>
      </div>
    </div>
  )
}

export default Home
