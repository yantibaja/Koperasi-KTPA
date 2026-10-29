import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import { useTheme } from './lib/theme'
import { useNotif } from './lib/notif'
import { supabase } from './lib/supabase'
import { APP_VERSION } from './lib/version'
import { useLibur } from './lib/libur'
import Ikon from './components/Ikon'
import NotifBell from './components/NotifBell'
import InstallButton from './components/InstallButton'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Nasabah from './pages/Nasabah'
import Pinjaman from './pages/Pinjaman'
import Pembayaran from './pages/Pembayaran'
import Tim from './pages/Tim'
import Approval from './pages/Approval'
import PesanWA from './pages/PesanWA'
import Pengaturan from './pages/Pengaturan'
import Koperasi from './pages/Koperasi'
import TambahNasabah from './pages/TambahNasabah'
import Bukti from './pages/Bukti'
import Produk from './pages/Produk'
import Absensi from './pages/Absensi'
const logo = import.meta.env.BASE_URL + 'logo.png'
const ROLE = { super_admin: 'Super Admin', admin: 'Pemilik', penagih: 'Penagih', nasabah: 'Nasabah' }
const MENU = [
  ['/', 'Beranda', 'home', ['super_admin', 'admin', 'penagih', 'nasabah'], Dashboard],
  ['/koperasi', 'Koperasi', 'koperasi', ['super_admin'], Koperasi],
  ['/nasabah', 'Nasabah', 'nasabah', ['super_admin', 'admin'], Nasabah],
  ['/tambah-nasabah', 'Tambah Nasabah', 'tambah', ['penagih'], TambahNasabah],
  ['/pinjaman', 'Pinjaman', 'pinjaman', ['super_admin', 'admin', 'nasabah'], Pinjaman],
  ['/bukti', 'Bukti Pinjaman', 'bukti', ['super_admin', 'admin', 'penagih'], Bukti],
  ['/pembayaran', 'Pembayaran', 'bayar', ['super_admin', 'admin', 'penagih', 'nasabah'], Pembayaran],
  ['/absensi', 'Absensi', 'absen', ['super_admin', 'admin', 'penagih'], Absensi],
  ['/tim', 'Kelola Tim', 'tim', ['super_admin', 'admin'], Tim],
  ['/persetujuan', 'Persetujuan', 'setuju', ['super_admin', 'admin'], Approval],
  ['/wa', 'Pesan WA', 'wa', ['super_admin', 'admin'], PesanWA],
  ['/pengaturan', 'Pengaturan', 'atur', ['super_admin', 'admin'], Pengaturan],
]
// Navigasi bawah: 2 tab kiri, tombol tengah menonjol, 1 tab kanan, lalu "Lainnya"
const NAV = { admin: { kiri: ['/', '/pinjaman'], tengah: '/absensi', kanan: '/pembayaran' }, super_admin: { kiri: ['/', '/koperasi'], tengah: '/pembayaran', kanan: '/nasabah' },
  penagih: { kiri: ['/', '/pembayaran'], tengah: '/absensi', kanan: '/tambah-nasabah' }, nasabah: { kiri: ['/', '/pinjaman'], tengah: '/pembayaran', kanan: 'notif' } }
