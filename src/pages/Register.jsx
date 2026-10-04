import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import FormDaftar from '../components/FormDaftar'
const logo = import.meta.env.BASE_URL + 'logo.png'
const T = { nasabah: ['Daftar Nasabah', 'Data & foto Anda akan dicek admin koperasi.'], penagih: ['Daftar Penagih', 'Dokumen Anda akan dicek admin koperasi.'], admin: ['Daftar Koperasi Baru', 'Koperasi langsung aktif, kode unik ada di menu Pengaturan.'] }
export default function Register() {
  const { tipe } = useParams(), [done, setDone] = useState(false), [t, s] = [T[tipe] || T.nasabah, 0]
  if (done) return <div className="min-h-screen grid place-items-center p-6"><div className="card max-w-sm text-center space-y-3"><div className="text-5xl">🎉</div><h1 className="font-extrabold text-lg">Pendaftaran terkirim</h1>
    <p className="text-sm text-slate-500">{tipe === 'admin' ? 'Silakan masuk. Kode koperasi ada di menu Pengaturan.' : 'Menunggu persetujuan admin. Anda bisa masuk setelah disetujui.'}</p><Link className="btn inline-block" to="/">Ke halaman masuk</Link></div></div>
  return <div className="min-h-screen p-4 flex justify-center"><div className="w-full max-w-lg space-y-3">
    <Link to="/" className="text-sm text-slate-500">← Kembali</Link>
    <div className="flex items-center gap-3"><img src={logo} className="w-12 h-12 rounded-2xl" /><div><h1 className="text-xl font-extrabold">{t[0]}</h1><p className="text-xs text-slate-500">{t[1]}</p></div></div>
    <div className="card"><FormDaftar role={tipe} onDone={() => setDone(true)} /></div></div></div>
}
