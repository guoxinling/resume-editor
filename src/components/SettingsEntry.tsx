import { useState } from 'react'

interface Props {
  isLoggedIn: boolean
}

export default function SettingsEntry({ isLoggedIn }: Props) {
  const [toast, setToast] = useState('')

  const showToast = () => {
    setToast(isLoggedIn ? '设置页面开发中' : '登录功能开发中')
    window.setTimeout(() => setToast(''), 1800)
  }

  return (
    <>
      <button
        type="button"
        onClick={showToast}
        className="fixed bottom-4 left-4 z-30 hidden min-h-10 items-center gap-2 rounded-full border border-[#CAC4D0]/75 bg-[#FFFBFE]/95 px-4 text-sm font-black text-[#49454F] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#F3EDF7] hover:text-[#6750A4] lg:inline-flex"
      >
        <span>{isLoggedIn ? '⚙️' : '👤'}</span>
        {isLoggedIn ? '设置' : '注册 / 登录'}
      </button>
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#1C1B1F] px-4 py-2 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  )
}
