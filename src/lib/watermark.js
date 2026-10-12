// Watermark absensi: jam, tanggal, alamat, nama koperasi, nama, kode foto, dan peta mini (citra © Esri / OpenStreetMap)
const ESRI = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
const OSM = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
export const muatGambar = (src) => new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src })
export const kodeFoto = (n = 14) => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(n)); return Array.from(r, x => a[x % a.length]).join('') }
const tileXY = (lat, lng, z) => { const n = 2 ** z, r = lat * Math.PI / 180; return [(lng + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n] }
export async function petaMini(lat, lng, S = 420, z = 18) {
  const [fx, fy] = tileXY(lat, lng, z), tx = Math.floor(fx), ty = Math.floor(fy), k = S / (256 * 1.5)
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = '#1f2a44'; g.fillRect(0, 0, S, S)
  const co = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) co.push([tx + dx, ty + dy])
  let ada = 0
  for (const src of [ESRI, OSM]) {
    const im = await Promise.all(co.map(([x, y]) => muatGambar(src(z, x, y))))
    im.forEach((g2, i) => { if (!g2) return; ada++; g.drawImage(g2, S / 2 + (co[i][0] - fx) * 256 * k, S / 2 + (co[i][1] - fy) * 256 * k, 256 * k + 1, 256 * k + 1) })
    if (ada) break
  }
  if (!ada) { g.fillStyle = '#fff'; g.font = `${S / 16}px Arial`; g.textAlign = 'center'; g.fillText('Peta tidak tersedia', S / 2, S / 2) }
  const px = S / 2, py = S / 2, h = S / 14
  g.fillStyle = '#1E88E5'; g.strokeStyle = '#fff'; g.lineWidth = S / 40
  g.beginPath(); g.arc(px, py - h, S / 22, 0, 7); g.fill(); g.stroke()
  g.beginPath(); g.moveTo(px - S / 30, py - h + S / 30); g.lineTo(px, py); g.lineTo(px + S / 30, py - h + S / 30); g.fill()
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py - h, S / 60, 0, 7); g.fill()
  return c
}
export async function alamatDari(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`), j = await r.json(), a = j.address || {}
    const bagian = [a.road, a.village || a.suburb || a.neighbourhood, a.city_district || a.county, a.city || a.town || a.regency, a.state].filter(Boolean)
    return bagian.join(', ') || j.display_name || null
  } catch { return null }
}
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
const bungkus = (c, teks, lebar) => { const kata = String(teks).split(' '), baris = []; let b = ''; for (const k of kata) { const t = b ? b + ' ' + k : k; if (c.measureText(t).width > lebar && b) { baris.push(b); b = k } else b = t } if (b) baris.push(b); return baris }
export function gambarWatermark(ctx, W, H, d) {
  const s = W / 1080, B = (y) => H - (1435 - y) * s, t = d.waktu || new Date()
  const jam = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
  const tgl = t.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), hari = t.toLocaleDateString('id-ID', { weekday: 'long' })
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  const g = ctx.createLinearGradient(0, H * .5, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = g; ctx.fillRect(0, H * .5, W, H * .5)
  ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 8 * s; ctx.fillStyle = '#fff'
  if (d.logo) { const lh = 170 * s, lw = Math.min(230 * s, d.logo.width / d.logo.height * lh); ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, 26 * s, B(612), lw + 20 * s, lh + 20 * s, 22 * s); ctx.fill(); ctx.drawImage(d.logo, 36 * s, B(622), lw, lh); ctx.fillStyle = '#fff' }
  ctx.font = `600 ${130 * s}px "Arial Narrow","Roboto Condensed",Arial,sans-serif`; ctx.fillText(jam, 28 * s, B(972))
  const x2 = 28 * s + ctx.measureText(jam).width + 24 * s
  ctx.fillStyle = '#F5B301'; ctx.fillRect(x2, B(868), 5 * s, 108 * s)
  ctx.fillStyle = '#fff'; ctx.font = `500 ${42 * s}px Arial,sans-serif`; ctx.fillText(tgl, x2 + 28 * s, B(905)); ctx.fillText(hari, x2 + 28 * s, B(975))
  ctx.font = `500 ${38 * s}px Arial,sans-serif`; bungkus(ctx, d.alamat || 'Mencari lokasi…', 660 * s).slice(0, 3).forEach((b, i) => ctx.fillText(b, 30 * s, B(1040) + i * 50 * s))
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.32)'; rr(ctx, 22 * s, B(1178), 640 * s, 158 * s, 18 * s); ctx.fill()
  ctx.shadowBlur = 6 * s; ctx.fillStyle = '#fff'; ctx.font = `500 ${38 * s}px Arial,sans-serif`
  const potong = (x) => { let v = x; while (ctx.measureText(v).width > 600 * s && v.length > 4) v = v.slice(0, -2); return v === x ? v : v + '…' }
  ctx.fillText(potong('Absensi: ' + (d.koperasi || '')), 40 * s, B(1238)); ctx.fillText(potong('Nama: ' + (d.nama || '')), 40 * s, B(1305))
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(22 * s, B(1352), 640 * s, 2 * s)
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(28 * s, B(1375)); ctx.lineTo(48 * s, B(1366)); ctx.lineTo(68 * s, B(1375)); ctx.lineTo(68 * s, B(1392)); ctx.lineTo(48 * s, B(1408)); ctx.lineTo(28 * s, B(1392)); ctx.closePath(); ctx.fill()
  ctx.shadowBlur = 6 * s; ctx.fillStyle = '#fff'; ctx.font = `600 ${34 * s}px Arial,sans-serif`; ctx.fillText('Kode Foto: ' + (d.kode || ''), 82 * s, B(1402))
  const mx = 740 * s, my = B(1090), ms = 308 * s
  ctx.shadowBlur = 10 * s; ctx.fillStyle = '#fff'; rr(ctx, mx - 6 * s, my - 6 * s, ms + 12 * s, ms + 12 * s, 14 * s); ctx.fill(); ctx.shadowBlur = 0
  ctx.save(); rr(ctx, mx, my, ms, ms, 10 * s); ctx.clip()
  if (d.peta) ctx.drawImage(d.peta, mx, my, ms, ms); else { ctx.fillStyle = '#1f2a44'; ctx.fillRect(mx, my, ms, ms) }
  ctx.font = `${15 * s}px Arial,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText('Imagery © Esri, OSM', mx + 8 * s, my + ms - 8 * s); ctx.restore()
  ctx.restore()
}
