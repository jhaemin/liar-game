import dialog from './dialog'

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

  return sessionId!
}
