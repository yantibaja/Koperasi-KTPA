import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { useToast } from './toast'
const C = createContext({ items: [], unread: 0, setOpen() {} })
export const useNotif = () => useContext(C)
const ICON = { sukses: '✅', gagal: '❌', peringatan: '⏰', info: '🔔' }
const ago = (d) => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'baru saja'; if (s < 3600) return `${Math.floor(s / 60)} menit lalu`; if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`; return `${Math.floor(s / 86400)} hari lalu` }
export function NotifProvider({ children }) {
  const { profile } = useAuth(), toast = useToast(), nav = useNavigate()
  const [items, setItems] = useState([]), [open, setOpen] = useState(false), [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'x' : Notification.permission)
  const seen = useRef(new Set()), tampilRef = useRef(() => {})
  tampilRef.current = (n) => {
    ;(n.tipe === 'gagal' ? toast.error : n.tipe === 'sukses' ? toast.success : toast.info)(n.judul, n.isi)
    navigator.vibrate?.([80, 40, 80])
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted')
      navigator.serviceWorker?.ready.then(r => r.showNotification(n.judul, { body: n.isi, icon: import.meta.env.BASE_URL + 'icon-192.png', tag: n.id })).catch(() => {})
  }
  const muat = useCallback(async (kabarkan) => {
    const { data } = await supabase.from('notifikasi').select('*').order('created_at', { ascending: false }).limit(40)
    const baru = (data || []).filter(n => !seen.current.has(n.id)); (data || []).forEach(n => seen.current.add(n.id)); setItems(data || [])
    if (kabarkan) baru.filter(n => !n.dibaca).reverse().forEach(n => tampilRef.current(n))
  }, [])
  useEffect(() => {
    seen.current = new Set(); if (!profile) return setItems([])
    muat(false)
    const ch = supabase.channel('notif-' + profile.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `user_id=eq.${profile.id}` }, p => {
      const n = p.new; if (seen.current.has(n.id)) return; seen.current.add(n.id); setItems(a => [n, ...a]); tampilRef.current(n) }).subscribe()
    const vis = () => { if (document.visibilityState === 'visible') muat(true) }
    document.addEventListener('visibilitychange', vis); const iv = setInterval(() => muat(true), 60000) // cadangan bila koneksi realtime putus
    return () => { supabase.removeChannel(ch); document.removeEventListener('visibilitychange', vis); clearInterval(iv) }
  }, [profile?.id])
  const unread = items.filter(n => !n.dibaca).length
  const baca = async (n) => { if (!n.dibaca) { setItems(a => a.map(x => x.id === n.id ? { ...x, dibaca: true } : x)); await supabase.from('notifikasi').update({ dibaca: true }).eq('id', n.id) } setOpen(false); if (n.tautan) nav(n.tautan) }
  const semua = async () => { setItems(a => a.map(x => ({ ...x, dibaca: true }))); await supabase.from('notifikasi').update({ dibaca: true }).eq('dibaca', false) }
  const izin = () => Notification.requestPermission().then(p => { setPerm(p); if (p === 'granted') toast.success('Notifikasi perangkat aktif', 'Anda akan diberi tahu saat aplikasi di latar belakang.') })
  return <C.Provider value={{ items, unread, setOpen }}>{children}
    {open && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setOpen(false)}>
      <div className="sheet w-full max-w-md max-h-[85dvh] overflow-y-auto bg-white rounded-t-[32px] md:rounded-[32px] p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">🔔 Notifikasi</h2><button className="btn2 !py-1.5 !px-3" onClick={() => setOpen(false)}>✕</button></div>
        <div className="flex gap-2 flex-wrap">{unread > 0 && <button className="btn2 !py-1.5 text-xs" onClick={semua}>Tandai semua dibaca</button>}{perm === 'default' && <button className="btn2 !py-1.5 text-xs" onClick={izin}>Aktifkan notifikasi perangkat</button>}</div>
        {items.length === 0 && <div className="text-center py-8"><div className="text-4xl">📭</div><p className="text-sm text-slate-500 mt-2">Belum ada notifikasi.</p></div>}
        {items.map(n => <button key={n.id} onClick={() => baca(n)} className={`w-full text-left flex gap-3 rounded-2xl p-3 transition active:scale-[.98] ${n.dibaca ? 'bg-slate-50' : 'bg-brand-soft'}`}>
          <span className="text-2xl">{ICON[n.tipe] || '🔔'}</span><span className="flex-1 min-w-0"><b className="block text-sm">{n.judul}</b><span className="block text-xs text-slate-500">{n.isi}</span><span className="block text-[10px] text-slate-400 mt-1">{ago(n.created_at)}</span></span>{!n.dibaca && <span className="w-2.5 h-2.5 rounded-full bg-brand mt-1.5" />}</button>)}
      </div></div>}</C.Provider>
}
