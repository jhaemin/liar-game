// Third-party imports
import { clearAllBodyScrollLocks, disableBodyScroll } from 'body-scroll-lock'
import Mustache from 'mustache'

// Local imports
import { Language } from '@/contexts/LanguageContext'
import translations from '@/data/translations'
import { template as dialogTemplate } from './template'

const getMessages = (language: Language) => ({
  confirmLabel: translations[language].common.confirm,
  cancelLabel: translations[language].common.cancel,
  closeLabel: translations[language].common.close,
})

class Dialog {
  static alertsOrConfirms: number[] = []

  index: number = 0
  dialogContainerElm: HTMLElement
  confirmBtn: HTMLElement
  cancelBtn: HTMLElement
  closeBtn: HTMLElement

  constructor() {
    // Get the current language from localStorage
    const language = (localStorage.getItem('language') as Language) || 'ko'
    const messages = getMessages(language)

    // create a DOM
    const wrapper = document.createElement('div')
    wrapper.innerHTML = Mustache.render(dialogTemplate, messages)
    this.dialogContainerElm = wrapper.firstElementChild as HTMLElement
    document.body.appendChild(this.dialogContainerElm)
    // eslint-disable-next-line no-unused-expressions
    this.dialogContainerElm.getBoundingClientRect().width

    this.confirmBtn = this.dialogContainerElm.querySelector(
      '.actions .confirm'
    ) as HTMLElement
    this.cancelBtn = this.dialogContainerElm.querySelector(
      '.actions .cancel'
    ) as HTMLElement
    this.closeBtn = this.dialogContainerElm.querySelector(
      '.actions .close'
    ) as HTMLElement
  }

  alert(msg: string): Promise<true> {
    this.index = Dialog.alertsOrConfirms.push(0) - 1

    this.setMsg(msg)
    this.open('alert')

    return new Promise((resolve, reject) => {
      this.closeBtn.onclick = () => {
        this.close()
        resolve(true)
      }
    })
  }

  confirm(msg: string): Promise<boolean> {
    this.index = Dialog.alertsOrConfirms.push(0) - 1

    this.setMsg(msg)
    this.open('confirm')

    return new Promise((resolve, reject) => {
      this.cancelBtn.onclick = () => {
        this.close()
        resolve(false)
      }

      this.confirmBtn.onclick = () => {
        this.close()
        resolve(true)
      }
    })
  }

  vagabond(msg: string) {
    this.setMsg(msg)
    this.open('vagabond')
  }

  setMsg(msg: string) {
    this.dialogContainerElm.getElementsByClassName('message')[0].innerHTML =
      msg.replace(/(?:\r\n|\r|\n)/g, '<br>')
  }

  open(mode: 'alert' | 'confirm' | 'vagabond') {
    if (mode !== 'vagabond') {
      disableBodyScroll(document.body)
    }

    this.dialogContainerElm.classList.add(mode)
    this.dialogContainerElm.classList.add('active')
    this.dialogContainerElm.focus()

    if (mode === 'vagabond') {
      setTimeout(() => {
        this.close()
      }, 3000)
    }
  }

  close() {
    clearAllBodyScrollLocks()
    Dialog.alertsOrConfirms.splice(this.index, 1)
    this.dialogContainerElm.classList.remove('alert')
    this.dialogContainerElm.classList.remove('confirm')
    this.dialogContainerElm.classList.remove('vagabond')
    this.dialogContainerElm.classList.remove('active')
  }

  destroy() {
    this.dialogContainerElm.remove()
  }
}

const dialog = (): Dialog => {
  const dialog = new Dialog()
  return dialog
}

// Note: Dialog styles are imported in _app.tsx to comply with Next.js global CSS rules

export default dialog
