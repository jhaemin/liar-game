import { clearAllBodyScrollLocks, disableBodyScroll } from 'body-scroll-lock'
import Mustache from 'mustache'
import { template as dialogTemplate } from './template'

const messages = {
  confirmLabel: '확인',
  cancelLabel: '취소',
  closeLabel: '닫기',
}

class Dialog {
  static alertsOrConfirms: number[] = []

  index: number = 0
  dialogContainerElm: HTMLElement
  confirmBtn: HTMLElement
  cancelBtn: HTMLElement
  closeBtn: HTMLElement

  constructor() {
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

    return new Promise((resolve) => {
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

    return new Promise((resolve) => {
      this.confirmBtn.onclick = () => {
        this.close()
        resolve(true)
      }

      this.cancelBtn.onclick = () => {
        this.close()
        resolve(false)
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

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    setTimeout(() => {
      this.dialogContainerElm.ontransitionstart = () => {
        if (mode === 'alert') {
          ;(this.closeBtn.querySelector('button') as HTMLButtonElement).focus()
        } else if (mode === 'confirm') {
          ;(
            this.confirmBtn.querySelector('button') as HTMLButtonElement
          ).focus()
        }
      }

      this.dialogContainerElm.classList.add('active')
      this.dialogContainerElm.classList.add(mode)
    }, 0)

    // If vagabond mode, auto-close it after some time
    if (mode === 'vagabond') {
      setTimeout(() => {
        this.close()
      }, 1500)
    }
  }

  close() {
    Dialog.alertsOrConfirms.splice(this.index, 1)

    if (Dialog.alertsOrConfirms.length === 0) {
      // Enable body scroll
      clearAllBodyScrollLocks()
    }

    // Remove active class
    this.dialogContainerElm.classList.remove('active')

    setTimeout(() => {
      this.dialogContainerElm.remove()
    }, 300)
  }
}

const dialog = () => new Dialog()

export default dialog
