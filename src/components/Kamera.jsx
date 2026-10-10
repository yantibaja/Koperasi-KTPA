import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { buatKode, gambarWM, muatGambar, muatPeta, alamatDari, tanggalISO } from '../lib/wm'
const BASE = import.meta.env.BASE_URL
export default function Kamera({ jenis, onClose, onSaved }) {
  const { profile, koperasi } = useAuth(), toast = useToast()
  const vid = useRef(), cv = useRef(), raf = useRef(), strm = useRef(), fi = useRef(), D = useRef({ offset: 0, alamat: 'Mencari lokasi…', peta: null, logo: null, kode: buatKode(), lokasi: false })
  const [hadap, setHadap] = useState('user'), [pos, setPos] = useState(null), [err, setErr] = useState(''), [hasil, setHasil] = useState(null), [busy, setBusy] = useState(false), [siap, setSiap] = useState(false), [fallback, setFallback] = useState(false)
  const wmData = () => ({ ...D.current, waktu: new Date(Date.now() + D.current.offset), koperasi: koperasi?.nama || '', nama: profile.nama || '', jenis })
  useEffect(() => { // jam server, logo, lokasi
    supabase.rpc('waktu_server').then(({ data }) => { if (data) D.current.offset = new Date(data) - Date.now() })
    muatGambar(koperasi?.logo_url || BASE + 'logo.png').catch(() => muatGambar(BASE + 'logo.png')).then(i => { D.current.logo = i }).catch(() => {})
    if (!navigator.geolocation) { setErr('Perangkat tidak mendukung lokasi.'); return }
    const id = navigator.geolocation.watchPosition(p => {
      const { latitude: lat, longitude: lng, accuracy } = p.coords
      if (!D.current.lokasi) { D.current.lokasi = true; alamatDari(lat, lng).then(a => { D.current.alamat = a }); muatPeta(lat, lng).then(c => { D.current.peta = c }) }
      setPos({ lat, lng, akurasi: accuracy }); setErr('')
    }, e => setErr(e.code === 1 ? 'Izin lokasi ditolak. Aktifkan lokasi untuk absensi.' : 'Lokasi belum didapat. Pastikan GPS aktif.'), { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 })
    return () => navigator.geolocation.clearWatch(id)
  }, [])
  useEffect(() => { // kamera langsung terbuka + pratinjau watermark
    if (hasil) return; let hidup = true
    ;(async () => {
      try {
        strm.current?.getTracks().forEach(t => t.stop())
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: hadap, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
        if (!hidup) return s.getTracks().forEach(t => t.stop())
        strm.current = s; vid.current.srcObject = s; await vid.current.play()
        const vw = vid.current.videoWidth, vh = vid.current.videoHeight, k = Math.min(1, 1280 / Math.max(vw, vh)); cv.current.width = Math.round(vw * k); cv.current.height = Math.round(vh * k); setSiap(true)
        const loop = () => { const g = cv.current.getContext('2d'), W = cv.current.width, H = cv.current.height; g.drawImage(vid.current, 0, 0, W, H); gambarWM(g, W, H, wmData()); raf.current = requestAnimationFrame(loop) }
        loop()
      } catch { setFallback(true); setErr('Kamera tidak bisa dibuka. Izinkan akses kamera, atau pakai kamera bawaan.') }
    })()
    return () => { hidup = false; cancelAnimationFrame(raf.current) }
  }, [hadap, hasil])
  useEffect(() => () => { cancelAnimationFrame(raf.current); strm.current?.getTracks().forEach(t => t.stop()) }, [])
  const ambil = () => { cancelAnimationFrame(raf.current); cv.current.toBlob(b => setHasil({ blob: b, url: URL.createObjectURL(b) }), 'image/jpeg', 0.85) }
  const ulang = () => { D.current.kode = buatKode(); setHasil(null) }
  const dariFile = async (e) => { // cadangan bila kamera langsung tidak tersedia
    const f = e.target.files[0]; if (!f) return
    const im = await muatGambar(URL.createObjectURL(f)), k = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight)); cv.current.width = Math.round(im.naturalWidth * k); cv.current.height = Math.round(im.naturalHeight * k)
    const g = cv.current.getContext('2d'); g.drawImage(im, 0, 0, cv.current.width, cv.current.height); gambarWM(g, cv.current.width, cv.current.height, wmData()); ambil()
  }
  const simpan = async () => {
    setBusy(true)
    try {
      const path = `${profile.id}/${tanggalISO()}-${jenis}-${D.current.kode}.jpg`
      const { error: e1 } = await supabase.storage.from('absensi').upload(path, hasil.blob, { contentType: 'image/jpeg' }); if (e1) throw e1
      const { error: e2 } = await supabase.from('absensi').insert({ koperasi_id: profile.koperasi_id, user_id: profile.id, jenis, lat: pos.lat, lng: pos.lng, akurasi: pos.akurasi, alamat: D.current.alamat, foto: path, kode_foto: D.current.kode }); if (e2) throw e2
      toast.success(jenis === 'masuk' ? 'Absen masuk berhasil ✅' : 'Absen pulang berhasil 🏁', D.current.alamat); onSaved?.()
    } catch (e) { const m = e.message || ''; toast.error('Absensi gagal', /duplicate|unique/i.test(m) ? `Anda sudah absen ${jenis} hari ini.` : m) } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[80] bg-black flex flex-col">
    <video ref={vid} playsInline muted className="absolute w-px h-px opacity-0 pointer-events-none" />
    <div className="flex items-center justify-between p-3 text-white"><button onClick={onClose} className="rounded-full bg-white/15 w-10 h-10">✕</button><b className="text-sm">{jenis === 'masuk' ? '📸 Absen Masuk' : '🏁 Absen Pulang'}</b><button onClick={() => setHadap(hadap === 'user' ? 'environment' : 'user')} className="rounded-full bg-white/15 w-10 h-10">🔄</button></div>
    <div className="flex-1 min-h-0 grid place-items-center relative">
      <canvas ref={cv} className="max-w-full max-h-full" style={{ display: hasil ? 'none' : 'block' }} />
      {hasil && <img src={hasil.url} className="max-w-full max-h-full" />}
      {err && <div className="absolute inset-x-4 top-3 rounded-2xl bg-rose-500 text-white text-sm p-3">{err}</div>}
      {!pos && !err && <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 text-white text-xs px-3 py-1.5">📍 Mencari lokasi…</div>}
    </div>
    <div className="p-4 flex items-center justify-center gap-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {hasil ? <><button className="btn2 flex-1" onClick={ulang}>Ulangi</button><button className="btn flex-1" disabled={busy} onClick={simpan}>{busy ? 'Menyimpan…' : 'Gunakan foto ✓'}</button></>
        : fallback ? <><button className="btn w-full" disabled={!pos} onClick={() => fi.current.click()}>📷 Buka kamera bawaan</button><input ref={fi} type="file" accept="image/*" capture="user" hidden onChange={dariFile} /></>
        : <button onClick={ambil} disabled={!siap || !pos} aria-label="Ambil foto" className="w-20 h-20 rounded-full border-4 border-white bg-white/25 active:scale-90 transition disabled:opacity-40" />}
    </div></div>
}
