// Pembantu absensi: kode foto, lokasi, alamat, peta mini, dan watermark pada foto
export const kodeFoto = () => { const a = new Uint8Array(14); crypto.getRandomValues(a); return Array.from(a, x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('') }
export const ambilLokasi = () => new Promise((res, rej) => {
  if (!navigator.geolocation) return rej(new Error('Perangkat tidak mendukung lokasi.'))
  navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy }),
    e => rej(new Error(e.code === 1 ? 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini, lalu coba lagi.' : 'Lokasi tidak ditemukan. Pastikan GPS aktif.')), { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 })
})
export async function alamatDari(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=id`), j = await r.json(), a = j.address || {}
    const b = [a.road, a.village || a.suburb || a.neighbourhood, a.city_district || a.county, a.city || a.town || a.municipality, a.state].filter(Boolean)
    return b.length ? b.join(', ') : (j.display_name || '')
  } catch { return '' }
}
export async function buatPeta(lat, lng, size = 320, z = 17) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, size, size)
  const n = 2 ** z, rad = lat * Math.PI / 180, x = (lng + 180) / 360 * n * 256, y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n * 256, ox = x - size / 2, oy = y - size / 2, tugas = []
  for (let tx = Math.floor(ox / 256); tx <= Math.floor((ox + size) / 256); tx++) for (let ty = Math.floor(oy / 256); ty <= Math.floor((oy + size) / 256); ty++)
    tugas.push(new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { g.drawImage(im, tx * 256 - ox, ty * 256 - oy); res() }; im.onerror = res; im.src = `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png` }))
  await Promise.all(tugas)
  const m = size / 2; g.fillStyle = '#2563eb'; g.beginPath(); g.arc(m, m - 20, 17, 0, 7); g.fill(); g.beginPath(); g.moveTo(m - 11, m - 9); g.lineTo(m + 11, m - 9); g.lineTo(m, m + 9); g.fill()
  g.fillStyle = '#fff'; g.beginPath(); g.arc(m, m - 20, 6, 0, 7); g.fill(); return c
}
const bungkus = (g, t, maxW) => { const k = String(t).split(' '), out = []; let b = ''; for (const w of k) { const c = b ? b + ' ' + w : w; if (g.measureText(c).width > maxW && b) { out.push(b); b = w } else b = c } if (b) out.push(b); return out }
const muat = (g, t, maxW, px, s, bold) => { let p = px; do { g.font = `${bold ? 700 : 500} ${Math.round(p * s)}px Arial, sans-serif`; p -= 2 } while (g.measureText(t).width > maxW && p > 24); return g.measureText(t).width }
// Gambar watermark: logo, jam, tanggal, alamat, koperasi, nama, kode foto, peta mini
export function gambarWM(g, w, h, d) {
  const s = w / 1080, pad = 30 * s, kiri = w - 2 * pad - 350 * s
  g.save(); g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 6 * s; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'
  g.font = `600 ${Math.round(34 * s)}px Arial, sans-serif`; g.fillText(`Kode Foto: ${d.kode}`, pad, h - 30 * s)
  const bB = h - 70 * s, bT = bB - 240 * s
  g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.roundRect?.(pad - 10 * s, bT, kiri + 10 * s, 240 * s, 16 * s); if (!g.roundRect) g.rect(pad - 10 * s, bT, kiri + 10 * s, 240 * s); g.fill()
  g.shadowBlur = 6 * s; g.fillStyle = '#fff'
  muat(g, `Absensi: ${d.koperasi}`, kiri - 20 * s, 46, s); g.fillText(`Absensi: ${d.koperasi}`, pad, bT + 70 * s)
  muat(g, `Nama: ${d.nama}`, kiri - 20 * s, 46, s); g.fillText(`Nama: ${d.nama}`, pad, bT + 140 * s)
  muat(g, `Kegiatan: ${d.kegiatan}`, kiri - 20 * s, 46, s); g.fillText(`Kegiatan: ${d.kegiatan}`, pad, bT + 210 * s)
  g.font = `500 ${Math.round(40 * s)}px Arial, sans-serif`; const baris = bungkus(g, d.alamat || '', kiri).slice(0, 3), a0 = bT - 24 * s - (baris.length - 1) * 48 * s
  baris.forEach((l, i) => g.fillText(l, pad, a0 + i * 48 * s))
  const tB = a0 - 54 * s; g.font = `700 ${Math.round(150 * s)}px Arial, sans-serif`; g.fillText(d.jam, pad, tB); const tw = g.measureText(d.jam).width
  g.fillStyle = '#f5b800'; g.fillRect(pad + tw + 20 * s, tB - 112 * s, 6 * s, 112 * s); g.fillStyle = '#fff'
  g.font = `600 ${Math.round(50 * s)}px Arial, sans-serif`; g.fillText(d.tanggal, pad + tw + 44 * s, tB - 62 * s); g.fillText(d.hari, pad + tw + 44 * s, tB - 6 * s)
  if (d.logo) { const L = 100 * s, ly = tB - 112 * s - 20 * s - L; g.shadowBlur = 0; g.fillStyle = '#fff'; g.fillRect(pad, ly, L, L); g.drawImage(d.logo, pad + 4 * s, ly + 4 * s, L - 8 * s, L - 8 * s) }
  if (d.peta) { const P = 330 * s, px = w - pad - P, py = h - pad - P; g.shadowBlur = 0; g.fillStyle = '#fff'; g.fillRect(px, py, P, P); g.drawImage(d.peta, px + 8 * s, py + 8 * s, P - 16 * s, P - 16 * s) }
  g.restore()
}
export const fmtJam = (d = new Date()) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
export const fmtTanggal = (d = new Date()) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
export const fmtHari = (d = new Date()) => d.toLocaleDateString('id-ID', { weekday: 'long' })
// Jenis absensi
export const AKSI = {
  masuk: { label: 'Absen Masuk', ikon: '🟢', pendek: 'Masuk' },
  nasabah_baru: { label: 'Nasabah Baru', ikon: '🧑‍🤝‍🧑', pendek: 'Nasabah baru', tanya: 'Nama nasabah baru' },
  pinjaman_baru: { label: 'Peminjam Baru', ikon: '💰', pendek: 'Peminjam baru', tanya: 'Nama peminjam baru' },
  istirahat: { label: 'Istirahat', ikon: '☕', pendek: 'Istirahat' },
  selesai_istirahat: { label: 'Selesai Istirahat', ikon: '▶️', pendek: 'Selesai istirahat' },
  pulang: { label: 'Absen Pulang', ikon: '🔴', pendek: 'Pulang' },
}
