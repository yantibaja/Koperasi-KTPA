import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { emailOrHp } from '../lib/utils'
import { useToast } from '../lib/toast'
import { useTheme } from '../lib/theme'
import { APP_VERSION } from '../lib/version'
import InstallButton from '../components/InstallButton'
const logo = import.meta.env.BASE_URL + 'logo.png'
const OPS = [['nasabah', '🙋', 'Nasabah', 'Ajukan & bayar pinjaman', 'from-emerald-400 to-teal-500'], ['penagih', '🧾', 'Penagih', 'Tagih & catat pembayaran', 'from-amber-400 to-orange-500'], ['admin', '🏢', 'Koperasi Baru', 'Daftarkan koperasi Anda', 'from-violet-500 to-indigo-600']]
export default function Login() {
  const toast = useToast(), [dark, toggle] = useTheme(), [id, setId] = useState(''), [pw, setPw] = useState(''), [busy, setBusy] = useState(false)
  const go = async () => {
    if (!id.trim() || !pw) return toast.info('Lengkapi data', 'Isi email/No HP dan password.')
    setBusy(true); const { error } = await supabase.auth.signInWithPassword({ ...emailOrHp(id.trim()), password: pw }); setBusy(false)
    if (error) toast.error('Gagal masuk', 'Email/No HP atau password salah.')
  }
  return <div className="relative min-h-screen grid place-items-center p-5 overflow-hidden" style={{ background: 'linear-gradient(160deg,#1b1450,#3b1d7a 55%,#7a2a9a)' }}>
    <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-fuchsia-500/30 blur-3xl" /><div className="absolute bottom-0 -right-16 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl" />
    <button onClick={toggle} className="absolute top-4 right-4 z-10 rounded-full bg-white/15 backdrop-blur w-10 h-10 text-lg">{dark ? '☀️' : '🌙'}</button>
    <div className="relative w-full max-w-sm space-y-4 page">
      <div className="text-center text-white"><img src={logo} className="w-24 h-24 mx-auto rounded-[28px] bg-white p-1 shadow-2xl" /><h1 className="text-3xl font-extrabold mt-3 tracking-tight">Koperasi Harian</h1><p className="text-sm text-white/70">Simpan pinjam yang simpel ✨</p></div>
      <div className="card space-y-3"><h2 className="text-lg font-extrabold">Masuk 👋</h2>
        <input className="inp" placeholder="Email atau No HP" value={id} onChange={e => setId(e.target.value)} />
        <input type="password" className="inp" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
        <button className="btn w-full" disabled={busy} onClick={go}>{busy ? 'Memproses…' : 'Masuk'}</button></div>
      <p className="text-center text-xs text-white/70">Belum punya akun? Daftar sebagai:</p>
      <div className="space-y-2">{OPS.map(([t, ic, n, d, c]) => <Link key={t} to={`/daftar/${t}`} className={`flex items-center gap-3 rounded-3xl bg-gradient-to-r ${c} text-white p-3 shadow-xl active:scale-95 hover:-translate-y-0.5 transition`}>
        <span className="text-2xl bg-white/25 rounded-2xl w-12 h-12 grid place-items-center">{ic}</span><span className="flex-1"><b className="block">{n}</b><span className="text-xs text-white/85">{d}</span></span><span className="text-lg">›</span></Link>)}</div>
      <InstallButton className="w-full rounded-2xl bg-white/15 backdrop-blur text-white font-bold py-3 text-sm" />
      <Link to="/produk" className="block text-center text-sm text-white underline">Lihat produk & harga</Link>
      <p className="text-center text-[11px] text-white/50">Versi {APP_VERSION}</p></div></div>
}
