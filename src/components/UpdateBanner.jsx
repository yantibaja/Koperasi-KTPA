import { useEffect, useState } from 'react'
export default function UpdateBanner() {
  const [on, setOn] = useState(false)
  useEffect(() => { const h = () => setOn(true); window.addEventListener('app-update', h); return () => window.removeEventListener('app-update', h) }, [])
  if (!on) return null
  return <div className="toast fixed bottom-28 md:bottom-6 inset-x-3 md:left-auto md:right-6 md:w-80 z-[95] rounded-2xl bg-ink text-white p-3 flex items-center gap-3 shadow-2xl">
    <span className="text-2xl">🚀</span><div className="flex-1 text-sm"><b>Versi baru tersedia</b><div className="text-xs text-white/60">Perbarui untuk fitur terbaru</div></div>
    <button className="btn !py-2" onClick={() => location.reload()}>Muat ulang</button></div>
}
