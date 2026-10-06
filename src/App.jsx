import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './lib/auth'
import { useTheme } from './lib/theme'
import { APP_VERSION } from './lib/version'
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
import InstallButton from './components/InstallButton'
const logo = import.meta.env.BASE_URL + 'logo.png'
const MENU = [
  ['/', 'Dashboard', '🏠', ['super_admin', 'admin', 'penagih', 'nasabah'], Dashboard],
  ['/koperasi', 'Koperasi', '🏢', ['super_admin'], Koperasi],
  ['/nasabah', 'Nasabah', '👥', ['super_admin', 'admin'], Nasabah],
  ['/tambah-nasabah', 'Tambah Nasabah', '➕', ['penagih'], TambahNasabah],
  ['/pinjaman', 'Pinjaman', '💰', ['super_admin', 'admin', 'nasabah'], Pinjaman],
  ['/bukti', 'Bukti Pinjaman', '🧾', ['super_admin', 'admin', 'penagih'], Bukti],
  ['/pembayaran', 'Pembayaran', '💳', ['super_admin', 'admin', 'penagih', 'nasabah'], Pembayaran],
  ['/tim', 'Kelola Tim', '🧑‍💼', ['super_admin', 'admin'], Tim],
  ['/persetujuan', 'Persetujuan', '✅', ['super_admin', 'admin'], Approval],
  ['/wa', 'Pesan WA', '💬', ['super_admin', 'admin'], PesanWA],
  ['/pengaturan', 'Pengaturan', '⚙️', ['super_admin', 'admin'], Pengaturan],
]
const FAV = ['/', '/nasabah', '/pinjaman', '/pembayaran', '/tambah-nasabah', '/koperasi', '/bukti']
export default function App() {
  const { profile, koperasi, loading, logout } = useAuth(), [open, setOpen] = useState(false), [dark, toggle] = useTheme(), loc = useLocation()
  if (loading) return <div className="min-h-screen grid place-items-center"><img src={logo} className="w-20 h-20 animate-pulse" /></div>
  if (!profile) return <Routes><Route path="/produk" element={<Produk />} /><Route path="/daftar/:tipe" element={<Register />} /><Route path="*" element={<Login />} /></Routes>
  if (profile.status !== 'approved' && profile.role !== 'super_admin')
    return <div className="min-h-screen grid place-items-center p-6"><div className="card max-w-sm text-center space-y-3 page"><div className="text-5xl">{profile.status === 'rejected' ? '😔' : '⏳'}</div>
      <h1 className="font-extrabold text-lg">{profile.status === 'rejected' ? 'Pendaftaran ditolak' : 'Menunggu persetujuan'}</h1>
      <p className="text-sm text-slate-500">{profile.status === 'rejected' ? 'Hubungi pengelola koperasi untuk info lebih lanjut.' : 'Data Anda sedang dicek admin. Anda bisa masuk setelah disetujui.'}</p><button className="btn2" onClick={logout}>Keluar</button></div></div>
  const items = MENU.filter(m => m[3].includes(profile.role)), nama = koperasi?.nama || 'Koperasi Harian'
  return <div className="min-h-[100dvh] md:flex">
    {open && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setOpen(false)} />}
    <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-out fixed md:sticky top-0 z-40 h-[100dvh] w-72 md:w-64 shrink-0 bg-ink text-white p-5 flex flex-col overflow-y-auto rounded-r-[32px] md:rounded-none`}>
      <div className="flex items-center gap-3 mb-6"><img src={logo} className="w-11 h-11 rounded-2xl bg-white p-0.5" /><div className="min-w-0"><div className="font-extrabold leading-tight truncate">{nama}</div><div className="text-xs text-white/50 truncate">{profile.nama}</div></div></div>
      <nav className="space-y-1">{items.map(([to, label, ic]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
        className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-gradient-to-r from-brand to-fuchsia-500 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}><span>{ic}</span>{label}</NavLink>)}</nav>
      <div className="mt-auto pt-4 space-y-2"><InstallButton className="w-full rounded-2xl bg-white/10 px-3 py-3 text-sm font-bold" />
        <button onClick={toggle} className="w-full rounded-2xl bg-white/10 px-3 py-3 text-sm font-bold text-left">{dark ? '☀️ Mode terang' : '🌙 Mode gelap'}</button>
        <button onClick={logout} className="w-full flex items-center gap-3 rounded-2xl bg-rose-500/15 px-3 py-3 text-sm font-bold text-rose-200">🚪 Keluar</button>
        <p className="text-center text-[11px] text-white/40">Versi {APP_VERSION}</p></div>
    </aside>
    <main className="flex-1 min-w-0 pb-28 md:pb-0">
      <header className="md:hidden sticky top-0 z-10 flex items-center justify-between gap-2 bg-white/70 dark:bg-ink/70 backdrop-blur-xl px-4 py-2.5 border-b border-white/40 dark:border-white/10">
        <div className="flex items-center gap-2 min-w-0"><img src={logo} className="w-8 h-8 rounded-xl" /><span className="font-extrabold text-sm truncate">{nama}</span></div>
        <div className="flex gap-2"><button className="btn2 !py-1.5 !px-3" onClick={toggle}>{dark ? '☀️' : '🌙'}</button><button className="btn2 !py-1.5 !px-3 !text-rose-500" onClick={logout}>Keluar</button></div></header>
      <div key={loc.pathname} className="page p-4 md:p-8 max-w-5xl"><Routes>{items.map(([to, , , , El]) => <Route key={to} path={to} element={<El />} />)}<Route path="*" element={<Navigate to="/" />} /></Routes></div></main>
    <nav className="md:hidden fixed bottom-3 inset-x-3 z-20 rounded-[28px] bg-ink/90 backdrop-blur-xl text-white flex gap-1 p-2 shadow-2xl shadow-black/30">
      {items.slice(0, 4).map(([to, label, ic]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-bold transition ${isActive ? 'bg-gradient-to-br from-brand to-fuchsia-500 shadow-lg' : 'text-white/60'}`}><span className="text-lg leading-none">{ic}</span><span className="truncate max-w-full px-1">{label.split(' ')[0]}</span></NavLink>)}
      <button onClick={() => setOpen(true)} className="flex-1 flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-bold text-white/60"><span className="text-lg leading-none">☰</span>Menu</button></nav></div>
}
