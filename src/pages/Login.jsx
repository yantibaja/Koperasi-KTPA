import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { emailOrHp } from '../lib/utils'
export default function Login() {
  const [id, setId] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState('')
  const go = async () => {
    const { error } = await supabase.auth.signInWithPassword({ ...emailOrHp(id), password: pw })
    if (error) setErr('Email/No HP atau password salah')
  }
  return <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-ink to-[#16436b]">
    <div className="card w-full max-w-sm space-y-3">
      <h1 className="text-2xl font-extrabold">Masuk</h1>
      <div><label className="lbl">Email atau No HP</label><input className="inp" value={id} onChange={e => setId(e.target.value)} /></div>
      <div><label className="lbl">Password</label><input type="password" className="inp" value={pw} onChange={e => setPw(e.target.value)} /></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn w-full" onClick={go}>Masuk</button>
      <div className="text-sm text-center space-y-1 text-slate-500">
        <div>Belum punya akun?</div>
        <div className="flex justify-center gap-3 font-bold text-brand"><Link to="/daftar/nasabah">Nasabah</Link><Link to="/daftar/penagih">Penagih</Link><Link to="/daftar/admin">Koperasi baru</Link></div>
      </div></div></div>
}
