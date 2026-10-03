export const rp = (n) => 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID')
export const tgl = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
// Simulasi angsuran: bunga flat per bulan
export const simulasi = (pokok, bungaPersen, tenor) => {
  const total = pokok + pokok * (bungaPersen / 100) * tenor
  return { cicilan: Math.ceil(total / tenor), total }
}
export const waLink = (hp, teks) => `https://wa.me/${String(hp).replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(teks)}`
export const pesanTagih = (nama, jumlah, tanggal) => `Halo ${nama}, tagihan pinjaman Anda sebesar ${rp(jumlah)} jatuh tempo pada ${tgl(tanggal)}. Mohon segera melakukan pembayaran. Terima kasih.`
export const emailOrHp = (v) => v.includes('@') ? { email: v } : { email: `${v.replace(/\D/g, '')}@hp.koperasi.app` }
