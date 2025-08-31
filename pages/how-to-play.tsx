// Third-party imports
import { ChevronLeft, House } from 'framework7-icons-plus/react'
import Link from 'next/link'

// Local imports
import { useLanguage } from '@/contexts/LanguageContext'
import styles from './how-to-play.module.scss'

const HowToPlay = () => {
  const { t } = useLanguage()

  return (
    <div className={styles.page}>
      <Link href="/">
        <button className="minimal">
          <ChevronLeft /> {t('common.home')}
        </button>
      </Link>

      <div className={styles.description}>
        <p>{t('howToPlay.description.p1')}</p>
        <p>{t('howToPlay.description.p2')}</p>
        <p>
          {t('howToPlay.description.p3_1')}
          <b>{t('howToPlay.description.p3_subject')}</b>
          {t('howToPlay.description.p3_2')}
          <b>{t('howToPlay.description.p3_liar')}</b>
        </p>
        <p>{t('howToPlay.description.p4')}</p>
        <p>{t('howToPlay.description.p5')}</p>
        <p>{t('howToPlay.description.p6')}</p>
      </div>
    </div>
  )
}

export default HowToPlay
