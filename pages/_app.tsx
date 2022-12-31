import { getSessionId } from '@/modules/browser/storage'
import '@/styles/globals.scss'
import { nanoid } from 'nanoid'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import styles from './_app.module.scss'

const App = ({ Component, pageProps }: AppProps) => {
  useEffect(() => {
    if (!getSessionId({ initial: true })) {
      sessionStorage.setItem('sessionId', nanoid(10))
    }
  }, [])

  return (
    <>
      <Head>
        <title>라이어 게임</title>
        <meta property="og:title" content="라이어 게임" />
        <meta name="description" content="우리 중 누군가 거짓말을 하고 있다." />
        <meta
          property="og:description"
          content="우리 중 누군가 거짓말을 하고 있다."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta
          property="og:image"
          content="https://www.liar-game.com/og/open_graph.png"
        />
      </Head>
      <div id="app" className={styles.wrapper}>
        <Component {...pageProps} />
      </div>
    </>
  )
}

export default App
