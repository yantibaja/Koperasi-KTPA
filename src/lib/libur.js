import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
// Aturan libur: hari Minggu selalu libur, ditambah tanggal merah koperasi. Tidak ada jatuh tempo dan transaksi pada hari libur.
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const tambahHari = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const valid = (d, merah) => d.getDay() !== 0 && !merah.has(ymd(d))
export const berikutValid = (d, merah) => { let x = d, n = 0; while (!valid(x, merah) && n++ < 400) x = tambahHari(x, 1); return x }
export async function ambilMerah(kid) { const { data } = await supabase.from('tanggal_merah').select('tanggal').eq('koperasi_id', kid); return new Set((data || []).map(x => x.tanggal)) }
// Jadwal jatuh tempo: harian = hari kerja berurutan; mingguan/bulanan = tanggal asli yang digeser ke hari kerja berikutnya
export function jadwal(n, satuan, merah, mulai = new Date()) {
  const base = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate()), out = []
  if (satuan === 'hari') { let d = berikutValid(tambahHari(base, 1), merah); for (let i = 0; i < n; i++) { out.push(ymd(d)); d = berikutValid(tambahHari(d, 1), merah) } }
  else if (satuan === 'minggu') for (let i = 0; i < n; i++) out.push(ymd(berikutValid(tambahHari(base, 7 * (i + 1)), merah)))
  else for (let i = 0; i < n; i++) { const t = new Date(base.getFullYear(), base.getMonth() + i + 1, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(base.getDate(), last)); out.push(ymd(berikutValid(t, merah))) }
  return out
}
// Alasan libur hari ini ('Minggu' atau keterangan tanggal merah), atau null
export function useLibur() {
  const { profile } = useAuth(), [libur, setLibur] = useState(null)
  useEffect(() => {
    if (!profile || profile.role === 'super_admin') return setLibur(null)
    const h = new Date(); if (h.getDay() === 0) return setLibur('Minggu')
    supabase.from('tanggal_merah').select('keterangan').eq('tanggal', ymd(h)).eq('koperasi_id', profile.koperasi_id).limit(1).then(({ data }) => setLibur(data?.[0] ? (data[0].keterangan || 'tanggal merah') : null))
  }, [profile?.id])
  return libur
}
