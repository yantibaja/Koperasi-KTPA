import { useState } from 'react'
import { useAuth } from '../lib/auth'
import KameraAbsen from './KameraAbsen'
export default function AbsenGate({ onDone }) {
  const { profile, koperasi, logout } = useAuth(), [buka, setBuka] = useState(true)
  return <div className="min-h-screen grid place-items-center p-6" style={{ background: 'linear-gradient(160deg,#1b1450,#3b1d7a 55%,#7a2a9a)' }}>
    <div className="card max-w-sm w-full text-center space-y-3 page"><div className="text-5xl">📸</div><h1 className="text-xl font-extrabold">Absen masuk dulu ya</h1>
      <p className="text-sm text-slate-500">Halo {profile.nama}, absensi wajib untuk {profile.role === 'admin' ? 'pemilik' : 'penagih'} {koperasi?.nama}. Kamera terbuka langsung dengan watermark jam, lokasi, nama, dan peta.</p>
      <button className="btn w-full" onClick={() => setBuka(true)}>Buka kamera & absen</button><button className="btn2 w-full !text-rose-500" onClick={logout}>Keluar</button></div>
    {buka && <KameraAbsen tipe="masuk" onSelesai={onDone} onBatal={() => setBuka(false)} />}</div>
}
