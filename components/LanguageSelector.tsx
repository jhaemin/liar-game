// Standard library imports
import React from 'react'

// Local imports
import { Language, useLanguage } from '@/contexts/LanguageContext'
import styles from './LanguageSelector.module.scss'

const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage()

    return (
        <div className={styles.languageSelector}>
            <button
                className={`${styles.langButton} ${language === 'ko' ? styles.active : ''}`}
                onClick={() => setLanguage('ko')}
                aria-label="한국어"
            >
                한국어
            </button>
            <span className={styles.separator}>|</span>
            <button
                className={`${styles.langButton} ${language === 'en' ? styles.active : ''}`}
                onClick={() => setLanguage('en')}
                aria-label="English"
            >
                English
            </button>
        </div>
    )
}

export default LanguageSelector
