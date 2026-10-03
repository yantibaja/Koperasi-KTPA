import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './lib/auth'
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

const MENU = [
  ['/', 'Dashboard', ['super_admin', 'admin', 'penagih', 'nasabah'], Dashboard],
  ['/koperasi', 'Koperasi', ['super_admin'], Koperasi],
  ['/nasabah', 'Nasabah', ['super_admin', 'admin'], Nasabah],
  ['/pinjaman', 'Pinjaman', ['super_admin', 'admin', 'nasabah'], Pinjaman],
  ['/pembayaran', 'Pembayaran', ['super_admin', 'admin', 'penagih', 'nasabah'], Pembayaran],
  ['/tim', 'Kelola Tim', ['super_admin', 'admin'], Tim],
  ['/persetujuan', 'Persetujuan', ['super_admin', 'admin'], Approval],
  ['/wa', 'Pesan WA', ['super_admin', 'admin'], PesanWA],
  ['/pengaturan', 'Pengaturan', ['super_admin', 'admin'], Pengaturan],
]

export default function App() {
  const { profile, koperasi, loading, logout } = useAuth()
  const [open, setOpen] = useState(false)
  if (loading) return <p className="p-8 text-center text-slate-500">Memuat…</p>
  if (!profile) return <Routes><Route path="/daftar/:tipe" element={<Register />} /><Route path="*" element={<Login />} /></Routes>
  if (profile.status !== 'approved' && profile.role !== 'super_admin')
    return <div className="min-h-screen grid place-items-center p-6"><div className="card max-w-sm text-center space-y-3">
      <h1 className="font-extrabold text-lg">{profile.status === 'rejected' ? 'Pendaftaran ditolak' : 'Menunggu persetujuan'}</h1>
      <p className="text-sm text-slate-500">{profile.status === 'rejected' ? 'Hubungi pengelola koperasi untuk info lebih lanjut.' : 'Akun Anda sedang ditinjau. Anda bisa masuk setelah disetujui.'}</p>
      <button className="btn2" onClick={logout}>Keluar</button></div></div>
  const items = MENU.filter(m => m[2].includes(profile.role))
  return (
    <div className="min-h-screen md:flex">
      <aside className={`${open ? 'block' : 'hidden'} md:block fixed md:sticky top-0 z-20 h-screen w-64 bg-ink text-white p-5 flex flex-col`}>
        <div className="font-extrabold text-lg mb-6">{koperasi?.nama || 'Koperasi'}</div>
        <nav className="space-y-1 flex-1">{items.map(([to, label]) =>
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
            className={({ isActive }) => `block rounded-xl px-3 py-2.5 text-sm font-bold ${isActive ? 'bg-brand' : 'text-white/70 hover:bg-white/10'}`}>{label}</NavLink>)}</nav>
        <button onClick={logout} className="text-left text-sm text-white/60">Keluar · {profile.nama}</button>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full">
        <button className="md:hidden btn2 mb-4" onClick={() => setOpen(!open)}>Menu</button>
        <Routes>{items.map(([to, , , El]) => <Route key={to} path={to} element={<El />} />)}<Route path="*" element={<Navigate to="/" />} /></Routes>
      </main>
    </div>)
}
