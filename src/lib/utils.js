export const rp = (n) => 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID')
export const tgl = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
// Bunga dalam Rupiah per periode (hari/bulan): cicilan = (pokok + bunga*tenor) / tenor
export const simulasi = (pokok, bungaRp, tenor) => { const total = pokok + bungaRp * tenor; return { cicilan: Math.ceil(total / Math.max(tenor, 1)), total } }
export const waLink = (hp, teks) => `https://wa.me/${String(hp).replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(teks)}`
export const pesanTagih = (nama, jumlah, tanggal) => `Halo ${nama}, tagihan pinjaman Anda sebesar ${rp(jumlah)} jatuh tempo pada ${tgl(tanggal)}. Mohon segera melakukan pembayaran. Terima kasih.`
export const emailOrHp = (v) => v.includes('@') ? { email: v } : { email: `${v.replace(/\D/g, '')}@hp.koperasi.app` }
export const digits = (v, max = 30) => String(v).replace(/\D/g, '').slice(0, max)
export const letters = (v) => String(v).replace(/[^\p{L}\s.'-]/gu, '')
// Perkecil foto sebelum diunggah (foto HP 4-8 MB -> ~200 KB) supaya pendaftaran cepat
export const compress = (file, max = 1280) => new Promise((res) => {
  if (!file.type.startsWith('image/')) return res(file)
  const img = new Image(), url = URL.createObjectURL(file)
  img.onerror = () => res(file)
  img.onload = () => {
    const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas')
    c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    c.toBlob(b => res(b ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.72); URL.revokeObjectURL(url)
  }
  img.src = url
})
