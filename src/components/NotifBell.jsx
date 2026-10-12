import { useNotif } from '../lib/notif'
import Ikon from './Ikon'
export default function NotifBell({ wide }) {
  const { unread, setOpen } = useNotif()
  return wide
    ? <button onClick={() => setOpen(true)} className="w-full rounded-2xl bg-white/10 px-3 py-3 text-sm font-bold text-left flex items-center justify-between"><span className="flex items-center gap-2"><Ikon n="bell" size={18} /> Notifikasi</span>{unread > 0 && <span className="bg-rose-500 rounded-full px-2 py-0.5 text-xs">{unread}</span>}</button>
    : <button onClick={() => setOpen(true)} className="btn2 !py-2 !px-3 relative" aria-label="Notifikasi"><Ikon n="bell" size={18} />{unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] grid place-items-center font-bold">{unread}</span>}</button>
}
