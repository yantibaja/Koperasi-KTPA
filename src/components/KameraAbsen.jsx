import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { kodeFoto, ambilLokasi, alamatDari, buatPeta, gambarWM, fmtJam, fmtTanggal, fmtHari, AKSI } from '../lib/absen'
export default function KameraAbsen({ tipe, catatan, onSelesai, onBatal }) {
  const { profile, koperasi } = useAuth(), toast = useToast()
  const vref = useRef(), cref = useRef(), dref = useRef(), logo = useRef(null)
  const [facing, setFacing] = useState('user'), [err, setErr] = useState(''), [loc, setLoc] = useState(null), [alamat, setAlamat] = useState(''), [peta, setPeta] = useState(null), [geo, setGeo] = useState(false), [kode, setKode] = useState(kodeFoto), [kamera, setKamera] = useState(false), [hasil, setHasil] = useState(null), [busy, setBusy] = useState(false), [ulang, setUlang] = useState(0)
  useEffect(() => { setErr(''); setGeo(false)
    ambilLokasi().then(async l => { setLoc(l); const [a, p] = await Promise.all([alamatDari(l.lat, l.lng), buatPeta(l.lat, l.lng)]); setAlamat(a); setPeta(p); setGeo(true) }).catch(e => setErr(e.message)) }, [ulang])
  useEffect(() => { const im = new Image(); im.onload = () => { logo.current = im }; im.src = import.meta.env.BASE_URL + 'logo.png' }, [])
  useEffect(() => {
    let stream, mati = false; setKamera(false)
    if (!navigator.mediaDevices?.getUserMedia) { setErr('Browser ini tidak mendukung kamera.'); return }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then(s => { if (mati) return s.getTracks().forEach(t => t.stop()); stream = s; vref.current.srcObject = s; vref.current.play().catch(() => {}); setKamera(true) })
      .catch(() => setErr('Kamera tidak bisa dibuka. Izinkan akses kamera untuk situs ini, lalu coba lagi.'))
    return () => { mati = true; stream?.getTracks().forEach(t => t.stop()) }
  }, [facing, ulang])
  dref.current = () => ({ jam: fmtJam(), tanggal: fmtTanggal(), hari: fmtHari(), alamat: alamat || (loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : 'Mencari lokasi…'), koperasi: koperasi?.nama || 'Koperasi', nama: profile.nama || '', kegiatan: AKSI[tipe].label + (catatan ? ` · ${catatan}` : ''), kode, peta, logo: logo.current })
  useEffect(() => {
    if (hasil) return; let raf
    const loop = () => { const v = vref.current, c = cref.current
      if (v && c && v.videoWidth) { const sc = Math.min(1, 1280 / v.videoWidth), W = Math.round(v.videoWidth * sc), H = Math.round(v.videoHeight * sc); if (c.width !== W) c.width = W; if (c.height !== H) c.height = H; const g = c.getContext('2d'); g.drawImage(v, 0, 0, W, H); gambarWM(g, W, H, dref.current()) }
      raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf)
  }, [hasil])
  const siap = kamera && loc && geo && !err
  const ambil = () => cref.current.toBlob(b => { navigator.vibrate?.(30); setHasil({ blob: b, url: URL.createObjectURL(b) }) }, 'image/jpeg', 0.85)
  const simpan = async () => {
    setBusy(true)
    try {
      const path = `${profile.id}/${new Date().toISOString().slice(0, 10)}-${tipe}-${kode}.jpg`
      const { error: e1 } = await supabase.storage.from('absensi').upload(path, hasil.blob, { contentType: 'image/jpeg' }); if (e1) throw e1
      const { error: e2 } = await supabase.from('absensi').insert({ koperasi_id: profile.koperasi_id, user_id: profile.id, tipe, lat: loc.lat, lng: loc.lng, akurasi: loc.akurasi, alamat, foto_path: path, kode_foto: kode, catatan: catatan || null }); if (e2) throw e2
      toast.success(`${AKSI[tipe].label} berhasil ✅`, `${fmtJam()} · ${alamat || 'lokasi tersimpan'}`); onSelesai?.()
    } catch (e) { toast.error('Absen gagal', e.message) } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[80] bg-black text-white flex flex-col">
    <div className="flex items-center justify-between p-3"><button className="rounded-full bg-white/15 w-10 h-10 text-lg" onClick={onBatal}>✕</button><b>{AKSI[tipe].label}</b>
      <button className="rounded-full bg-white/15 w-10 h-10 text-lg disabled:opacity-40" disabled={!!hasil} onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>🔄</button></div>
    <div className="flex gap-2 px-3 pb-2 text-[11px] font-bold"><span className={`rounded-full px-3 py-1 ${loc ? 'bg-emerald-500/30' : 'bg-white/15'}`}>{loc ? `📍 Lokasi ±${Math.round(loc.akurasi)} m` : '📍 Mencari lokasi…'}</span><span className={`rounded-full px-3 py-1 ${kamera ? 'bg-emerald-500/30' : 'bg-white/15'}`}>{kamera ? '📷 Kamera siap' : '📷 Membuka kamera…'}</span></div>
    <div className="flex-1 min-h-0 grid place-items-center px-2"><video ref={vref} playsInline muted className="hidden" />
      {hasil ? <img src={hasil.url} className="max-h-full max-w-full rounded-2xl" /> : <canvas ref={cref} className="max-h-full max-w-full rounded-2xl bg-neutral-900" />}</div>
    {err && <div className="m-3 rounded-2xl bg-rose-500/20 p-3 text-sm"><p>{err}</p><button className="mt-2 rounded-xl bg-white/20 px-4 py-2 font-bold" onClick={() => setUlang(ulang + 1)}>Coba lagi</button></div>}
    <div className="p-4 flex items-center justify-center gap-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {hasil ? <><button className="rounded-2xl bg-white/15 px-6 py-3 font-bold" disabled={busy} onClick={() => { setHasil(null); setKode(kodeFoto()) }}>Ulangi</button><button className="btn" disabled={busy} onClick={simpan}>{busy ? 'Menyimpan…' : 'Gunakan foto'}</button></>
        : <button disabled={!siap} onClick={ambil} className="w-20 h-20 rounded-full border-4 border-white bg-white/20 disabled:opacity-30 active:scale-90 transition" aria-label="Ambil foto"><span className="block w-14 h-14 rounded-full bg-white mx-auto" /></button>}
    </div></div>
}
