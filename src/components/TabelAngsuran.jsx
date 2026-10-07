import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useConfirm } from '../lib/confirm'
import { rp, digits } from '../lib/utils'
const TENOR = { hari: [20, 24, 30, 45], minggu: [3, 4, 5] }, POKOK = { hari: [250000, 500000, 700000, 1000000], minggu: [500000, 750000, 1000000, 1500000, 2000000] }, LABEL = { hari: 'Harian', minggu: 'Mingguan' }
const uniq = (a) => [...new Set(a)].sort((x, y) => x - y)
export default function TabelAngsuran() {
  const { profile } = useAuth(), toast = useToast(), ask = useConfirm(), kid = profile.koperasi_id
  const [rows, setRows] = useState([]), [jenis, setJenis] = useState('hari'), [rate, setRate] = useState({ hari: '25', minggu: '24' }), [xp, setXp] = useState([]), [np, setNp] = useState('')
  const load = async () => { const { data } = await supabase.from('tabel_angsuran').select('*').eq('koperasi_id', kid); setRows(data || []) }
  useEffect(() => { load() }, [])
  const T = TENOR[jenis], R = rows.filter(r => r.jenis === jenis && T.includes(r.tenor))
  const pokoks = uniq([...R.map(r => +r.pokok), ...xp]), tenors = T
  const cell = (p, t) => R.find(r => +r.pokok === p && r.tenor === t)
  const save = async (p, t, v) => {
    const n = +digits(v, 9), c = cell(p, t); if ((c?.cicilan || 0) === n) return
    const { error } = n ? await supabase.from('tabel_angsuran').upsert({ koperasi_id: kid, jenis, pokok: p, tenor: t, cicilan: n }, { onConflict: 'koperasi_id,jenis,pokok,tenor' }) : c ? await supabase.from('tabel_angsuran').delete().eq('id', c.id) : {}
    error ? toast.error('Gagal menyimpan', error.message) : toast.success('Tarif tersimpan'); load()
  }
  const hitung = async () => {
    const pk = pokoks.length ? pokoks : POKOK[jenis], r = (+rate[jenis] || 0) / 100
    if (!await ask({ title: `Hitung ulang tabel ${LABEL[jenis]}?`, text: `Semua tarif ${LABEL[jenis].toLowerCase()} diganti: pokok × (1 + ${rate[jenis]}%) ÷ tenor, dibulatkan ke Rp500. Ubahan manual hilang.`, ok: 'Hitung' })) return
    await supabase.from('tabel_angsuran').delete().eq('koperasi_id', kid).eq('jenis', jenis)
    const { error } = await supabase.from('tabel_angsuran').insert(pk.flatMap(p => tenors.map(t => ({ koperasi_id: kid, jenis, pokok: p, tenor: t, cicilan: Math.round(p * (1 + r) / t / 500) * 500 }))))
    error ? toast.error('Gagal', error.message) : toast.success('Tabel dihitung ulang'); setXp([]); load()
  }
  const bad = R.filter(r => r.cicilan * r.tenor < r.pokok).length
  return <div className="card space-y-3"><div className="flex items-center justify-between gap-2"><h2 className="font-bold">Tabel angsuran</h2>
    <button className="btn2" onClick={async () => { const { error } = await supabase.rpc('isi_tabel_angsuran', { p_kop: kid }); error ? toast.error('Gagal', error.message) : toast.success('Tabel standar dimuat'); load() }}>Muat standar</button></div>
    <div className="flex rounded-2xl bg-slate-100 p-1 w-fit">{['hari', 'minggu'].map(s => <button key={s} onClick={() => setJenis(s)} className={`px-4 py-1.5 rounded-xl text-sm font-bold ${jenis === s ? 'bg-white shadow text-brand-dark' : 'text-slate-500'}`}>{LABEL[s]}</button>)}</div>
    <p className="text-xs text-slate-500">Tenor {LABEL[jenis].toLowerCase()}: {T.join(' / ')} {jenis}. Tenor lain tidak dipakai.</p>
    <div className="flex gap-2 items-end"><div className="flex-1"><label className="lbl">Bunga total (%)</label><input type="number" className="inp" value={rate[jenis]} onChange={e => setRate({ ...rate, [jenis]: e.target.value })} /></div><button className="btn" onClick={hitung}>⚡ Hitung ulang</button></div>
    {bad > 0 && <p className="text-xs text-red-600">⚠ {bad} tarif bertanda merah: total bayar lebih kecil dari pokok.</p>}
    <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-2xl border border-slate-100"><table className="text-xs w-full"><thead className="sticky top-0 bg-white z-10"><tr><th className="p-2 text-left">Tenor ({jenis})</th>{pokoks.map(p => <th key={p} className="p-2 whitespace-nowrap">{rp(p)}</th>)}</tr></thead>
      <tbody>{tenors.map(t => <tr key={t} className="border-t"><td className="p-2 font-bold">{t}</td>{pokoks.map(p => { const c = cell(p, t), merah = c && c.cicilan * t < p
        return <td key={p} className="p-1"><input inputMode="numeric" key={`${p}-${t}-${c?.cicilan || 0}`} defaultValue={c?.cicilan || ''} onBlur={e => save(p, t, e.target.value)} className={`w-24 rounded-lg border px-2 py-1.5 ${merah ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} /></td> })}</tr>)}</tbody></table></div>
    <div className="flex gap-2"><input className="inp" inputMode="numeric" placeholder="Tambah pilihan pinjaman (Rp)" value={np} onChange={e => setNp(digits(e.target.value, 9))} /><button className="btn2" onClick={() => { np && setXp([...xp, +np]); setNp('') }}>+ Pokok</button></div></div>
}
