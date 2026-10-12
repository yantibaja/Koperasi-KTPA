// Pembantu absensi: kode foto, peta, alamat, dan watermark di atas foto kamera
const TZ = 'Asia/Makassar'
export const jamWITA = (d) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
export const tglWITA = (d) => d.toLocaleDateString('id-ID', { timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric' })
export const hariWITA = (d) => d.toLocaleDateString('id-ID', { timeZone: TZ, weekday: 'long' })
export const tanggalISO = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ })
export const buatKode = () => Array.from(crypto.getRandomValues(new Uint8Array(14)), b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36]).join('')
export const muatGambar = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src })

// Peta dirangkai dari ubin OpenStreetMap di sekitar titik lokasi
export async function muatPeta(lat, lng, ukuran = 360, z = 17) {
  const n = 2 ** z, s = Math.sin(lat * Math.PI / 180), cx = (lng + 180) / 360 * n * 256, cy = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n * 256
  const c = document.createElement('canvas'); c.width = c.height = ukuran; const g = c.getContext('2d'); g.fillStyle = '#d9dde3'; g.fillRect(0, 0, ukuran, ukuran)
  const ox = cx - ukuran / 2, oy = cy - ukuran / 2, jobs = []
  for (let tx = Math.floor(ox / 256); tx <= Math.floor((cx + ukuran / 2) / 256); tx++) for (let ty = Math.floor(oy / 256); ty <= Math.floor((cy + ukuran / 2) / 256); ty++)
    jobs.push(muatGambar(`https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png`).then(im => g.drawImage(im, tx * 256 - ox, ty * 256 - oy)).catch(() => {}))
  await Promise.all(jobs); return c
}
export async function alamatDari(lat, lng) {
  const koor = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=id&lat=${lat}&lon=${lng}`), j = await r.json(), a = j.address || {}
    const kec = a.city_district || a.subdistrict, bag = [a.road, a.village || a.suburb || a.neighbourhood, kec && `Kec. ${kec}`, a.city || a.town || a.county, a.state].filter(Boolean)
    return bag.length ? bag.join(', ') : (j.display_name || koor)
  } catch { return koor }
}

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath() }
function bungkus(g, teks, lebar, maks = 3) {
  const baris = []; let cur = ''
  for (const k of teks.split(' ')) { const t = cur ? cur + ' ' + k : k; if (g.measureText(t).width > lebar && cur) { baris.push(cur); cur = k } else cur = t }
  if (cur) baris.push(cur)
  if (baris.length > maks) { baris.length = maks; baris[maks - 1] = baris[maks - 1].replace(/.{0,3}$/, '…') }
  return baris
}
// d: { waktu, alamat, koperasi, nama, kode, jenis, logo, peta }
export function gambarWM(g, W, H, d) {
  const u = Math.min(W, H * 0.75) / 1080, F = (px, w = 600) => `${w} ${px * u}px "Plus Jakarta Sans", system-ui, sans-serif`
  g.save(); g.textBaseline = 'alphabetic'; g.textAlign = 'left'
  // Logo koperasi
  if (d.logo) {
    const k = Math.min(190 * u / d.logo.naturalWidth, 190 * u / d.logo.naturalHeight), lw = d.logo.naturalWidth * k, lh = d.logo.naturalHeight * k, lx = 34 * u, ly = H - 830 * u
    g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, lx - 10 * u, ly - 10 * u, lw + 20 * u, lh + 20 * u, 22 * u); g.fill(); g.drawImage(d.logo, lx, ly, lw, lh)
  }
  g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 7 * u
  // Jam besar, garis oranye, tanggal & hari
  g.fillStyle = '#fff'; g.font = F(150, 700); g.fillText(jamWITA(d.waktu), 22 * u, H - 470 * u)
  const tw = g.measureText(jamWITA(d.waktu)).width, bx = 22 * u + tw + 24 * u
  g.fillStyle = '#F59E0B'; g.fillRect(bx, H - 585 * u, 6 * u, 118 * u)
  g.fillStyle = '#fff'; g.font = F(46, 600); g.fillText(tglWITA(d.waktu), bx + 24 * u, H - 535 * u)
  g.font = F(46, 600); g.fillText(`${hariWITA(d.waktu)} · ${d.jenis === 'pulang' ? 'PULANG' : 'MASUK'}`, bx + 24 * u, H - 478 * u)
  // Alamat (maksimal 3 baris)
  g.font = F(40, 500); const baris = bungkus(g, d.alamat || '', W - 44 * u - 380 * u, 3)
  baris.forEach((b, i) => g.fillText(b, 22 * u, H - 295 * u - (baris.length - 1 - i) * 50 * u))
  // Kotak absensi & nama
  g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,.38)'; rr(g, 22 * u, H - 265 * u, 600 * u, 160 * u, 18 * u); g.fill()
  g.shadowBlur = 5 * u; g.fillStyle = '#fff'; g.font = F(38, 500); g.fillText(`Absensi: ${d.koperasi}`, 44 * u, H - 200 * u, 560 * u); g.fillText(`Nama: ${d.nama}`, 44 * u, H - 135 * u, 560 * u)
  // Kode foto
  g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(22 * u, H - 92 * u); g.lineTo(500 * u, H - 92 * u); g.stroke()
  const sx = 24 * u, sy = H - 78 * u, s = 32 * u
  g.beginPath(); g.moveTo(sx + s / 2, sy); g.lineTo(sx + s, sy + s * .2); g.lineTo(sx + s, sy + s * .55); g.quadraticCurveTo(sx + s, sy + s * .95, sx + s / 2, sy + s * 1.1); g.quadraticCurveTo(sx, sy + s * .95, sx, sy + s * .55); g.lineTo(sx, sy + s * .2); g.closePath()
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3 * u; g.stroke()
  g.shadowBlur = 5 * u; g.fillStyle = 'rgba(255,255,255,.92)'; g.font = F(32, 600); g.fillText(`Kode Foto: ${d.kode}`, 72 * u, H - 48 * u)
  // Peta mini
  const m = 310 * u, mx = W - 32 * u - m, my = H - 42 * u - m
  g.shadowBlur = 10 * u; g.fillStyle = '#fff'; rr(g, mx, my, m, m, 16 * u); g.fill(); g.shadowBlur = 0
  g.save(); rr(g, mx + 6 * u, my + 6 * u, m - 12 * u, m - 12 * u, 11 * u); g.clip()
  if (d.peta) g.drawImage(d.peta, mx + 6 * u, my + 6 * u, m - 12 * u, m - 12 * u); else { g.fillStyle = '#d9dde3'; g.fillRect(mx, my, m, m); g.fillStyle = '#6b7280'; g.font = F(26, 600); g.textAlign = 'center'; g.fillText('Memuat peta…', mx + m / 2, my + m / 2) }
  g.restore(); g.textAlign = 'left'
  const px = mx + m / 2, py = my + m / 2 - 20 * u
  g.fillStyle = '#2563EB'; g.beginPath(); g.arc(px, py, 20 * u, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(px - 13 * u, py + 12 * u); g.lineTo(px + 13 * u, py + 12 * u); g.lineTo(px, py + 42 * u); g.closePath(); g.fill()
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 8 * u, 0, Math.PI * 2); g.fill()
  g.fillStyle = 'rgba(0,0,0,.55)'; g.font = F(15, 500); g.fillText('© OpenStreetMap', mx + 12 * u, my + m - 12 * u)
  g.restore()
}
