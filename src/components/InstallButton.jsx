import { useEffect, useState } from 'react'
export default function InstallButton({ className = 'btn2 w-full' }) {
  const [ev, setEv] = useState(null), [done, setDone] = useState(false)
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setEv(e) }
    window.addEventListener('beforeinstallprompt', h); window.addEventListener('appinstalled', () => setDone(true))
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
  if (standalone || done) return null
  if (ev) return <button className={className} onClick={async () => { ev.prompt(); await ev.userChoice; setEv(null) }}>📲 Pasang aplikasi</button>
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return <p className="text-xs text-center opacity-70">iPhone/iPad: ketuk Bagikan → Tambah ke Layar Utama</p>
  return null
}
