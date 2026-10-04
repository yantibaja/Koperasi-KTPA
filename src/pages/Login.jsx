import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { emailOrHp } from '../lib/utils'
import { useToast } from '../lib/toast'
const logo = import.meta.env.BASE_URL + 'logo.png'
const OPS = [['nasabah', '🙋', 'Nasabah', 'Ajukan & bayar pinjaman', 'from-teal-500 to-emerald-500'], ['penagih', '🧾', 'Penagih', 'Tagih & catat pembayaran', 'from-amber-400 to-orange-500'], ['admin', '🏢', 'Koperasi Baru', 'Daftarkan koperasi Anda', 'from-indigo-500 to-blue-600']]
export default function Login() {
  const toast = useToast(), [id, setId] = useState(''), [pw, setPw] = useState(''), [busy, setBusy] = useState(false)
  const go = async () => {
    if (!id.trim() || !pw) return toast.info('Lengkapi data', 'Isi email/No HP dan password.')
    setBusy(true); const { error } = await supabase.auth.signInWithPassword({ ...emailOrHp(id.trim()), password: pw }); setBusy(false)
    if (error) toast.error('Gagal masuk', 'Email/No HP atau password salah.')
  }
  return <div className="min-h-screen grid place-items-center p-5 bg-gradient-to-b from-ink to-[#16436b]"><div className="w-full max-w-sm space-y-4">
    <div className="text-center text-white"><img src={logo} className="w-24 h-24 mx-auto rounded-3xl bg-white p-1 shadow-xl" /><h1 className="text-2xl font-extrabold mt-3">Koperasi Harian</h1><p className="text-sm text-white/60">Simpan pinjam yang simpel</p></div>
    <div className="card space-y-3"><h2 className="text-lg font-extrabold">Masuk</h2>
      <input className="inp" placeholder="Email atau No HP" value={id} onChange={e => setId(e.target.value)} />
      <input type="password" className="inp" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
      <button className="btn w-full" disabled={busy} onClick={go}>{busy ? 'Memproses…' : 'Masuk'}</button></div>
    <p className="text-center text-xs text-white/60">Belum punya akun? Daftar sebagai:</p>
    <div className="space-y-2">{OPS.map(([t, ic, n, d, c]) => <Link key={t} to={`/daftar/${t}`} className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r ${c} text-white p-3 shadow-lg active:scale-95 transition`}>
      <span className="text-2xl bg-white/20 rounded-xl w-11 h-11 grid place-items-center">{ic}</span><span className="flex-1"><b className="block">{n}</b><span className="text-xs text-white/80">{d}</span></span><span>›</span></Link>)}</div></div></div>
}
