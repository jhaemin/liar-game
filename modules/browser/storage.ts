import { nanoid } from 'nanoid'
import dialog from './dialog'

const VISITOR_ID_KEY = 'lg:visitor-id'

/**
 * Anonymous, random per-browser id used only to count unique visitors.
 * Storage can be unavailable (private mode, blocked site data); the
 * connection still counts, just not as a unique visitor.
 */
export const getVisitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = nanoid()
      localStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    return undefined
  }
}

export const setSessionId = (sessionId: string) => {
  return sessionStorage.setItem('sessionId', sessionId)
}

export const getSessionId = (options?: { initial: boolean }) => {
  const sessionId = sessionStorage.getItem('sessionId')

  if (!sessionId && !options?.initial) {
    dialog().alert(
      '세션에 문제가 발생했습니다. 같은 문제가 지속적으로 발생 시 개발자에게 알려주세요.'
    )
    throw Error('Session ID is not set')
  }

  return sessionId as string
}