const SHORT = { '/': 'Beranda', '/pinjaman': 'Pinjaman', '/pembayaran': 'Bayar', '/absensi': 'Absensi', '/nasabah': 'Nasabah', '/tambah-nasabah': 'Nasabah', '/koperasi': 'Koperasi' }
export default function App() {
  const { profile, koperasi, loading, logout } = useAuth(), nf = useNotif(), [open, setOpen] = useState(false), [dark, toggle] = useTheme(), loc = useLocation(), libur = useLibur()
  const wajib = !!profile && profile.status === 'approved' && ['admin', 'penagih'].includes(profile.role), [sudah, setSudah] = useState(true)
  useEffect(() => { // pengingat absen masuk (tidak memblokir aplikasi)
    const cek = async () => {
      if (!wajib) return setSudah(true)
      const d = new Date(); d.setHours(0, 0, 0, 0)
      const { count, error } = await supabase.from('absensi').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('tipe', 'masuk').gte('waktu', d.toISOString())
      setSudah(error ? true : (count || 0) > 0)
    }
    cek(); const v = () => { if (document.visibilityState === 'visible') cek() }
    window.addEventListener('absen-berubah', cek); document.addEventListener('visibilitychange', v)
    return () => { window.removeEventListener('absen-berubah', cek); document.removeEventListener('visibilitychange', v) }
  }, [wajib, profile?.id])
  useEffect(() => { setOpen(false) }, [loc.pathname])
  if (loading) return <div className="min-h-screen grid place-items-center"><img src={logo} className="w-20 h-20 animate-pulse" /></div>
  if (!profile) return <Routes><Route path="/produk" element={<Produk />} /><Route path="/daftar/:tipe" element={<Register />} /><Route path="*" element={<Login />} /></Routes>
  if (profile.status !== 'approved' && profile.role !== 'super_admin')
    return <div className="min-h-screen grid place-items-center p-6"><div className="card max-w-sm text-center space-y-3 page"><div className="text-5xl">{profile.status === 'rejected' ? '😔' : '⏳'}</div>
      <h1 className="font-extrabold text-lg">{profile.status === 'rejected' ? 'Pendaftaran ditolak' : 'Menunggu persetujuan'}</h1>
      <p className="text-sm text-slate-500">{profile.status === 'rejected' ? 'Hubungi pengelola koperasi untuk info lebih lanjut.' : 'Data Anda sedang dicek admin. Anda bisa masuk setelah disetujui.'}</p><button className="btn2" onClick={logout}>Keluar</button></div></div>
  const items = MENU.filter(m => m[3].includes(profile.role)), nama = koperasi?.nama || 'Koperasi Harian', nav = NAV[profile.role] || NAV.nasabah
  const ada = (to) => items.find(i => i[0] === to), utama = [...nav.kiri, nav.tengah, nav.kanan], menuAktif = !utama.includes(loc.pathname), cur = items.find(i => i[0] === loc.pathname)
  const Tab = ({ to }) => {
    if (to === 'notif') return <button onClick={() => nf.setOpen(true)} className="flex flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] font-semibold text-slate-400"><span className="relative"><Ikon n="bell" />{nf.unread > 0 && <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] grid place-items-center font-bold">{nf.unread}</span>}</span>Notif</button>
    const it = ada(to); if (!it) return <div />
    return <NavLink to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] font-semibold transition ${isActive ? 'text-brand' : 'text-slate-400'}`}>
      {({ isActive }) => <><Ikon n={it[2]} stroke={isActive ? 2.3 : 1.8} />{SHORT[to] || it[1]}</>}</NavLink>
  }
  const tengah = ada(nav.tengah), belumAbsen = wajib && !sudah
  return <div className="min-h-[100dvh] md:flex">
    <aside className="hidden md:flex sticky top-0 h-[100dvh] w-64 shrink-0 bg-ink text-white p-5 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 mb-6"><img src={logo} className="w-11 h-11 rounded-2xl bg-white p-0.5" /><div className="min-w-0"><div className="font-extrabold leading-tight truncate">{nama}</div><div className="text-xs text-white/50 truncate">{profile.nama} · {ROLE[profile.role]}</div></div></div>
      <nav className="space-y-1">{items.map(([to, label, ic]) => <NavLink key={to} to={to} end={to === '/'}
        className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-gradient-to-r from-brand to-fuchsia-500 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}><Ikon n={ic} size={19} />{label}{to === '/absensi' && belumAbsen && <span className="ml-auto w-2 h-2 rounded-full bg-yellow-400" />}</NavLink>)}</nav>
      <div className="mt-auto pt-4 space-y-2"><InstallButton className="w-full rounded-2xl bg-white/10 px-3 py-3 text-sm font-bold" /><NotifBell wide />
        <button onClick={toggle} className="w-full rounded-2xl bg-white/10 px-3 py-3 text-sm font-bold text-left flex items-center gap-2"><Ikon n={dark ? 'sun' : 'moon'} size={18} />{dark ? 'Mode terang' : 'Mode gelap'}</button>
        <button onClick={logout} className="w-full flex items-center gap-2 rounded-2xl bg-rose-500/15 px-3 py-3 text-sm font-bold text-rose-200"><Ikon n="keluar" size={18} />Keluar</button>
        <p className="text-center text-[11px] text-white/40">Versi {APP_VERSION}</p></div>
    </aside>
    <main className="flex-1 min-w-0 pb-28 md:pb-0">
      <header className="md:hidden sticky top-0 z-10 flex items-center justify-between gap-2 bg-white/70 dark:bg-ink/70 backdrop-blur-xl px-4 py-2.5 border-b border-white/40 dark:border-white/10">
        <div className="flex items-center gap-2 min-w-0 flex-1"><img src={logo} className="w-8 h-8 rounded-xl shrink-0" /><span className="font-extrabold text-sm truncate">{cur && cur[0] !== '/' ? cur[1] : nama}</span></div>
        <div className="flex gap-2 shrink-0"><NotifBell /><button className="btn2 !py-2 !px-3" onClick={toggle} aria-label="Ganti tema"><Ikon n={dark ? 'sun' : 'moon'} size={18} /></button><button className="btn2 !py-2 !px-3 !text-rose-500 flex items-center gap-1.5" onClick={logout}><Ikon n="keluar" size={16} />Keluar</button></div></header>
      {libur && <div className="mx-4 md:mx-8 mt-3 flex items-center gap-2 rounded-2xl bg-sky-100 text-sky-900 px-4 py-3 text-sm font-semibold"><Ikon n="jam" size={18} /><span>Hari ini libur ({libur}): tidak ada jatuh tempo dan transaksi.</span></div>}
      {belumAbsen && loc.pathname !== '/absensi' && <Link to="/absensi" className="mx-4 md:mx-8 mt-3 flex items-center gap-3 rounded-2xl bg-yellow-100 text-yellow-900 px-4 py-3 text-sm font-semibold shadow-sm"><Ikon n="absen" size={20} /><span className="flex-1">Kamu belum absen masuk hari ini</span><span className="rounded-full bg-yellow-500 text-white px-3 py-1 text-xs font-bold">Absen sekarang</span></Link>}
      <div key={loc.pathname} className="page p-4 md:p-8 max-w-5xl mx-auto"><Routes>{items.map(([to, , , , El]) => <Route key={to} path={to} element={<El />} />)}<Route path="*" element={<Navigate to="/" />} /></Routes></div></main>
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-ink/95 backdrop-blur-xl border-t border-slate-200/70 dark:border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-5 items-end h-16 max-w-md mx-auto">
        <Tab to={nav.kiri[0]} /><Tab to={nav.kiri[1]} />
        {tengah ? <NavLink to={tengah[0]} className="flex flex-col items-center gap-0.5 pb-1 text-[10px] font-semibold text-brand">{({ isActive }) => <>
          <span className={`relative -mt-7 w-14 h-14 rounded-full grid place-items-center text-white bg-gradient-to-br from-brand to-fuchsia-500 shadow-lg shadow-brand/40 ring-4 ring-white dark:ring-ink transition ${isActive ? 'scale-105' : ''}`}><Ikon n={tengah[2]} size={26} stroke={2} />{tengah[0] === '/absensi' && belumAbsen && <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-yellow-400 ring-2 ring-white dark:ring-ink" />}</span>{SHORT[tengah[0]]}</>}</NavLink> : <div />}
        <Tab to={nav.kanan} />
        <button onClick={() => setOpen(true)} className={`flex flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] font-semibold transition ${menuAktif || open ? 'text-brand' : 'text-slate-400'}`}><Ikon n={menuAktif && cur ? cur[2] : 'menu'} stroke={menuAktif || open ? 2.3 : 1.8} />{menuAktif && cur ? cur[1].split(' ')[0] : 'Lainnya'}</button></div></nav>
    {open && <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end" onClick={() => setOpen(false)}>
      <div className="sheet w-full max-h-[85dvh] overflow-y-auto bg-white rounded-t-[32px] p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3"><img src={logo} className="w-12 h-12 rounded-2xl" /><div className="min-w-0"><b className="block truncate">{nama}</b><div className="text-xs text-slate-500">{profile.nama} · {ROLE[profile.role]}</div></div></div>
        <div className="grid grid-cols-4 gap-2">{items.map(([to, label, ic]) => <NavLink key={to} to={to} end={to === '/'} className="flex flex-col items-center gap-1.5 p-1 text-[11px] font-semibold text-center">
          {({ isActive }) => <><span className={`relative w-12 h-12 grid place-items-center rounded-2xl transition ${isActive ? 'bg-gradient-to-br from-brand to-fuchsia-500 text-white shadow-md' : 'bg-brand-soft text-brand-dark'}`}><Ikon n={ic} size={22} />{to === '/absensi' && belumAbsen && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400" />}</span><span className={isActive ? 'text-brand-dark' : ''}>{label}</span></>}</NavLink>)}</div>
        <InstallButton className="btn2 w-full" />
        <div className="grid grid-cols-2 gap-2"><button className="btn2 flex items-center justify-center gap-2" onClick={toggle}><Ikon n={dark ? 'sun' : 'moon'} size={17} />{dark ? 'Terang' : 'Gelap'}</button><button className="btn2 !text-rose-500 flex items-center justify-center gap-2" onClick={logout}><Ikon n="keluar" size={17} />Keluar</button></div>
        <p className="text-center text-[11px] text-slate-400">Versi {APP_VERSION}</p></div></div>}</div>
}
